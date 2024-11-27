# models/holt_winters.py

def holt_winters_forecast(series, alpha, beta, gamma, season_length, forecast_length):
    """
    Perform Holt-Winters Exponential Smoothing forecast.

    :param series: List of historical data points.
    :param alpha: Smoothing coefficient for level.
    :param beta: Smoothing coefficient for trend.
    :param gamma: Smoothing coefficient for seasonality.
    :param season_length: Length of the seasonal cycle.
    :param forecast_length: Number of periods to forecast.
    :return: Forecasted values for the specified forecast length.
    """
    import numpy as np

    n = len(series)
    if n < season_length * 2:
        raise ValueError("Time series is too short for Holt-Winters forecasting")

    seasonals = initial_seasonal_components(series, season_length)
    result = []
    smooth = series[0]
    trend = initial_trend(series, season_length)

    for i in range(n + forecast_length):
        if i >= n:
            m = i - n + 1
            value = (smooth + m * trend) + seasonals[i % season_length]
            result.append(value)
        else:
            val = series[i]
            last_smooth = smooth
            smooth = alpha * (val - seasonals[i % season_length]) + (1 - alpha) * (smooth + trend)
            trend = beta * (smooth - last_smooth) + (1 - beta) * trend
            seasonals[i % season_length] = gamma * (val - smooth) + (1 - gamma) * seasonals[i % season_length]
            result.append(smooth + trend + seasonals[i % season_length])

    return result[-forecast_length:]

def initial_seasonal_components(series, season_length):
    import numpy as np

    seasonals = []
    season_averages = []
    n_seasons = int(len(series) / season_length)

    for j in range(n_seasons):
        season_avg = sum(series[season_length * j:season_length * j + season_length]) / float(season_length)
        season_averages.append(season_avg)

    for i in range(season_length):
        sum_of_vals_over_avg = 0.0
        for j in range(n_seasons):
            sum_of_vals_over_avg += series[season_length * j + i] - season_averages[j]
        seasonals.append(sum_of_vals_over_avg / n_seasons)
    return seasonals

def initial_trend(series, season_length):
    sum = 0.0
    for i in range(season_length):
        sum += (series[season_length + i] - series[i]) / season_length
    return sum / season_length
