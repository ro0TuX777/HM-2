# models/pearson_correlation.py

import numpy as np

def calculate_pearson_correlation(X, Y):
    """
    Calculate the Pearson correlation coefficient between two sets of values.

    :param X: List or array of values for variable X.
    :param Y: List or array of values for variable Y.
    :return: Pearson correlation coefficient r.
    """
    if len(X) != len(Y):
        raise ValueError("Lists X and Y must have the same length")

    X = np.array(X)
    Y = np.array(Y)

    mean_X = np.mean(X)
    mean_Y = np.mean(Y)

    numerator = np.sum((X - mean_X) * (Y - mean_Y))
    denominator = np.sqrt(np.sum((X - mean_X)**2) * np.sum((Y - mean_Y)**2))

    if denominator == 0:
        return 0  # Avoid division by zero; no variation means no correlation
    r = numerator / denominator

    return r
