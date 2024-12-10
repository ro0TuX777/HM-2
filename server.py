from flask import Flask, send_from_directory, render_template, request, jsonify
import os
import sqlite3
import json

# Import Blueprints
from routes.device_management_DBroutes import device_management_db_bp

app = Flask(__name__,
            static_url_path='',
            static_folder='static',
            template_folder='templates')

# Register Blueprints
app.register_blueprint(device_management_db_bp, url_prefix='/device_management_db')

DATABASE = os.path.join(os.path.dirname(__file__), 'app.db')
EXPORTS_DIR = os.path.join(os.path.dirname(__file__), 'json_exports')

def init_db():
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        # Projects table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Devices table with detailed configuration
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                x INTEGER,
                y INTEGER,
                cpu_usage INTEGER,
                memory_usage INTEGER,
                disk_usage INTEGER,
                vulnerability_score REAL,
                ip_address TEXT,
                subnet_mask TEXT,
                mac_address TEXT,
                gateway TEXT,
                dns_settings TEXT,
                patch_level TEXT,
                security_settings TEXT,
                admin_level TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
        ''')
        
        # Connections table with metrics
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS connections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                source_device_id INTEGER,
                target_device_id INTEGER,
                connection_type TEXT,
                bandwidth TEXT,
                latency REAL,
                packet_loss REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (source_device_id) REFERENCES devices(id) ON DELETE CASCADE,
                FOREIGN KEY (target_device_id) REFERENCES devices(id) ON DELETE CASCADE
            )
        ''')

        # Device Metrics table for real-time metrics
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS device_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER,
                patch_urgency REAL,
                threat_level REAL,
                known_vulnerabilities REAL,
                global_threat_level REAL,
                industry_threat_level REAL,
                user_risk_score REAL,
                threat_intelligence_score REAL,
                vulnerability_severity_score REAL,
                alertness_score REAL,
                honeypot_threat_indicator REAL,
                compliance_risk_score REAL,
                supply_chain_risk_factor REAL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
            )
        ''')
        
        conn.commit()

init_db()

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Main page routes
@app.route('/')
def home():
    return render_template('frontend/index.html.jinja2', active_page='home')

@app.route('/cip_control')
def cip_control():
    return render_template('frontend/cip_control.html.jinja2', active_page='cip_control')

@app.route('/cip_impact')
def cip_impact():
    return render_template('frontend/cip_impact.html.jinja2', active_page='cip_impact')

@app.route('/cip_val')
def cip_val():
    return render_template('frontend/cip_val.html.jinja2', active_page='cip_val')

@app.route('/control_panel')
def control_panel():
    return render_template('frontend/control_panel.html.jinja2', active_page='control_panel')

@app.route('/device_management')
def device_management():
    return render_template('frontend/device_management.html.jinja2', active_page='device_management')

@app.route('/visualization')
def visualization():
    return render_template('frontend/visualization.html.jinja2', active_page='visualization')

@app.route('/help')
def help_page():
    return render_template('frontend/help.html.jinja2', active_page='help')

# Network Visualization API Routes
@app.route('/api/devices', methods=['GET'])
def get_devices():
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, name, type, x, y, cpu_usage, memory_usage, disk_usage,
                   vulnerability_score, ip_address, subnet_mask
            FROM devices
        ''')
        devices = cursor.fetchall()
        return jsonify([{
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
            }
        } for d in devices])

# Save Configuration API Route
@app.route('/api/projects', methods=['POST'])
def save_project():
    data = request.json
    project_name = data.get('name', 'default_project')
    file_path = os.path.join(EXPORTS_DIR, f"{project_name}.json")

    # Save the project data to a JSON file
    with open(file_path, 'w') as json_file:
        json.dump(data, json_file)

    return jsonify({'message': 'Project saved successfully', 'file': file_path})

# Load Configuration API Route
@app.route('/api/projects/load', methods=['GET'])
def load_project():
    project_name = request.args.get('name')
    file_path = os.path.join(EXPORTS_DIR, f"{project_name}.json")

    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404

    with open(file_path, 'r') as json_file:
        data = json.load(json_file)

    return jsonify(data)

