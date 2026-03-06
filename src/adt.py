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

"""
Path refers to the Airport-to-Airport path

Example:
Path 1: Singapore -> Korea
Path 2: Korea -> Japan
Path 3: Japan -> UK
"""
@dataclass
class Path:
    source: str
    destination: str
    airlines: list[Carrier]
    distance_km: int
    duration_min: int
    price: float = 0.0

"""
Route refers to the Start and End Destination Route
It comprises of a list of Path objects to form the Route

Using the Path Example:

The route is:
Route: Singapore(Start) -> UK(End)

Instead of:
Path 1: Singapore -> Korea
Path 2: Korea -> Japan
Path 3: Japan -> UK
"""
@dataclass
class Route:
    distance_km: int
    duration_min: int
    paths: list[Path]

class FlightGraph:
    def __init__(self):
        # key: iata; value: associated airport objects
        self.airports: dict[str, Airport] = {}
        # key: iata; value: connected airports and its Paths
        self.adjacency: dict[str, list[Path]] = {}

    def add_airport(self, airport: Airport) -> list[Path]:
        # adds the airport as a node in the graph as a key with empty list
        self.airports[airport.iata] = airport

        # if the airport does not have any Paths to connected airports
        if  airport.iata not in self.adjacency:
            # set the Paths of this airport to null
            self.adjacency[airport.iata] = []
        return self.adjacency[airport.iata]

    def add_path(self, path: Path) -> None:
        """
        Adds directed edge between 2 airports
        Ensures both airports are nodes first then appends Path object under source airport's list
        Adds a one-way Path only from source to dest.
        """

        # add path to an airport that already contains at least 1 path
        if path.source in self.adjacency:
            self.adjacency[path.source].append(path)
        else:
            # set the first path of the airport if still empty
            self.adjacency[path.source] = [path]

    def get_neighbours(self, iata: str) -> list[Path]:
        # return all outbound Paths given from airport code
        return self.adjacency.get(iata, [])

    def has_airport(self, iata: str = "", airport: Airport | None = None) -> bool: #returns True/False if airport is found
        # if both iata and airport is provided
        if airport and iata != "":
            # return false if they are not the same
            if airport.iata != iata:
                return False

        if iata != "":
            return iata in self.airports

        if airport:
            return airport.iata in self.airports

        return False

    def get_all_codes(self) -> list[str]:
        # returns all airport codes as a list
        return list(self.airports.keys())

    def __repr__(self) -> str:
        # test if flightgraph values are initialised
        return f"""FlightGraph contains:
        a total of {len(self.airports)} airports
        a total of {sum(len(paths) for paths in self.adjacency.values())} flight paths"""

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
