from flask import Blueprint, request, jsonify
from models.composite_risk_score import calculate_composite_risk_score
from models.ema import calculate_ema
from models.holt_winters import holt_winters_forecast
from models.logistic_regression import logistic_regression_threshold_adaptation
from models.mutual_information import calculate_mutual_information
from models.pearson_correlation import calculate_pearson_correlation
from models.time_decay import calculate_time_decay
from models.time_decay_multiple import calculate_time_decay_multiple
from models.user_risk_score import calculate_user_risk_score
from models.weighted_score import calculate_weighted_score
from models.wma import calculate_wma
from models.zscore import calculate_zscore
from models.sigmoid_modified import sigmoid_modified
from utils.validation import validate_request_data, format_error
from database import add_device, update_device, get_device

network_routes = Blueprint('network_routes', __name__)

@network_routes.route('/adjusted_metrics', methods=['POST'])
def adjusted_metrics():
    data = request.json
    required_fields = ['cpu_usage', 'memory_usage', 'risk_level']
    is_valid, error_message = validate_request_data(required_fields, data)
    if not is_valid:
        return jsonify(format_error(error_message)), 400

    # Apply EMA to CPU usage
    adjusted_cpu_usage = calculate_ema(data['cpu_usage'], data['cpu_usage'], 0.1)

    # Apply Sigmoid to Memory usage
    adjusted_memory_usage = sigmoid_modified([data['memory_usage']], [1], 10, 0.5)

    # Calculate risk-adjusted metrics
    risk_adjusted_cpu = adjusted_cpu_usage * data['risk_level']
    risk_adjusted_memory = adjusted_memory_usage[0] * data['risk_level']

    return jsonify({
        'adjusted_cpu_usage': risk_adjusted_cpu,
        'adjusted_memory_usage': risk_adjusted_memory
    })

# Existing routes for device management and other functionalities...
