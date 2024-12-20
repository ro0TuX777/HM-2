# dm_connections.py

from flask import Blueprint, jsonify, request
from database import get_db_connection  # Updated import to match database.py

# Blueprint for managing connections
dm_connections_bp = Blueprint('dm_connections', __name__)

# Route to get all connections
@dm_connections_bp.route('/connections', methods=['GET'])
def get_connections():
    with get_db_connection() as db:
        cursor = db.execute('SELECT * FROM connections')
        connections = cursor.fetchall()
        connections_list = [dict(connection) for connection in connections]
    return jsonify(connections_list)

# Route to add a new connection
@dm_connections_bp.route('/connections', methods=['POST'])
def add_connection():
    data = request.get_json()
    source_device = data.get('source_device_id')
    target_device = data.get('target_device_id')
    type_ = data.get('type')
    bandwidth = data.get('bandwidth')

    if not all([source_device, target_device, type_]):
        return jsonify({'error': 'Missing required fields'}), 400

    with get_db_connection() as db:
        db.execute('''
            INSERT INTO connections (start_device, end_device, type, bandwidth)
            VALUES (?, ?, ?, ?)
        ''', (source_device, target_device, type_, bandwidth))
        db.commit()
    return jsonify({'message': 'Connection added successfully'}), 201

# Route to delete a connection
@dm_connections_bp.route('/connections', methods=['DELETE'])
def delete_connection():
    data = request.get_json()
    source_device = data.get('source_device_id')
    target_device = data.get('target_device_id')

    if not all([source_device, target_device]):
        return jsonify({'error': 'Missing required fields'}), 400

    with get_db_connection() as db:
        db.execute('''
            DELETE FROM connections WHERE start_device = ? AND end_device = ?
        ''', (source_device, target_device))
        db.commit()
    return jsonify({'message': 'Connection deleted successfully'}), 200



# Route to get connections for a specific device
@dm_connections_bp.route('/connections/<device_name>', methods=['GET'])
def get_connections_for_device(device_name):
    with get_db_connection() as db:
        cursor = db.execute('''
            SELECT * FROM connections
            WHERE start_device = ? OR end_device = ?
        ''', (device_name, device_name))
        connections = cursor.fetchall()
        connections_list = [dict(connection) for connection in connections]
    return jsonify(connections_list)
