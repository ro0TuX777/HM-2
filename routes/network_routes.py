from flask import Blueprint, request, jsonify
from models.ema import calculate_ema
from models.sigmoid_modified import sigmoid_modified
from utils.validation import validate_request_data, format_error

network_viz_bp = Blueprint('network_routes', __name__)

@network_viz_bp.route('/connections', methods=['POST'])
def add_connection():
    """
    Route to add a new connection.
    """
    data = request.json
    
    # Validate input data
    if not data or 'source_device_id' not in data or 'target_device_id' not in data:
        return jsonify({'error': 'Invalid input data'}), 400

    # Example logic for adding a connection
    connection = {
        'source_device_id': data['source_device_id'],
        'target_device_id': data['target_device_id'],
        'connection_type': data.get('connection_type', 'default'),
    }
    
    # Replace with database logic as needed
    return jsonify({'message': 'Connection added successfully', 'connection': connection}), 201

@network_viz_bp.route('/network/topology/details', methods=['GET'])
def get_topology_details():
    """
    Route to retrieve detailed network topology information.
    """
    # Example detailed topology data
    detailed_topology_data = {
    'devices': [
        {
            'id': 1,
            'name': 'Device 1',
            'type': 'Router',
            'ip': '192.168.1.1',
            'zscores': {
                'cpu_usage': {'zscore': 1.2, 'status': 'warning'}
            }
        },
        {
            'id': 2,
            'name': 'Device 2',
            'type': 'Switch',
            'ip': '192.168.1.2',
            'zscores': {
                'cpu_usage': {'zscore': 0.5, 'status': 'normal'}
            }
        }
    ],
    'connections': [
        {'source': 1, 'target': 2, 'type': 'ethernet', 'bandwidth': '1Gbps'}
    ]
}
    return jsonify(detailed_topology_data)

@network_viz_bp.route('/adjusted_metrics', methods=['POST'])
def adjusted_metrics():
    """
    Route to calculate adjusted metrics based on input data.
    """
    data = request.json
    required_fields = ['cpu_usage', 'memory_usage', 'risk_level']
    
    # Validate request data
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