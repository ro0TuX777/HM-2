def calculate_ema(current_value, previous_ema, alpha=0.2):
    """
    Calculate the Exponential Moving Average (EMA).
    
    :param current_value: Current metric value.
    :param previous_ema: Previous EMA value.
    :param alpha: Smoothing factor (between 0 and 1).
    :return: Calculated EMA.
    """
    return alpha * current_value + (1 - alpha) * previous_ema
