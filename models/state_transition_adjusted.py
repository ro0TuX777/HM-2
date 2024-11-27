# models/state_transition_adjusted.py

def state_transition_adjusted(current_state, admin_action, external_factors, thresholds):
    """
    Determine the next state based on the current state, admin actions, and multiple external factors.

    :param current_state: Current state of the device.
    :param admin_action: Action taken by admin.
    :param external_factors: Dictionary of external factors affecting the state.
    :param thresholds: Dictionary of thresholds for state transitions.
    :return: New state.
    """
    composite_risk = sum(external_factors.values())

    if current_state == 'normal' and composite_risk >= thresholds['warning']:
        return 'warning'
    elif current_state == 'warning':
        if composite_risk >= thresholds['critical'] and admin_action == 'none':
            return 'critical'
        elif composite_risk < thresholds['warning']:
            return 'normal'
    elif current_state == 'critical' and admin_action == 'mitigated':
        return 'warning'
    return current_state
