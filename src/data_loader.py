import json

from src.adt import Carrier, Path, Airport, FlightGraph

def load_flight_data(filepath):
    with open(filepath, "r") as file:
        data = json.load(file)

    flightGraph: FlightGraph = FlightGraph()

    # O(n^3) for parsing dictionary into classes
    for key in data:
        airport_value = data[key]

        # index the keys of the airport and store as individual variables
        iata: str = airport_value["iata"]
        name: str = airport_value["name"]
        city: str = airport_value["city_name"]
        country: str = airport_value["country"]
        latitude: float = airport_value["latitude"]
        longitude: float = airport_value["longitude"]
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

            path = Path(src, dest, carriers, distance, duration)

            flightGraph.add_path(path)

    return flightGraph




#graph = load_flight_data("data/airline_routes.json")
#print(graph.__repr__())
