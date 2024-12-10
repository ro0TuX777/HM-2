#!/bin/bash

# Exit on error
set -e

# Create and activate virtual environment
echo "Creating virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "Installing requirements..."
pip install -r requirements.txt

# Initialize database
echo "Initializing database..."
python3 - <<EOF
import sqlite3
conn = sqlite3.connect('app.db')
cursor = conn.cursor()

# Create projects table
cursor.execute('''
    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
''')

# Create devices table
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
''')

# Create connections table
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

# Create device metrics history table
cursor.execute('''
    CREATE TABLE IF NOT EXISTS device_metrics_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER,
        cpu_usage INTEGER,
        memory_usage INTEGER,
        disk_usage INTEGER,
        vulnerability_score REAL,
        network_usage REAL,
        temperature REAL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    )
''')

conn.commit()
conn.close()
EOF

# Create necessary directories
echo "Creating directories..."
mkdir -p json_exports
mkdir -p static/js
mkdir -p templates/frontend

# Set permissions
echo "Setting permissions..."
chmod +x setup.sh
chmod -R 755 static templates

echo "Setup complete! You can now run the application with: flask run"