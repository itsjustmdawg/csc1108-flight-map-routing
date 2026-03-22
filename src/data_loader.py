import json
import os

from src.adt import Carrier, Path, Airport, FlightGraph

def _get_airline_cabin_classes(airline_iata: str, airlines_config: dict) -> list[str]:
    """
    Determine available cabin classes for an airline based on configuration.
    
    Returns list of cabin classes in priority order (economy, premium_economy, business, first).
    """
    for category in ["4class", "2class", "1class"]:
        if airline_iata in airlines_config["airlines"].get(category, {}).get("airlines", []):
            return airlines_config["airlines"][category]["multiplier_strategy"]
    
    # Default to economy if airline not found
    return ["economy"]

def load_flight_data(filepath):
    with open(filepath, "r") as file:
        data = json.load(file)
    
    # Load airlines configuration for cabin class mapping
    base_directory = os.path.dirname(filepath)
    airlines_config_path = os.path.join(base_directory, "airlines.json")
    airlines_config = {}
    
    try:
        with open(airlines_config_path, "r") as f:
            airlines_config = json.load(f)
    except FileNotFoundError:
        # If airlines.json doesn't exist, default all to economy
        print("Warning: airlines.json not found. All flights will be economy class.")
    
    flightGraph: FlightGraph = FlightGraph()

    # O(n^3) for parsing dictionary into classes
    for key in data:
        airport_value = data[key]

        # index the keys of the airport and store as individual variables
        iata: str = airport_value["iata"]
        name: str = airport_value["name"]
        city: str = airport_value["city_name"]
        country: str = airport_value["country"]
        latitude: float = float(airport_value["latitude"] or 0.0)
        longitude: float = float(airport_value["longitude"] or 0.0)
        timezone: str = airport_value["timezone"]

        airport = Airport(
            iata,
            name,
            city,
            country,
            latitude,
            longitude,
            timezone
        )

        flightGraph.add_airport(airport)

        for path_value in airport_value["routes"]:

            carriers: list[Carrier] = []
            for c in path_value["carriers"]:
                carrier = Carrier(c["iata"], c["name"])
                carriers.append(carrier)

            src: str = airport.iata
            dest: str = path_value["iata"]
            distance: int = path_value["km"]
            duration: int = path_value["min"]
            
            # Determine cabin classes available from first airline
            available_cabins = ["economy"]
            if carriers and airlines_config:
                available_cabins = _get_airline_cabin_classes(carriers[0].iata, airlines_config)

            # Estimate flight price based on distance and duration
            if distance < 300:
                estimated_price = 100 + (distance * 0.30) + (duration * 0.40)
            elif distance < 1500:
                estimated_price = 150 + (distance * 0.22) + (duration * 0.35)
            else:
                estimated_price = 250 + (distance * 0.18) + (duration * 0.30)
            
            # Use the first available cabin class for the base route
            # If user selects different cabin class, pricing will be adjusted
            cabin_class = available_cabins[0] if available_cabins else "economy"
            
            path = Path(src, dest, carriers, distance, duration, estimated_price, cabin_class)

            flightGraph.add_path(path)

    return flightGraph





#graph = load_flight_data("data/airline_routes.json")
#print(graph.__repr__())
