from dataclasses import dataclass
##dataclasses
@dataclass
class Airport:
    code: str
    name: str
    city: str
    country: str
    latitude: float
    longitude: float
    timezone: str

@dataclass
class Route:
    source: str
    destination: str
    airlines: list[str]
    distance_km: float
    duration_min: int
    price: float = 0.0

class FlightGraph:
    def __init__(self):
        self.adjacency: dict[str, list[Route]] = {}

    def add_airport(self, code: str) -> list[Route]: #return list of route 
        # adds the airport as a node in the graph as a key with empty list
        pass 

    def add_route(self, route: Route) -> None: ##returns None value
        #adds directed edge between 2 airports
        #ensures both airports are nodes first then appends Route object under source airport's list
        #adds a one-way route only from source to dest.
        pass

    def get_neighbours(self, code: str) -> list[Route]: #returns list of route
        # for pathfinding given airport code
        # return all outbound routes given from airport code
        pass

    def has_airport(self, code: str) -> bool: #returns True/False if airport is found
        #validation input function
        pass

    def get_all_codes(self) -> list[str]:
        #returns all airport codes as a list
        pass

    def __repr__(self) -> str:
        #control function for print(graph)
        return 'Test'

class Queue:
    def __init__(self):
        self.rear = -1
        self.data = []

    def enqueue(self, value):
        self.data.append(value)
        self.rear += 1

    def dequeue(self):
        if self.rear == -1:
            return None
        else:
            value = self.data[0]
            del self.data[0]
            self.rear -= 1
            return value
