import math

# Haversine formula for A* algorithm
def calculate_haversine_distance(lat1: float, long1: float, lat2: float, long2: float) -> float:
    """
    Calculates the great-circle distance between two points on the Earth using the Haversine formula.
    Returns the distance in kilometers.
    """
    # Define the approximate radius of the Earth in kilometers (used to convert angular distance to physical distance)
    R = 6371.0

    # Convert the latitude of the starting point from degrees to radians for trigonometric functions
    phi1 = math.radians(lat1)
    # Convert the latitude of the destination point from degrees to radians
    phi2 = math.radians(lat2)

    # Calculate the difference in latitude between the two points and convert to radians
    delta_phi = math.radians(lat2 - lat1)
    # Calculate the difference in longitude between the two points and convert to radians
    delta_lambda = math.radians(long2 - long1)

    # Apply the Haversine formula part 1: a = sin^2(Δφ/2) + cos φ1 ⋅ cos φ2 ⋅ sin^2(Δλ/2)
    # This calculates the square of half the chord length between the points
    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2

    # Apply the Haversine formula part 2: c = 2 ⋅ atan2( √a, √(1−a) )
    # This calculates the angular distance in radians
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    # Calculate the final distance by multiplying the angular distance by the Earth's radius
    distance = R * c

    # Return the computed distance in kilometers
    return distance

# Insert price calculation of flight fees





# Any other utils like string/currency formatting can be inserted here
