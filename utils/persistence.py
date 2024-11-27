import json
from database import get_all_devices, get_cip_control, update_cip_control

def save_workspace():
    devices = get_all_devices()
    cip_controls = [get_cip_control(device['id']) for device in devices]
    workspace_data = {
        "devices": devices,
        "cip_controls": cip_controls
    }
    with open('workspace.json', 'w') as f:
        json.dump(workspace_data, f)
    return "Workspace saved successfully."

def load_workspace():
    with open('workspace.json', 'r') as f:
        workspace_data = json.load(f)
    for device, cip_control in zip(workspace_data['devices'], workspace_data['cip_controls']):
        update_cip_control(device['id'], cip_control['control_name'], cip_control['settings'])
    return "Workspace loaded successfully."
