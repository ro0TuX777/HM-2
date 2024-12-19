from flask import Blueprint, request, jsonify
from models.ema import calculate_ema
from models.sigmoid_modified import sigmoid_modified
from utils.validation import validate_request_data, format_error
from database import get_db_connection
from datetime import datetime
import pytz
import os

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
    cur.execute('SELECT id, name FROM pins')
    rows = cur.fetchall()
    conn.close()

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
    # Ensure unique pin name
    cur.execute('SELECT COUNT(*) as cnt FROM pins WHERE name = ?', (pin_name,))
    row = cur.fetchone()
    if row and row['cnt'] > 0:
        conn.close()
        return jsonify({'error': 'Pin name already exists. Please choose a different name.'}), 400

    cur.execute('''
        INSERT INTO pins (name, latitude, longitude, network_assoc, pin_type, timestamp_utc)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (pin_name, latitude, longitude, network_assoc, pin_type, utc_now.isoformat()))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Pin created successfully'}), 201

@network_viz_bp.route('/projects', methods=['POST'])
def save_project():
    data = request.json
    # Implement saving logic here, for example:
    # - Validate 'name', 'devices', 'connections' fields
    # - Write them to a JSON file in /json_exports
    
    if 'name' not in data or 'devices' not in data or 'connections' not in data:
        return jsonify({'error': 'Missing required fields'}), 400
    
    project_name = data['name']
    # Construct a filename
    filename = f"{project_name}.json"
    json_dir = os.path.join(os.path.dirname(__file__), '..', 'json_exports')
    filepath = os.path.join(json_dir, filename)

    # Save data to the JSON file
    import json
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=4)

    return jsonify({'message': 'Project saved successfully'}), 201

@network_viz_bp.route('/json_files', methods=['GET'])
def list_json_files():
    json_dir = os.path.join(os.path.dirname(__file__), '..', 'json_exports')
    files = []
    for fname in os.listdir(json_dir):
        if fname.endswith('.json'):
            files.append(fname)
    return jsonify(files), 200

@network_viz_bp.route('/pins/associate_json', methods=['POST'])
def associate_pin_json():
    data = request.json
    required_fields = ['pin_id', 'json_file']
    is_valid, error_msg = validate_request_data(required_fields, data)
    if not is_valid:
        return jsonify(format_error(error_msg)), 400

    pin_id = data['pin_id']
    json_file = data['json_file']

    # Make sure your database table and logic are correct
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('SELECT COUNT(*) as cnt FROM pin_json_associations WHERE pin_id=? AND json_filename=?', (pin_id, json_file))
    row = cur.fetchone()
    if row['cnt'] > 0:
        # Already associated
        conn.close()
        return jsonify({'message': 'Pin already associated with this JSON file'}), 200
    else:
        # Insert new association
        cur.execute('INSERT INTO pin_json_associations (pin_id, json_filename) VALUES (?, ?)', (pin_id, json_file))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Pin associated with JSON file successfully'}), 201

@network_viz_bp.route('/pins/by_json/<json_file>', methods=['GET'])
def get_pin_by_json(json_file):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        SELECT p.id, p.name, p.latitude, p.longitude, p.pin_type
        FROM pins p
        JOIN pin_json_associations pa ON p.id = pa.pin_id
        WHERE pa.json_filename = ?
    ''', (json_file,))
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({'error': 'No pin associated with this JSON file'}), 404

    # Return pin details
    pin_data = {
        'id': row['id'],
        'name': row['name'],
        'latitude': row['latitude'],
        'longitude': row['longitude'],
        'pin_type': row['pin_type']
    }
    return jsonify(pin_data), 200

