# dm_connections_routes.py

from flask import Blueprint, jsonify, request
from database import get_db

# Blueprint for connection management
dm_connections_bp = Blueprint('dm_connections', __name__)

# Route to get all connections
@dm_connections_bp.route('/connections', methods=['GET'])
def get_connections():
    db = get_db()
    cursor = db.execute('SELECT * FROM connections')
    connections = cursor.fetchall()
    connections_list = [dict(connection) for connection in connections]
    return jsonify(connections_list)

# Route to add a new connection
@dm_connections_bp.route('/connections', methods=['POST'])
def add_connection():
    data = request.get_json()
    start_device = data.get('start_device')
    end_device = data.get('end_device')
    type_ = data.get('type')
    bandwidth = data.get('bandwidth')

    if not start_device or not end_device or not type_:
        return jsonify({'error': 'Missing required fields'}), 400

    db = get_db()
    db.execute('INSERT INTO connections (start_device, end_device, type, bandwidth) VALUES (?, ?, ?, ?)',
               (start_device, end_device, type_, bandwidth))
    db.commit()
    return jsonify({'message': 'Connection added successfully'}), 201

# Route to delete a connection
@dm_connections_bp.route('/connections', methods=['DELETE'])
def delete_connection():
    data = request.get_json()
    start_device = data.get('start_device')
    end_device = data.get('end_device')

    if not start_device or not end_device:
        return jsonify({'error': 'Missing required fields'}), 400

    db = get_db()
    db.execute('DELETE FROM connections WHERE start_device = ? AND end_device = ?', (start_device, end_device))
    db.commit()
    return jsonify({'message': 'Connection deleted successfully'}), 200

# Route to update the connection details
@dm_connections_bp.route('/connections', methods=['PUT'])
def update_connection():
    data = request.get_json()
    start_device = data.get('start_device')
    end_device = data.get('end_device')
    type_ = data.get('type')
    bandwidth = data.get('bandwidth')

    if not start_device or not end_device or not type_ or bandwidth is None:
        return jsonify({'error': 'Missing required fields'}), 400

    db = get_db()
    db.execute('UPDATE connections SET type = ?, bandwidth = ? WHERE start_device = ? AND end_device = ?',
               (type_, bandwidth, start_device, end_device))
    db.commit()
    return jsonify({'message': 'Connection updated successfully'}), 200
