from flask import Flask, send_from_directory, render_template, jsonify
import os
import logging
from database import init_db

# Import Blueprints
from routes.device_management_DBroutes import device_management_db_bp
from routes.cip_impact_routes import cip_impact_bp
from routes.network_routes import network_viz_bp
from blueprints.network_visualization import bp as network_visualization_bp

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__,
            static_url_path='',
            static_folder='static',
            template_folder='templates')

# Log when registering blueprints
logger.debug("Registering blueprints...")

# Register blueprints
app.register_blueprint(device_management_db_bp, url_prefix='/api')
app.register_blueprint(cip_impact_bp, url_prefix='/api')
app.register_blueprint(network_viz_bp, url_prefix='/api')
app.register_blueprint(network_visualization_bp, url_prefix='/api')

# Verify registration
logger.debug("Registered routes:")
for rule in app.url_map.iter_rules():
    logger.debug(f"{rule.endpoint}: {rule.rule}")

# Database and exports setup
DATABASE = os.path.join(os.path.dirname(__file__), 'app.db')
EXPORTS_DIR = os.path.join(os.path.dirname(__file__), 'json_exports')

# Debug route to list all registered routes
@app.route('/debug/routes')
def debug_routes():
    """List all registered routes."""
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            'endpoint': rule.endpoint,
            'methods': list(rule.methods),
            'path': str(rule)
        })
    return jsonify(routes)

# After request handler (only one definition)
@app.after_request
def after_request(response):
    # CORS headers
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    
    # Adjusted CSP:
    # - Use wildcard for OSM tiles
    # - Add 'unsafe-eval' only if absolutely required by your libraries
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-eval'; "  # Added unsafe-eval
        "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
        "img-src 'self' data: "
        "https://a.tile.openstreetmap.org "  # OSM tile servers
        "https://b.tile.openstreetmap.org "
        "https://c.tile.openstreetmap.org; "
        "connect-src 'self'; "
        "font-src 'self'; "
        "object-src 'none'; "
        "media-src 'self'; "
        "frame-ancestors 'self'; "
        "base-uri 'self'; "
        "form-action 'self';"
)

    return response

# Main page routes (only one definition)
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

# Static file routes (only one definition)
@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

@app.route('/frontend/<path:path>')
def send_frontend(path):
    if os.path.exists(os.path.join('frontend', path)):
        return send_from_directory('frontend', path)
    return send_from_directory('templates/frontend', path)

# Initialize the database using the `init_db` from `database.py`
init_db()

if __name__ == '__main__':
    app.run(debug=True, port=5001, host='0.0.0.0', threaded=True)
