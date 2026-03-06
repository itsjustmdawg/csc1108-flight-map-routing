from dataclasses import dataclass

##dataclasses
@dataclass
class Airport:
    iata: str
    name: str
    city: str
    country: str
    latitude: float
    longitude: float
    timezone: str

@dataclass
class Carrier:
    iata: str
    name: str

@dataclass
class Route:
    source: str
    destination: str
    airlines: list[Carrier]
    distance_km: float
    duration_min: int
    price: float = 0.0

class FlightGraph:
    def __init__(self):
        # key: iata; value: associated airport objects
        self.airports: dict[str, Airport] = {}
        # key: iata; value: connected airports and its routes
        self.adjacency: dict[str, list[Route]] = {}


    def add_airport(self, airport: Airport) -> list[Route]:
        # adds the airport as a node in the graph as a key with empty list
        self.airports[airport.iata] = airport

        # if the airport does not have any routes to connected airports
        if  airport.iata not in self.adjacency:
            # set the routes of this airport to null
            self.adjacency[airport.iata] = []
        return self.adjacency[airport.iata]

    def add_route(self, route: Route) -> None:
        """
        Adds directed edge between 2 airports
        Ensures both airports are nodes first then appends Route object under source airport's list
        Adds a one-way route only from source to dest.
        """

        # add route to an airport that already contains at least 1 route
        if route.source in self.adjacency:
            self.adjacency[route.source].append(route)
        else:
            # set the first route of the airport if still empty
            self.adjacency[route.source] = [route]

    def get_neighbours(self, iata: str) -> list[Route]:
        # return all outbound routes given from airport code
        return self.adjacency.get(iata, [])

    def has_airport(self, iata: str) -> bool: #returns True/False if airport is found
        # validation input function
        return iata in self.airports

    def get_all_codes(self) -> list[str]:
        # returns all airport codes as a list
        return list(self.airports.keys())

    def __repr__(self) -> str:
        # test if flightgraph values are initialised
        return f"""FlightGraph contains:
        a total of {len(self.airports)} airports
        a total of {sum(len(routes) for routes in self.adjacency.values())} routes"""
