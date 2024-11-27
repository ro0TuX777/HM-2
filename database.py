import sqlite3
from contextlib import closing
from models.ema import calculate_ema
from models.zscore import calculate_zscore
from models.sigmoid_modified import sigmoid_modified
from models.state_transition_adjusted import state_transition_adjusted
from models.time_decay import calculate_time_decay

DATABASE_NAME = 'app.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with closing(get_db_connection()) as conn:
        with conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS network_devices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    ip_address TEXT NOT NULL,
                    description TEXT
                )
            ''')
            conn.execute('''
                CREATE TABLE IF NOT EXISTS cip_controls (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    control_name TEXT NOT NULL,
                    settings TEXT NOT NULL
                )
            ''')

def add_device(name, ip_address, description):
    with closing(get_db_connection()) as conn:
        with conn:
            conn.execute('''
                INSERT INTO network_devices (name, ip_address, description)
                VALUES (?, ?, ?)
            ''', (name, ip_address, description))

def update_device(device_id, name, ip_address, description):
    with closing(get_db_connection()) as conn:
        with conn:
            conn.execute('''
                UPDATE network_devices
                SET name = ?, ip_address = ?, description = ?
                WHERE id = ?
            ''', (name, ip_address, description, device_id))

def get_device(device_id):
    with closing(get_db_connection()) as conn:
        with conn:
            return conn.execute('''
                SELECT * FROM network_devices WHERE id = ?
            ''', (device_id,)).fetchone()

def get_all_devices():
    with closing(get_db_connection()) as conn:
        with conn:
            return conn.execute('SELECT * FROM network_devices').fetchall()

def add_cip_control(control_name, settings):
    with closing(get_db_connection()) as conn:
        with conn:
            conn.execute('''
                INSERT INTO cip_controls (control_name, settings)
                VALUES (?, ?)
            ''', (control_name, settings))

def update_cip_control(control_id, control_name, settings):
    with closing(get_db_connection()) as conn:
        with conn:
            conn.execute('''
                UPDATE cip_controls
                SET control_name = ?, settings = ?
                WHERE id = ?
            ''', (control_name, settings, control_id))

def get_cip_control(control_id):
    with closing(get_db_connection()) as conn:
        with conn:
            return conn.execute('''
                SELECT * FROM cip_controls WHERE id = ?
            ''', (control_id,)).fetchone()

def recalculate_for_all_devices():
    with closing(get_db_connection()) as conn:
        with conn:
            devices = conn.execute('SELECT * FROM network_devices').fetchall()
            for device in devices:
                # Step 2.1: Retrieve current metrics and CIP control values
                # Placeholder for retrieving metrics and CIP control values
                metrics = {}  # Replace with actual retrieval logic
                cip_controls = {}  # Replace with actual retrieval logic

                # Step 2.2: Apply WMA or EMA for relevant metrics
                ema_results = calculate_ema(metrics)

                # Step 2.3: Use the Sigmoid function to normalize risk levels
                sigmoid_results = sigmoid_modified(metrics, cip_controls)

                # Step 2.4: Calculate z-scores to detect anomalies
                zscore_results = calculate_zscore(metrics)

                # Step 2.5: Use the State Transition Model to determine and set the device state
                device_state = state_transition_adjusted(metrics, cip_controls)

                # Step 2.6: Apply Time Decay to handle metrics for inactive devices
                time_decay_results = calculate_time_decay(metrics)

                # Step 2.7: Store the recalculated values in the database
                # Placeholder for storing recalculated values
                print(f"Recalculated metrics for device {device['name']} with IP {device['ip_address']}")

            # Step 3: Batch update the recalculated values into the database
            # Placeholder for batch update logic
