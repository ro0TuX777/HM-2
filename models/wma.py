def calculate_wma(metrics, weights):
    """
    Calculate the Weighted Moving Average (WMA) for a given list of metrics and weights.

    :param metrics: List of metric values.
    :param weights: List of weights corresponding to each metric value.
    :return: Weighted Moving Average value.
    """
    if len(metrics) != len(weights):
        raise ValueError("Metrics and weights must be of the same length")

    return sum(w * m for w, m in zip(weights, metrics)) / sum(weights)
