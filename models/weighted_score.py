# models/weighted_score.py

def calculate_weighted_score(alert_factors, weights):
    """
    Calculate the weighted score for alert prioritization.

    :param alert_factors: Dictionary of alert factors with their normalized values (between 0 and 1).
    :param weights: Dictionary of weights corresponding to each alert factor.
    :return: Calculated weighted score.
    """
    if alert_factors.keys() != weights.keys():
        raise ValueError("Alert factors and weights must have the same keys")

    weighted_score = sum(weights[key] * alert_factors[key] for key in alert_factors.keys())

    return weighted_score
