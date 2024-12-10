import sqlite3
from contextlib import closing
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Define module exports
__all__ = [
    'get_db_connection', 'init_db', 'get_or_create_numeric_id', 'add_device',
    'update_device', 'delete_device', 'get_device', 'insert_device_metrics',
    'validate_device_data', 'get_all_connections', 'get_latest_device_metrics',
    'get_all_devices', 'get_latest_metrics', 'verify_database_integrity'
]

DATABASE_NAME = 'app.db'

def get_db_connection():
    """Create a database connection with Row factory."""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database schema."""
    with closing(get_db_connection()) as conn:
        with conn:
            # Enable foreign keys
            conn.execute('PRAGMA foreign_keys=ON;')
            
            # Projects table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # Devices table
            conn.execute('''
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

            # Network devices table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS network_devices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    ip_address TEXT NOT NULL,
                    description TEXT
                )
            ''')
            
            # Connections table
            conn.execute('''
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

            # Device metrics table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS device_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    device_id INTEGER NOT NULL,
                    cpu_usage REAL,
                    memory_usage REAL,
                    disk_usage REAL,
                    vulnerability_score REAL,
                    network_usage REAL,
                    temperature REAL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (device_id) REFERENCES network_devices (id)
                )
            ''')

            # Device analysis results table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS device_analysis_results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    device_id INTEGER NOT NULL,
                    ema_cpu REAL,
                    ema_memory REAL,
                    ema_disk REAL,
                    sigmoid_risk REAL,
                    zscore_cpu REAL,
                    zscore_memory REAL,
                    zscore_disk REAL,
                    zscore_vulnerability REAL,
                    device_state TEXT,
                    time_decay_factor REAL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (device_id) REFERENCES network_devices (id)
                )
            ''')

            # Device ID mapping table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS device_id_mapping (
                    numeric_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    string_id TEXT UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # CIP controls table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS cip_controls (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    control_name TEXT NOT NULL,
                    settings TEXT NOT NULL
                )
            ''')

            # Create indices for better performance
            conn.execute('CREATE INDEX IF NOT EXISTS idx_device_metrics_device_id ON device_metrics(device_id)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_device_id_mapping_string ON device_id_mapping(string_id)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_device_analysis_device_id ON device_analysis_results(device_id)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_connections_devices ON connections(source_device_id, target_device_id)')

def get_or_create_numeric_id(string_id):
    """Convert a string device ID to a numeric ID, creating a mapping if needed."""
    with closing(get_db_connection()) as conn:
        cursor = conn.cursor()
        
        # Check existing mapping
        cursor.execute('''
            SELECT numeric_id FROM device_id_mapping 
            WHERE string_id = ?
        ''', (string_id,))
        result = cursor.fetchone()
        
        if result:
            return result['numeric_id']
            
        # Create new mapping and device
        cursor.execute('BEGIN TRANSACTION')
        try:
            cursor.execute('''
                INSERT INTO device_id_mapping (string_id)
                VALUES (?)
            ''', (string_id,))
            
            numeric_id = cursor.lastrowid
            
            cursor.execute('''
                INSERT INTO network_devices 
                (id, name, ip_address, description)
                VALUES (?, ?, ?, ?)
            ''', (numeric_id, 
                  f"Device {string_id}", 
                  "192.168.1.1",
                  f"Auto-created device from {string_id}"))
            
            conn.commit()
            return numeric_id
        except Exception as e:
            conn.rollback()
            print(f"Error creating device mapping: {str(e)}")
            raise

# Device metrics functions
def insert_device_metrics(device_id, metrics_data):
    """Insert new metrics for a device."""
    with closing(get_db_connection()) as conn:
        cursor = conn.cursor()
        try:
            cursor.execute('''
                INSERT INTO device_metrics (
                    device_id, cpu_usage, memory_usage, disk_usage,
                    vulnerability_score, network_usage, temperature
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                device_id,
                metrics_data.get('cpu', 0),
                metrics_data.get('memory', 0),
                metrics_data.get('disk', 0),
                metrics_data.get('vulnerability', 0),
                metrics_data.get('network', 0),
                metrics_data.get('temperature', 0)
            ))
            # Insert into device_analysis_results if applicable
            cursor.execute('''
                INSERT INTO device_analysis_results (
                    device_id, ema_cpu, ema_memory, ema_disk,
                    sigmoid_risk, zscore_cpu, zscore_memory, zscore_disk,
                    zscore_vulnerability, device_state, time_decay_factor
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                device_id,
                0,  # Placeholder for EMA CPU
                0,  # Placeholder for EMA Memory
                0,  # Placeholder for EMA Disk
                0,  # Placeholder for Sigmoid Risk
                0,  # Placeholder for Z-score CPU
                0,  # Placeholder for Z-score Memory
                0,  # Placeholder for Z-score Disk
                0,  # Placeholder for Z-score Vulnerability
                'normal',  # Placeholder for Device State
                1.0  # Placeholder for Time Decay Factor
            ))
            conn.commit()
            return True
        except Exception as e:
            print(f"Error inserting metrics: {str(e)}")
            conn.rollback()
            return False

def validate_device_data(name, ip_address):
    """Validate device data before insertion."""
    if not name or not ip_address:
        raise ValueError("Device name and IP address are required.")
    if len(name) > 255:
        raise ValueError("Device name is too long.")

def get_all_connections():
    """Retrieve all connections."""
    with closing(get_db_connection()) as conn:
        return conn.execute('SELECT * FROM connections').fetchall()


def update_device(device_id, name, ip_address, description):
    """Update an existing device in the network_devices table."""
    with closing(get_db_connection()) as conn:
        cursor = conn.cursor()
        try:
            cursor.execute('''
                UPDATE network_devices
                SET name = ?, ip_address = ?, description = ?
                WHERE id = ?
            ''', (name, ip_address, description, device_id))
            conn.commit()
            return True
        except Exception as e:
            print(f"Error updating device: {str(e)}")
            conn.rollback()
            return False

def delete_device(device_id):
    """Delete a device and associated metrics and analysis."""
    with closing(get_db_connection()) as conn:
        cursor = conn.cursor()
        try:
            cursor.execute('DELETE FROM network_devices WHERE id = ?', (device_id,))
            conn.commit()
            return True
        except Exception as e:
            print(f"Error deleting device: {str(e)}")
            conn.rollback()
            return False

def add_device(name, ip_address, description):
    """Add a new device to the network_devices table."""
    with closing(get_db_connection()) as conn:
        cursor = conn.cursor()
        try:
            cursor.execute('''
                INSERT INTO network_devices (name, ip_address, description)
                VALUES (?, ?, ?)
            ''', (name, ip_address, description))
            conn.commit()
            return cursor.lastrowid  # Return the new device's ID
        except Exception as e:
            print(f"Error adding device: {str(e)}")
            conn.rollback()
            return None


def get_device(device_id):
    """Retrieve a device by its ID."""
    with closing(get_db_connection()) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM network_devices WHERE id = ?
        ''', (device_id,))
        return cursor.fetchone()

# Query functions
def get_latest_device_metrics(device_id):
    """Get the latest metrics for a specific device."""
    with closing(get_db_connection()) as conn:
        return conn.execute('''
            SELECT 
                cpu_usage, memory_usage, disk_usage, vulnerability_score, 
                network_usage, temperature, timestamp
            FROM device_metrics
            WHERE device_id = ?
            ORDER BY timestamp DESC
            LIMIT 1
        ''', (device_id,)).fetchone()


def get_all_devices():
    """Retrieve all network devices."""
    with closing(get_db_connection()) as conn:
        return conn.execute('SELECT * FROM network_devices').fetchall()

def get_latest_metrics():
    """Retrieve the latest metrics for all devices."""
    with closing(get_db_connection()) as conn:
        return conn.execute('''
            SELECT 
                d.id,
                d.name,
                d.ip_address,
                d.description,
                m.cpu_usage,
                m.memory_usage,
                m.disk_usage,
                m.vulnerability_score,
                a.zscore_cpu,
                a.zscore_memory,
                a.zscore_disk,
                a.zscore_vulnerability,
                a.device_state
            FROM network_devices d
            LEFT JOIN device_metrics m ON d.id = m.device_id
            LEFT JOIN device_analysis_results a ON d.id = a.device_id
            WHERE m.id IN (
                SELECT MAX(id) FROM device_metrics GROUP BY device_id
            )
            AND a.id IN (
                SELECT MAX(id) FROM device_analysis_results GROUP BY device_id
            )
        ''').fetchall()

# Verification functions
def verify_database_integrity():
    """Verify the integrity of the database and mappings."""
    with closing(get_db_connection()) as conn:
        cursor = conn.cursor()
        
        orphaned_metrics = cursor.execute('''
            SELECT dm.device_id, dm.id as metric_id
            FROM device_metrics dm
            LEFT JOIN network_devices nd ON dm.device_id = nd.id
            WHERE nd.id IS NULL
        ''').fetchall()
        
        if orphaned_metrics:
            logger.warning(f"Found {len(orphaned_metrics)} orphaned metrics: {orphaned_metrics}")
        
        orphaned_analysis = cursor.execute('''
            SELECT dar.device_id, dar.id as analysis_id
            FROM device_analysis_results dar
            LEFT JOIN network_devices nd ON dar.device_id = nd.id
            WHERE nd.id IS NULL
        ''').fetchall()
        
        if orphaned_analysis:
            logger.warning(f"Found {len(orphaned_analysis)} orphaned analysis results: {orphaned_analysis}")
        
        return not (bool(orphaned_metrics) or bool(orphaned_analysis))


# Initialize the database when the script is run directly
if __name__ == '__main__':
    init_db()
    print("Database initialized successfully!")
