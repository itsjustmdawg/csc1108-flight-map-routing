import json

from adt import Carrier, Route, Airport, FlightGraph

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

        for route_value in airport_value["routes"]:

            carriers: list[Carrier] = []
            for c in route_value["carriers"]:
                carrier = Carrier(c["iata"], c["name"])
                carriers.append(carrier)

            src: str = airport.iata
            dest: str = route_value["iata"]
            distance: float = route_value["km"]
            duration: int = route_value["min"]

            route = Route(src, dest, carriers, distance, duration)

            flightGraph.add_route(route)

    return flightGraph




graph = load_flight_data("data/airline_routes.json")
print(graph.__repr__())
