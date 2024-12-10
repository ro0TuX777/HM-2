# blueprints/cip_impact.py

from flask import Blueprint, render_template, jsonify
from models.device_zscore import DeviceZScore
import logging

logger = logging.getLogger(__name__)

# Create the blueprint
cip_impact_bp = Blueprint(
    'cip_impact_bp',  # unique name for the blueprint
    __name__,
    url_prefix='/cip_impact'  # optional URL prefix
)

# Initialize Z-score analyzer
zscore_analyzer = DeviceZScore()

@cip_impact_bp.route('/test', methods=['GET'])
def test():
    """Test endpoint to verify blueprint is working."""
    logger.debug("Test endpoint accessed")
    return jsonify({"message": "CIP Impact blueprint test endpoint"})

@cip_impact_bp.route('/', methods=['GET'])
def index():
    """Main page route."""
    logger.debug("Index endpoint accessed")
    return render_template('frontend/cip_impact.html.jinja2', active_page='cip_impact')

@cip_impact_bp.route('/zscore/metrics', methods=['GET'])
def get_zscore_metrics():
    """Get Z-scores for all devices and metrics."""
    logger.debug("Z-score metrics endpoint accessed")
    try:
        rankings = zscore_analyzer.get_metric_rankings()
        anomalies = zscore_analyzer.get_anomalous_devices(threshold=2.0)
        
        return jsonify({
            'success': True,
            'rankings': rankings,
            'anomalies': anomalies
        })
    except Exception as e:
        logger.error(f"Error in get_zscore_metrics: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500