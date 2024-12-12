from flask import Blueprint, jsonify, request
from models.device_zscore import DeviceZScore
from database import get_db_connection
from contextlib import closing
import logging
import sqlite3

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

bp = Blueprint('network_visualization', __name__)

def get_zscore_status(zscore):
    """Determine status based on Z-score magnitude."""
    if zscore is None:
        return None
    
    abs_zscore = abs(zscore)
    if abs_zscore <= 1:
        return 'normal'
    elif abs_zscore <= 2:
        return 'warning'
    elif abs_zscore <= 3:
        return 'critical'
    else:
        return 'extreme'

@bp.route('/network/topology/details', methods=['GET'])
def get_network_topology():
    """Get network topology with device metrics and Z-scores."""
    try:
        with closing(get_db_connection()) as conn:
            conn.row_factory = sqlite3.Row

            # This query selects devices and their metrics from the 'devices' table.
            # If there's analysis data in device_analysis_results, it will join it.
            # Otherwise, a.* will be NULL, but the device will still be returned.
            devices = conn.execute('''
                SELECT d.id, d.name, d.ip_address,
                       d.cpu_usage, d.memory_usage, d.disk_usage, d.vulnerability_score,
                       a.zscore_cpu, a.zscore_memory, a.zscore_disk, a.zscore_vulnerability,
                       a.device_state
                FROM devices d
                LEFT JOIN device_analysis_results a ON d.id = a.device_id
                AND a.id IN (
                    SELECT MAX(id)
                    FROM device_analysis_results
                    GROUP BY device_id
                )
            ''').fetchall()

            zscore_analyzer = DeviceZScore()
            topology = {
                'devices': []
            }

            for device in devices:
                zscores_data = {
                    'cpu_usage': {
                        'zscore': device['zscore_cpu'],
                        'status': get_zscore_status(device['zscore_cpu'])
                    },
                    'memory_usage': {
                        'zscore': device['zscore_memory'],
                        'status': get_zscore_status(device['zscore_memory'])
                    },
                    'disk_usage': {
                        'zscore': device['zscore_disk'],
                        'status': get_zscore_status(device['zscore_disk'])
                    },
                    'vulnerability_score': {
                        'zscore': device['zscore_vulnerability'],
                        'status': get_zscore_status(device['zscore_vulnerability'])
                    }
                }

                # Analyze device if possible
                analysis = zscore_analyzer.analyze_device(device['id'])
                logger.debug(f"DEBUG: Analysis for device {device['id']}:", analysis)

                # Add zscore_mean if available
                if analysis and 'zscore_mean' in analysis:
                    zscores_data['zscore_mean'] = {
                        'zscore': analysis['zscore_mean']['zscore'],
                        'status': analysis['zscore_mean']['status'],
                        'component_scores': analysis['zscore_mean'].get('component_scores', []),
                        'metric_count': analysis['zscore_mean'].get('metric_count', 0)
                    }

                # Determine if Z-scores are present
                zs_present = (
                    (device['zscore_cpu'] is not None or 
                     device['zscore_memory'] is not None or 
                     device['zscore_disk'] is not None or 
                     device['zscore_vulnerability'] is not None) 
                    or ('zscore_mean' in zscores_data)
                )

                device_data = {
                    'id': device['id'],
                    'name': device['name'],
                    'ip_address': device['ip_address'],
                    'metrics': {
                        'cpu_usage': device['cpu_usage'] if device['cpu_usage'] is not None else 0,
                        'memory_usage': device['memory_usage'] if device['memory_usage'] is not None else 0,
                        'disk_usage': device['disk_usage'] if device['disk_usage'] is not None else 0,
                        'vulnerability_score': device['vulnerability_score'] if device['vulnerability_score'] is not None else 0
                    },
                    'zscores': zscores_data if zs_present else None,
                    'state': device['device_state']
                }

                if analysis:
                    device_data['analysis'] = analysis

                topology['devices'].append(device_data)

            return jsonify(topology)
    except Exception as e:
        logger.exception("Exception in get_network_topology route:")
        return jsonify({'error': str(e)}), 500

@bp.route('/device/<int:device_id>/zscores', methods=['GET'])
def get_device_zscores(device_id):
    """Get Z-score analysis for a specific device."""
    try:
        zscore_analyzer = DeviceZScore()
        analysis = zscore_analyzer.analyze_device(device_id)
        if analysis:
            return jsonify(analysis)
        return jsonify({'error': 'Device not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/network/anomalies', methods=['GET'])
def get_network_anomalies():
    """Get devices with anomalous metrics."""
    try:
        zscore_analyzer = DeviceZScore()
        threshold = float(request.args.get('threshold', 2.0))
        metric_type = request.args.get('metric', None)  # Optional metric filter
        anomalies = zscore_analyzer.get_anomalous_devices(threshold)
        
        # Filter by metric if specified
        if metric_type:
            anomalies = [
                a for a in anomalies 
                if any(m['metric'] == metric_type for m in a['anomalies'])
            ]
            
        return jsonify(anomalies)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/metrics/rankings', methods=['GET'])
def get_metric_rankings():
    """Get devices ranked by their Z-scores for each metric."""
    try:
        zscore_analyzer = DeviceZScore()
        metric_type = request.args.get('metric', None)  # Optional metric filter
        rankings = zscore_analyzer.get_metric_rankings()
        
        # Filter by metric if specified
        if metric_type and metric_type in rankings:
            return jsonify({metric_type: rankings[metric_type]})
        return jsonify(rankings)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/device/<int:device_id>/history', methods=['GET'])
def get_device_history(device_id):
    """Get historical Z-scores for a device."""
    try:
        zscore_analyzer = DeviceZScore()
        limit = int(request.args.get('limit', 100))
        metric_type = request.args.get('metric', None)  # Optional metric filter
        history = zscore_analyzer.get_device_history(device_id, limit)
        
        # Filter by metric if specified
        if metric_type:
            for record in history:
                if 'metrics' in record and metric_type in record['metrics']:
                    record['metrics'] = {metric_type: record['metrics'][metric_type]}
                
        return jsonify(history)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/zscore/status-summary', methods=['GET'])
def get_zscore_status_summary():
    """Get a summary of Z-score statuses across all devices."""
    try:
        with closing(get_db_connection()) as conn:
            cursor = conn.cursor()
            # Get latest analysis results for all devices
            cursor.execute('''
                SELECT device_id,
                       zscore_cpu, zscore_memory, zscore_disk, zscore_vulnerability
                FROM device_analysis_results
                WHERE id IN (
                    SELECT MAX(id)
                    FROM device_analysis_results
                    GROUP BY device_id
                )
            ''')
            results = cursor.fetchall()
            
            summary = {
                'normal': 0,
                'warning': 0,
                'critical': 0,
                'extreme': 0
            }
            
            for result in results:
                zscores = [
                    result['zscore_cpu'],
                    result['zscore_memory'],
                    result['zscore_disk'],
                    result['zscore_vulnerability']
                ]
                # Get worst status for device
                worst_zscore = max((abs(z) for z in zscores if z is not None), default=0)
                status = get_zscore_status(worst_zscore)
                if status:
                    summary[status] += 1
            
            return jsonify(summary)
    except Exception as e:
        logger.exception("Exception in get_zscore_status_summary route:")
        return jsonify({'error': str(e)}), 500
