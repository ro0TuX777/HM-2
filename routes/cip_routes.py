from flask import Blueprint, request, jsonify
from models.sigmoid_modified import sigmoid_modified
from models.state_transition_adjusted import state_transition_adjusted
from models.ema import calculate_ema
from models.zscore import calculate_zscore
from utils.validation import validate_request_data, format_error
from database import add_cip_control, update_cip_control, get_cip_control, recalculate_for_all_devices

cip_routes = Blueprint('cip_routes', __name__)

@cip_routes.route('/sigmoid_modified', methods=['POST'])
def sigmoid_modified_route():
    data = request.json
    required_fields = ['cip_values', 'weights']
    is_valid, error_message = validate_request_data(required_fields, data)
    if not is_valid:
        return jsonify(format_error(error_message)), 400

    result = sigmoid_modified(data['cip_values'], data['weights'], data.get('k', 10), data.get('x0', 0.5))
    return jsonify(result=result)

@cip_routes.route('/state_transition_adjusted', methods=['POST'])
def state_transition_adjusted_route():
    data = request.json
    required_fields = ['current_state', 'admin_action', 'external_factors', 'thresholds']
    is_valid, error_message = validate_request_data(required_fields, data)
    if not is_valid:
        return jsonify(format_error(error_message)), 400

    result = state_transition_adjusted(data['current_state'], data['admin_action'], data['external_factors'], data['thresholds'])
    return jsonify(result=result)

@cip_routes.route('/controls', methods=['POST'])
def add_cip_control_route():
    data = request.json
    required_fields = ['control_name', 'settings']
    is_valid, error_message = validate_request_data(required_fields, data)
    if not is_valid:
        return jsonify(format_error(error_message)), 400

    add_cip_control(data['control_name'], data['settings'])
    return jsonify(message="CIP control added successfully"), 201

@cip_routes.route('/controls/<int:control_id>', methods=['PUT'])
def update_cip_control_route(control_id):
    data = request.json
    required_fields = ['control_name', 'settings']
    is_valid, error_message = validate_request_data(required_fields, data)
    if not is_valid:
        return jsonify(format_error(error_message)), 400

    update_cip_control(control_id, data['control_name'], data['settings'])
    recalculate_for_all_devices()  # Trigger recalculation for all devices
    return jsonify(message="CIP control updated successfully and recalculations triggered"), 200

@cip_routes.route('/controls/<int:control_id>', methods=['GET'])
def get_cip_control_route(control_id):
    control = get_cip_control(control_id)
    if control is None:
        return jsonify(format_error("CIP control not found")), 404

    return jsonify(dict(control)), 200

@cip_routes.route('/process_cip_parameters', methods=['POST'])
def process_cip_parameters():
    data = request.json
    required_fields = ['cip_values', 'weights', 'mean', 'std_dev', 'previous_ema']
    is_valid, error_message = validate_request_data(required_fields, data)
    if not is_valid:
        return jsonify(format_error(error_message)), 400

    # Calculate EMA
    ema_results = {key: calculate_ema(value, data['previous_ema'][key]) for key, value in data['cip_values'].items()}

    # Calculate Sigmoid
    sigmoid_result = sigmoid_modified(data['cip_values'], data['weights'])

    # Calculate Z-Score
    zscore_results = {key: calculate_zscore(value, data['mean'][key], data['std_dev'][key]) for key, value in data['cip_values'].items()}

    return jsonify(ema=ema_results, sigmoid=sigmoid_result, zscore=zscore_results)
