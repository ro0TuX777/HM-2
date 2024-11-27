# models/sigmoid_modified.py

import math

def sigmoid_modified(cip_values, weights, k=10, x0=0.5):
    """
    Calculate the modified sigmoid function value incorporating multiple CIP inputs.

    :param cip_values: Dictionary of CIP input values (normalized between 0 and 1).
    :param weights: Dictionary of weights for each CIP input.
    :param k: Steepness of the sigmoid curve.
    :param x0: Inflection point.
    :return: Sigmoid value adjusted by CIP inputs.
    """
    if cip_values.keys() != weights.keys():
        raise ValueError("CIP values and weights must have the same keys")

    weighted_sum = sum(weights[key] * (cip_values[key] - x0) for key in cip_values.keys())

    exponent = -k * weighted_sum
    return 1 / (1 + math.exp(exponent))
