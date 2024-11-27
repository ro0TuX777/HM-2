# models/time_decay_multiple.py

import math

def calculate_time_decay_multiple(initial_values, decay_rates, time_elapsed):
    """
    Calculate the time-decayed values of multiple CIP influences.

    :param initial_values: Dictionary of initial values to decay.
    :param decay_rates: Dictionary of decay rates for each value.
    :param time_elapsed: Time elapsed since initial values were recorded.
    :return: Dictionary of time-decayed values.
    """
    if initial_values.keys() != decay_rates.keys():
        raise ValueError("Initial values and decay rates must have the same keys")

    decayed_values = {}
    for key in initial_values.keys():
        decayed_values[key] = initial_values[key] * math.exp(-decay_rates[key] * time_elapsed)

    return decayed_values
