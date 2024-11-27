def validate_request_data(required_fields, data):
    """
    Validate that all required fields are present in the request data.
    :param required_fields: List of required field names.
    :param data: The request data to validate.
    :return: Tuple (is_valid, error_message). is_valid is True if all fields are present, otherwise False.
    """
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return False, f"Missing fields: {', '.join(missing_fields)}"
    return True, None

def format_error(message):
    """
    Format an error message for JSON response.
    :param message: The error message to format.
    :return: A dictionary with the error message.
    """
    return {"error": message}
