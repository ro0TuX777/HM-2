# device_management_DBroutes.py

from flask import Blueprint, request, jsonify
import sqlite3
import os

# Define Blueprint
device_management_db_bp = Blueprint('device_management_db', __name__)

# Define database path - relative to the routes directory
ROUTES_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(ROUTES_DIR)
DATABASE_PATH = os.path.join(PROJECT_ROOT, 'app.db')

def query_db(query, args=(), one=False):
    """Execute a database query and return results."""
    with sqlite3.connect(DATABASE_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(query, args)
        rv = cursor.fetchall()
        conn.commit()
        return (rv[0] if rv else None) if one else rv

@device_management_db_bp.route('/get_devices', methods=['GET'])
def get_devices():
    try:
        devices = query_db('''
            SELECT id, name, type, x, y, cpu_usage, memory_usage, disk_usage,
                   vulnerability_score, ip_address, subnet_mask
            FROM devices
        ''')
        return jsonify([{
            'id': device[0],
            'name': device[1],
            'type': device[2],
            'x': device[3],
            'y': device[4],
            'metrics': {
                'cpu_usage': device[5],
                'memory_usage': device[6],
                'disk_usage': device[7],
                'vulnerability_score': device[8]
            },
            'subnet': device[10],
            'layer': {"physical": True, "logical": True, "application": device[2] in ['server', 'client']}
        } for device in devices]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@device_management_db_bp.route('/get_connections', methods=['GET'])
def get_connections():
    try:
        connections = query_db('''
            SELECT id, source_device_id, target_device_id, connection_type,
                   bandwidth, latency, packet_loss
            FROM connections
        ''')
        return jsonify([{
            'id': conn[0],
            'start_device': conn[1],
            'end_device': conn[2],
            'type': conn[3],
            'bandwidth': conn[4],
            'layer': {
                "physical": True,
                "logical": conn[3] in ['ethernet', 'fiber'],
                "application": conn[3] in ['tcp', 'udp']
            }
        } for conn in connections]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@device_management_db_bp.route('/add_device', methods=['POST'])
def add_device():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Validate required fields
        required_fields = ['name', 'type', 'x', 'y']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            
            # Insert device
            cursor.execute('''
                INSERT INTO devices (
                    name, type, x, y, cpu_usage, memory_usage, disk_usage,
                    vulnerability_score, ip_address, subnet_mask
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                str(data['name']),
                str(data['type']),
                float(data['x']),
                float(data['y']),
                0,  # cpu_usage
                0,  # memory_usage
                0,  # disk_usage
                0,  # vulnerability_score
                '192.168.1.1',
                data.get('subnet', '255.255.255.0')
            ))
            
            device_id = cursor.lastrowid
            
            # Insert initial metrics history
            cursor.execute('''
                INSERT INTO device_metrics_history (
                    device_id, cpu_usage, memory_usage, disk_usage,
                    vulnerability_score, network_usage, temperature
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                device_id,
                0.0,  # Initial cpu_usage
                0.0,  # Initial memory_usage
                0.0,  # Initial disk_usage
                0.0,  # Initial vulnerability_score
                0.0,  # Initial network_usage
                40.0  # Initial temperature
            ))
            
            return jsonify({
                'message': 'Device added successfully',
                'device_id': device_id
            }), 201

    except Exception as e:
        print(f"Error adding device: {e}")
        return jsonify({'error': str(e)}), 400

@device_management_db_bp.route('/device_metrics/<string:device_id>', methods=['PUT', 'OPTIONS'])
def update_device_metrics(device_id):
    if request.method == "OPTIONS":
        return jsonify({"message": "OK"}), 200
        
    try:
        data = request.get_json()
        print(f"DEBUG: Received metrics update for device {device_id}:", data)

        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            
            # Update current metrics in devices table
            cursor.execute('''
                UPDATE devices 
                SET cpu_usage = ?,
                    memory_usage = ?,
                    disk_usage = ?,
                    vulnerability_score = ?
                WHERE id = ?
            ''', (
                data.get('cpu', 0),
                data.get('memory', 0),
                data.get('disk', 0),
                data.get('vulnerability', 0),
                device_id
            ))

            # Insert into history table
            cursor.execute('''
                INSERT INTO device_metrics_history (
                    device_id, cpu_usage, memory_usage, disk_usage,
                    vulnerability_score, network_usage, temperature
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                device_id,
                data.get('cpu', 0),
                data.get('memory', 0),
                data.get('disk', 0),
                data.get('vulnerability', 0),
                data.get('network', 0),
                data.get('temperature', 40)
            ))
            
            conn.commit()
            return jsonify({'message': 'Metrics updated successfully'}), 200
            
    except Exception as e:
        print(f"Error updating metrics: {e}")  # Debug log
        return jsonify({'error': str(e)}), 400

# Add this route alongside the other device management routes
@device_management_db_bp.route('/device_metrics/<int:device_id>', methods=['GET'])
def get_device_metrics_history(device_id):
    try:
        metrics = query_db('''
            SELECT 
                device_id,
                timestamp,
                cpu_usage,
                memory_usage,
                disk_usage,
                vulnerability_score,
                network_usage,
                temperature
            FROM device_metrics_history 
            WHERE device_id = ? 
            ORDER BY timestamp DESC 
            LIMIT 100
        ''', (device_id,))
        
        return jsonify([{
            'device_id': m[0],
            'timestamp': m[1],
            'metrics': {
                'cpu_usage': m[2],
                'memory_usage': m[3],
                'disk_usage': m[4],
                'vulnerability_score': m[5],
                'network_usage': m[6],
                'temperature': m[7]
            }
        } for m in metrics]), 200
    except Exception as e:
        print(f"Error fetching metrics history: {e}")  # Debug log
        return jsonify({'error': str(e)}), 500

@device_management_db_bp.route('/remove_device/<int:device_id>', methods=['DELETE'])
def remove_device(device_id):
    try:
        # First delete associated connections
        query_db('''
            DELETE FROM connections 
            WHERE source_device_id = ? OR target_device_id = ?
        ''', (device_id, device_id))
        
        # Then delete the device
        query_db('DELETE FROM devices WHERE id = ?', (device_id,))
        
        return jsonify({'message': 'Device and related connections deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@device_management_db_bp.route('/add_connection', methods=['POST'])
def add_connection():
    data = request.json
    try:
        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO connections (
                    source_device_id, target_device_id, connection_type,
                    bandwidth, latency, packet_loss
                ) VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                data['start_device'],
                data['end_device'],
                data['type'],
                data['bandwidth'],
                0,  # latency
                0   # packet_loss
            ))
            
            connection_id = cursor.lastrowid
            
            return jsonify({
                'message': 'Connection added successfully',
                'connection_id': connection_id
            }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@device_management_db_bp.route('/get_projects', methods=['GET'])
def get_projects():
    try:
        projects = query_db('SELECT id, name, created_at FROM projects ORDER BY created_at DESC')
        return jsonify([{
            'id': project[0],
            'name': project[1],
            'created_at': project[2]
        } for project in projects]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@device_management_db_bp.route('/save_network', methods=['POST'])
def save_network():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        project_name = data.get('project_name', f"Project_{os.urandom(4).hex()}")
        
        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            # Insert project
            cursor.execute('''
                INSERT INTO projects (name, created_at, updated_at)
                VALUES (?, datetime('now'), datetime('now'))
            ''', (project_name,))
            project_id = cursor.lastrowid

            # Save devices
            for device in data.get('devices', []):
                cursor.execute('''
                    INSERT INTO devices (
                        project_id, name, type, x, y,
                        cpu_usage, memory_usage, disk_usage,
                        vulnerability_score, ip_address, subnet_mask
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    project_id,
                    device['name'],
                    device['type'],
                    device['x'],
                    device['y'],
                    0,  # cpu_usage
                    0,  # memory_usage
                    0,  # disk_usage
                    0,  # vulnerability_score
                    '192.168.1.1',  # ip_address
                    device.get('subnet', '255.255.255.0')  # subnet_mask
                ))

            # Save connections
            for conn in data.get('connections', []):
                cursor.execute('''
                    INSERT INTO connections (
                        project_id, source_device_id, target_device_id,
                        connection_type, bandwidth, latency, packet_loss
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    project_id,
                    conn['startDeviceId'],
                    conn['endDeviceId'],
                    conn['type'],
                    conn['bandwidth'],
                    0,  # latency
                    0   # packet_loss
                ))

        return jsonify({
            'message': 'Network saved successfully',
            'project_id': project_id
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@device_management_db_bp.route('/load_network/<int:project_id>', methods=['GET'])
def load_network(project_id):
    try:
        # Get devices for the project
        devices = query_db('''
            SELECT id, name, type, x, y, cpu_usage, memory_usage, disk_usage,
                   vulnerability_score, ip_address, subnet_mask
            FROM devices
            WHERE project_id = ?
        ''', (project_id,))

        # Get connections for the project
        connections = query_db('''
            SELECT id, source_device_id, target_device_id, connection_type,
                   bandwidth, latency, packet_loss
            FROM connections
            WHERE project_id = ?
        ''', (project_id,))

        return jsonify({
            'devices': [{
                'id': d[0],
                'name': d[1],
                'type': d[2],
                'x': d[3],
                'y': d[4],
                'metrics': {
                    'cpu_usage': d[5],
                    'memory_usage': d[6],
                    'disk_usage': d[7],
                    'vulnerability_score': d[8]
                },
                'network': {
                    'ip_address': d[9],
                    'subnet_mask': d[10]
                },
                'layer': {
                    'physical': True,
                    'logical': True,
                    'application': d[2] in ['server', 'client']
                }
            } for d in devices],
            'connections': [{
                'id': c[0],
                'startDeviceId': c[1],
                'endDeviceId': c[2],
                'type': c[3],
                'bandwidth': c[4],
                'metrics': {
                    'latency': c[5],
                    'packet_loss': c[6]
                },
                'layer': {
                    'physical': True,
                    'logical': c[3] in ['ethernet', 'fiber'],
                    'application': c[3] in ['tcp', 'udp']
                }
            } for c in connections]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@device_management_db_bp.route('/remove_connection/<connection_id>', methods=['DELETE', 'OPTIONS'])
def remove_connection(connection_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        query_db('DELETE FROM connections WHERE id = ?', (connection_id,))
        return jsonify({'message': 'Connection deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@device_management_db_bp.route('/update_connection/<int:connection_id>', methods=['PUT'])
def update_connection(connection_id):
    data = request.json
    try:
        query_db('''
            UPDATE connections
            SET source_device_id = ?, target_device_id = ?, connection_type = ?,
                bandwidth = ?, latency = ?, packet_loss = ?
            WHERE id = ?
        ''', (
            data['start_device'],
            data['end_device'],
            data['type'],
            data['bandwidth'],
            data.get('metrics', {}).get('latency', 0),
            data.get('metrics', {}).get('packet_loss', 0),
            connection_id
        ))
        return jsonify({'message': 'Connection updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400
