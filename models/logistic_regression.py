# models/logistic_regression.py

from sklearn.linear_model import LogisticRegression

def logistic_regression_threshold_adaptation(X_train, y_train, X_test):
    """
    Fit a logistic regression model and predict probabilities for threshold adaptation.

    :param X_train: Training feature matrix (e.g., past event data).
    :param y_train: Training labels (e.g., 0 for false positive, 1 for actual vulnerability).
    :param X_test: Test feature matrix (current data for prediction).
    :return: Predicted probabilities for the positive class.
    """
    # Initialize the logistic regression model
    model = LogisticRegression(solver='liblinear')  # 'liblinear' is good for small datasets

    # Fit the model with training data
    model.fit(X_train, y_train)

    # Predict probabilities on the test data
    probabilities = model.predict_proba(X_test)[:, 1]  # Probability of class '1'

    return probabilities
