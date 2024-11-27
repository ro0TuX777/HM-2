# models/user_risk_score.py

def calculate_user_risk_score(user_activities, activity_means, activity_stds, weights):
    """
    Calculate the User Risk Score (URS) for insider threats.

    :param user_activities: Dictionary of user's activity metrics.
    :param activity_means: Dictionary of mean values for each activity metric.
    :param activity_stds: Dictionary of standard deviations for each activity metric.
    :param weights: Dictionary of weights for each activity metric.
    :return: Calculated User Risk Score.
    """
    if not (user_activities.keys() == activity_means.keys() == activity_stds.keys() == weights.keys()):
        raise ValueError("All input dictionaries must have the same keys")

    urs = 0.0
    for key in user_activities.keys():
        if activity_stds[key] == 0:
            z_score = 0
        else:
            z_score = (user_activities[key] - activity_means[key]) / activity_stds[key]
        urs += weights[key] * abs(z_score)  # Use absolute value to measure deviation in any direction

    return urs
