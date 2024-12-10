# routes/cip_impact_routes.py

from flask import Blueprint, render_template, jsonify
from models.device_zscore import DeviceZScore

cip_impact_bp = Blueprint('cip_impact', __name__)
zscore_analyzer = DeviceZScore()

@cip_impact_bp.route('/')
def index():
    """Render the CIP Impact page."""
    return render_template('frontend/cip_impact.html.jinja2', active_page='cip_impact')

@cip_impact_bp.route('/api/zscore/metrics')
def get_zscore_metrics():
    """Get Z-scores for all devices and metrics."""
    try:
        # Get Z-score rankings for all metrics
        rankings = zscore_analyzer.get_metric_rankings()
        
        # Get anomalous devices
        anomalies = zscore_analyzer.get_anomalous_devices(threshold=2.0)
        
        return jsonify({
            'success': True,
            'rankings': rankings,
            'anomalies': anomalies
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cip_impact_bp.route('/api/zscore/device/<int:device_id>')
def get_device_zscores(device_id):
    """Get Z-scores for a specific device."""
    try:
        zscores = zscore_analyzer.analyze_device(device_id)
        if zscores is None:
            return jsonify({
                'success': False,
                'error': 'Device not found'
            }), 404
            
        return jsonify({
            'success': True,
            'zscores': zscores
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500