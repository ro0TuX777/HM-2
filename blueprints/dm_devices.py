# dm_devices.py

from flask import Blueprint, jsonify, request
from database import get_db

# Blueprint for device management
dm_devices_bp = Blueprint('dm_devices', __name__)

# Route to get all devices
@dm_devices_bp.route('/devices', methods=['GET'])
def get_devices():
    db = get_db()
    cursor = db.execute('SELECT * FROM devices')
    devices = cursor.fetchall()
    devices_list = [dict(device) for device in devices]
    return jsonify(devices_list)

# Route to add a new device
@dm_devices_bp.route('/devices', methods=['POST'])
def add_device():
    data = request.get_json()
    name = data.get('name')
    type_ = data.get('type')
    x = data.get('x')
    y = data.get('y')
    metrics = data.get('metrics')
    subnet = data.get('subnet')

    if not name or not type_ or x is None or y is None:
        return jsonify({'error': 'Missing required fields'}), 400

    db = get_db()
    db.execute('INSERT INTO devices (name, type, x, y, metrics, subnet) VALUES (?, ?, ?, ?, ?, ?)',
               (name, type_, x, y, str(metrics), subnet))
    db.commit()
    return jsonify({'message': 'Device added successfully'}), 201

# Route to update device position
@dm_devices_bp.route('/devices/position', methods=['PUT'])
def update_device_position():
    data = request.get_json()
    name = data.get('name')
    x = data.get('x')
    y = data.get('y')

    if not name or x is None or y is None:
        return jsonify({'error': 'Missing required fields'}), 400

    db = get_db()
    db.execute('UPDATE devices SET x = ?, y = ? WHERE name = ?', (x, y, name))
    db.commit()
    return jsonify({'message': 'Device position updated successfully'}), 200

# Route to delete a device
@dm_devices_bp.route('/devices', methods=['DELETE'])
def delete_device():
    data = request.get_json()
    name = data.get('name')

    if not name:
        return jsonify({'error': 'Missing required fields'}), 400

    db = get_db()
    db.execute('DELETE FROM devices WHERE name = ?', (name,))
    db.commit()
    return jsonify({'message': 'Device deleted successfully'}), 200

# Route to get a specific device by name
@dm_devices_bp.route('/devices/<name>', methods=['GET'])
def get_device(name):
    db = get_db()
    cursor = db.execute('SELECT * FROM devices WHERE name = ?', (name,))
    device = cursor.fetchone()
    if device is None:
        return jsonify({'error': 'Device not found'}), 404

    return jsonify(dict(device))
