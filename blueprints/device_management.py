# blueprints/device_management.py

from flask import Blueprint, render_template, request, jsonify
import sqlite3
import os
import json
from datetime import datetime

device_management_bp = Blueprint('device_management', __name__, template_folder='templates')

# Constants
DATABASE = 'app.db'
JSON_STORAGE_FOLDER = 'json_exports'

# Ensure the folder for storing JSON exists
if not os.path.exists(JSON_STORAGE_FOLDER):
    os.makedirs(JSON_STORAGE_FOLDER)

@device_management_bp.route('/')
def index():
    return render_template('frontend/device_management.html.jinja2', active_page='device_management')

def save_json_file(json_data, project_name):
    """Save network configuration to a JSON file with timestamp."""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{project_name}_{timestamp}.json"
    file_path = os.path.join(JSON_STORAGE_FOLDER, filename)
    
    with open(file_path, 'w') as json_file:
        json.dump(json_data, json_file, indent=4)
    
    return filename

@device_management_bp.route('/save_network', methods=['POST'])
def save_network():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        project_name = data.get('project_name', 'Default Project')
        
        # Save JSON file
        filename = save_json_file(data, project_name)

        # Save to database
        project_id = save_to_db(data, project_name)

        return jsonify({
            'message': 'Network saved successfully!',
            'project_id': project_id,
            'filename': filename
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def save_to_db(json_data, project_name):
    """Save network configuration to database with enhanced data structure."""
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        
        # Insert or update project
        cursor.execute('''
            INSERT OR REPLACE INTO projects (name, last_modified)
            VALUES (?, datetime('now'))
            RETURNING id
        ''', (project_name,))
        
        project_id = cursor.fetchone()[0]

        # Clear existing data for this project
        cursor.execute('DELETE FROM devices WHERE project_id = ?', (project_id,))
        cursor.execute('DELETE FROM connections WHERE project_id = ?', (project_id,))

        # Save devices with enhanced data
        for device in json_data.get('devices', []):
            cursor.execute('''
                INSERT INTO devices (
                    project_id, id, name, type, x, y,
                    metrics, subnet, services, layer_config
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                project_id,
                device.get('id'),
                device['name'],
                device['type'],
                device['x'],
                device['y'],
                json.dumps(device.get('metrics', {})),
                device.get('subnet', ''),
                json.dumps(device.get('services', [])),
                json.dumps(device.get('layer', {
                    'physical': True,
                    'logical': True,
                    'application': device['type'] in ['server', 'client']
                }))
            ))

        # Save connections with enhanced data
        for connection in json_data.get('connections', []):
            cursor.execute('''
                INSERT INTO connections (
                    project_id, id, start_device, end_device,
                    start_port_id, end_port_id,
                    type, bandwidth, layer_config
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                project_id,
                connection.get('id'),
                connection['startDeviceId'],
                connection['endDeviceId'],
                connection.get('startPortId'),
                connection.get('endPortId'),
                connection['type'],
                connection['bandwidth'],
                json.dumps(connection.get('layer', {
                    'physical': True,
                    'logical': connection['type'] in ['ethernet', 'fiber'],
                    'application': connection['type'] in ['tcp', 'udp']
                }))
            ))

        conn.commit()
        return project_id

@device_management_bp.route('/load_network/<int:project_id>', methods=['GET'])
def load_network(project_id):
    """Load network configuration from database."""
    try:
        with sqlite3.connect(DATABASE) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Get project info
            cursor.execute('SELECT * FROM projects WHERE id = ?', (project_id,))
            project = cursor.fetchone()
            if not project:
                return jsonify({'error': 'Project not found'}), 404

            # Get devices
            cursor.execute('SELECT * FROM devices WHERE project_id = ?', (project_id,))
            devices = []
            for device in cursor.fetchall():
                devices.append({
                    'id': device['id'],
                    'name': device['name'],
                    'type': device['type'],
                    'x': device['x'],
                    'y': device['y'],
                    'metrics': json.loads(device['metrics']),
                    'subnet': device['subnet'],
                    'services': json.loads(device['services']),
                    'layer': json.loads(device['layer_config'])
                })

            # Get connections
            cursor.execute('SELECT * FROM connections WHERE project_id = ?', (project_id,))
            connections = []
            for conn in cursor.fetchall():
                connections.append({
                    'id': conn['id'],
                    'startDeviceId': conn['start_device'],
                    'endDeviceId': conn['end_device'],
                    'startPortId': conn['start_port_id'],
                    'endPortId': conn['end_port_id'],
                    'type': conn['type'],
                    'bandwidth': conn['bandwidth'],
                    'layer': json.loads(conn['layer_config'])
                })

            return jsonify({
                'project': dict(project),
                'devices': devices,
                'connections': connections
            }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@device_management_bp.route('/projects', methods=['GET'])
def get_projects():
    """Get list of all projects."""
    try:
        with sqlite3.connect(DATABASE) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM projects ORDER BY last_modified DESC')
            projects = [dict(row) for row in cursor.fetchall()]
            return jsonify(projects), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500