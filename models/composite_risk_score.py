# models/composite_risk_score.py

def calculate_composite_risk_score(risk_components, weights):
    """
    Calculate the Composite Risk Score (CRS) from multiple risk factors.

    :param risk_components: Dictionary of risk components (normalized between 0 and 1).
    :param weights: Dictionary of weights for each risk component.
    :return: Calculated Composite Risk Score.
    """
    if risk_components.keys() != weights.keys():
        raise ValueError("Risk components and weights must have the same keys")

    composite_score = sum(weights[key] * risk_components[key] for key in risk_components.keys())

    return composite_score