@app.route('/api/connections', methods=['GET'])
def get_connections():
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, source_device_id, target_device_id, connection_type,
                   bandwidth, latency, packet_loss
            FROM connections
        ''')
        connections = cursor.fetchall()
        return jsonify([{
            'id': c[0],
            'source_device_id': c[1],
            'target_device_id': c[2],
            'type': c[3],
            'bandwidth': c[4],
            'metrics': {
                'latency': c[5],
                'packet_loss': c[6]
            }
        } for c in connections])

@app.route('/api/connections', methods=['POST'])
def add_connection():
    data = request.json
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO connections (
                source_device_id, target_device_id, connection_type,
                bandwidth, latency, packet_loss
            ) VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data['source_device_id'], data['target_device_id'],
            data['type'], data['bandwidth'],
            data['metrics']['latency'], data['metrics']['packet_loss']
        ))
        connection_id = cursor.lastrowid
        return jsonify({'id': connection_id, 'message': 'Connection added successfully'})

# Control Panel API Routes
@app.route('/api/device_metrics/<int:device_id>', methods=['GET'])
def get_device_metrics(device_id):
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM device_metrics
            WHERE device_id = ?
            ORDER BY timestamp DESC
            LIMIT 1
        ''', (device_id,))
        metrics = cursor.fetchone()
        if metrics:
            return jsonify({
                'patch_urgency': metrics[2],
                'threat_level': metrics[3],
                'known_vulnerabilities': metrics[4],
                'global_threat_level': metrics[5],
                'industry_threat_level': metrics[6],
                'user_risk_score': metrics[7],
                'threat_intelligence_score': metrics[8],
                'vulnerability_severity_score': metrics[9],
                'alertness_score': metrics[10],
                'honeypot_threat_indicator': metrics[11],
                'compliance_risk_score': metrics[12],
                'supply_chain_risk_factor': metrics[13]
            })
        return jsonify({'error': 'No metrics found for device'}), 404

@app.route('/api/device_metrics/<int:device_id>', methods=['POST'])
def update_device_metrics(device_id):
    data = request.json
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO device_metrics (
                device_id, patch_urgency, threat_level, known_vulnerabilities,
                global_threat_level, industry_threat_level, user_risk_score,
                threat_intelligence_score, vulnerability_severity_score,
                alertness_score, honeypot_threat_indicator,
                compliance_risk_score, supply_chain_risk_factor
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            device_id, data['patch_urgency'], data['threat_level'],
            data['known_vulnerabilities'], data['global_threat_level'],
            data['industry_threat_level'], data['user_risk_score'],
            data['threat_intelligence_score'], data['vulnerability_severity_score'],
            data['alertness_score'], data['honeypot_threat_indicator'],
            data['compliance_risk_score'], data['supply_chain_risk_factor']
        ))
        return jsonify({'message': 'Metrics updated successfully'})

# Risk Visualization API Routes
@app.route('/api/risk_score/<int:device_id>', methods=['GET'])
def calculate_risk_score(device_id):
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM device_metrics
            WHERE device_id = ?
            ORDER BY timestamp DESC
            LIMIT 1
        ''', (device_id,))
        metrics = cursor.fetchone()
        
        if not metrics:
            return jsonify({'error': 'No metrics found for device'}), 404
            
        # Calculate composite risk score using all metrics
        risk_factors = [
            metrics[2],  # patch_urgency
            metrics[3],  # threat_level
            metrics[4],  # known_vulnerabilities
            metrics[5],  # global_threat_level
            metrics[6],  # industry_threat_level
            metrics[7],  # user_risk_score
            metrics[8],  # threat_intelligence_score
            metrics[9],  # vulnerability_severity_score
            metrics[10], # alertness_score
            metrics[11], # honeypot_threat_indicator
            metrics[12], # compliance_risk_score
            metrics[13]  # supply_chain_risk_factor
        ]
        
        # Simple weighted average for now
        weights = [1] * len(risk_factors)  # Equal weights
        risk_score = sum(f * w for f, w in zip(risk_factors, weights)) / sum(weights)
        
        return jsonify({
            'risk_score': risk_score,
            'risk_level': 'High' if risk_score > 7 else 'Medium' if risk_score > 4 else 'Low',
            'timestamp': metrics[14]
        })

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

@app.route('/frontend/<path:path>')
def send_frontend(path):
    if os.path.exists(os.path.join('frontend', path)):
        return send_from_directory('frontend', path)
    return send_from_directory('templates/frontend', path)

if __name__ == '__main__':
    app.run(debug=True, port=5001, host='0.0.0.0', threaded=True)
