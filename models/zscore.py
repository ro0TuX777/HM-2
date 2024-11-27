def calculate_zscore(current_value, mean, std_dev):
    """
    Calculate the Z-score for a given value.
    
    :param current_value: Current value to evaluate.
    :param mean: Mean of historical data.
    :param std_dev: Standard deviation of historical data.
    :return: Calculated Z-score.
    """
    return (current_value - mean) / std_dev
