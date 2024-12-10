# models/mutual_information.py

from sklearn.metrics import mutual_info_score

def calculate_mutual_information(X_events, Y_events):
    """
    Calculate the Mutual Information between two event sequences.

    :param X_events: List or array of events in your network.
    :param Y_events: List or array of events in the partner's network.
    :return: Mutual Information score.
    """
    if len(X_events) != len(Y_events):
        raise ValueError("Event lists X_events and Y_events must have the same length")

    mi = mutual_info_score(X_events, Y_events)
    return mi
