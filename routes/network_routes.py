from flask import Blueprint, request, jsonify
from models.ema import calculate_ema
from models.sigmoid_modified import sigmoid_modified
from utils.validation import validate_request_data, format_error
from database import get_db_connection
from datetime import datetime
import pytz

network_viz_bp = Blueprint('network_routes', __name__)

@network_viz_bp.route('/connections', methods=['POST'])
def add_connection():
    data = request.json
    if not data or 'source_device_id' not in data or 'target_device_id' not in data:
        return jsonify({'error': 'Invalid input data'}), 400

    connection = {
        'source_device_id': data['source_device_id'],
        'target_device_id': data['target_device_id'],
        'connection_type': data.get('connection_type', 'default'),
    }

    return jsonify({'message': 'Connection added successfully', 'connection': connection}), 201

@network_viz_bp.route('/adjusted_metrics', methods=['POST'])
def adjusted_metrics():
    data = request.json
    required_fields = ['cpu_usage', 'memory_usage', 'risk_level']
    is_valid, error_message = validate_request_data(required_fields, data)
    if not is_valid:
        return jsonify(format_error(error_message)), 400

    adjusted_cpu_usage = calculate_ema(data['cpu_usage'], data['cpu_usage'], 0.1)
    adjusted_memory_usage = sigmoid_modified([data['memory_usage']], [1], 10, 0.5)
    risk_adjusted_cpu = adjusted_cpu_usage * data['risk_level']
    risk_adjusted_memory = adjusted_memory_usage[0] * data['risk_level']

    return jsonify({
        'adjusted_cpu_usage': risk_adjusted_cpu,
        'adjusted_memory_usage': risk_adjusted_memory
    })

@network_viz_bp.route('/pins', methods=['GET'])
def get_pins():
    conn = get_db_connection()
    cur = conn.cursor()
    # We assume 'pins' table has 'id' and 'name' columns
    cur.execute('SELECT id, name FROM pins')
    rows = cur.fetchall()
    conn.close()
    
    # Transform rows to a list of dicts
    pins = [{'id': row['id'], 'name': row['name']} for row in rows]
    
    return jsonify(pins), 200


@network_viz_bp.route('/pins', methods=['POST'])
def create_pin():
    data = request.json
    required_fields = ['pin_name', 'latitude', 'longitude', 'network_assoc', 'category', 'subcategory', 'status_classification', 'priority_level', 'timestamp_utc']
    is_valid, error_message = validate_request_data(required_fields, data)
    if not is_valid:
        return jsonify(format_error(error_message)), 400

    pin_name = data['pin_name']
    latitude = data['latitude']
    longitude = data['longitude']
    network_assoc = data['network_assoc']
    category = data['category']
    subcategory = data['subcategory']
    status_classification = data['status_classification']
    priority_level = data['priority_level']
    timestamp_str = data['timestamp_utc']

    try:
        utc_now = datetime.fromisoformat(timestamp_str)
        if utc_now.tzinfo is None:
            utc_now = utc_now.replace(tzinfo=pytz.UTC)
    except ValueError:
        utc_now = datetime.utcnow().replace(tzinfo=pytz.UTC)

    pin_type = f"{category} - {subcategory} - {status_classification} - {priority_level}"

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        INSERT INTO pins (name, latitude, longitude, network_assoc, pin_type, timestamp_utc)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (pin_name, latitude, longitude, network_assoc, pin_type, utc_now.isoformat()))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Pin created successfully'}), 201
