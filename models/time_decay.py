import math

def calculate_time_decay(initial_value, decay_rate, time_elapsed):
    """
    Calculate the time-decayed value of CIP influence.
    
    :param initial_value: Initial value to decay.
    :param decay_rate: Rate of decay.
    :param time_elapsed: Time elapsed since initial value was recorded.
    :return: Time-decayed value.
    """
    return initial_value * math.exp(-decay_rate * time_elapsed)
