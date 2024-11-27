from flask import Blueprint, jsonify
from utils.persistence import save_workspace, load_workspace

persistence_routes = Blueprint('persistence_routes', __name__)

@persistence_routes.route('/save_workspace', methods=['POST'])
def save_workspace_route():
    message = save_workspace()
    return jsonify(message=message)

@persistence_routes.route('/load_workspace', methods=['POST'])
def load_workspace_route():
    message = load_workspace()
    return jsonify(message=message)
