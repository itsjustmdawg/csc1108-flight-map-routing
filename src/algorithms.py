from collections import deque
import heapq  # used by Dijkstra's to implement a priority queue for selecting the smallest distance node

from src.adt import FlightGraph, Route, Path

# BFS
def find_route_least_connections(graph: FlightGraph, start_iata: str, end_iata:str) -> Route | None:

    """
    Finds the route with the fewest layovers between two airports using BFS.

    Parameters:
    graph       (dict): The parsed airline routes adjacency list.
    start_iata  (str):  The 3-letter IATA code of the starting airport.
    end_iata    (str):  The 3-letter IATA code of the destination airport.

    Returns:
    list: A list of IATA codes representing the shortest path, or None if no path exists.
    """

    # Validate if iata is in graph dataset
    if not graph.has_airport(start_iata) or not graph.has_airport(end_iata):
        return None

    # Initialize a queue for BFS that stores tuples containing the current airport and the path taken to reach it.
    queue = deque([(start_iata, [start_iata])])

    # Set to keep track of visited airports to prevent infinite loops
    visited = {start_iata}

    # Dictionary to store the Path object used to reach each airport
    prev_path = {}

    while queue:
        # Dequeue the first element
        current_iata, current_path = queue.popleft()

        # If the destination is reached, return the path
        if current_iata == end_iata:
            return _reconstruct_path(prev_path, start_iata, end_iata)

        # Iterate through all outgoing flights from the current airport
        # Using the specific 'routes' list structure from your JSON
        for path in graph.get_neighbours(current_iata):
            neighbor_iata = path.destination

            # If the neighbor hasn't been visited, add it to the queue
            if neighbor_iata not in visited:
                visited.add(neighbor_iata)
                prev_path[neighbor_iata] = path
                # Create a new path list appending the neighbor
                queue.append((neighbor_iata, current_path + [neighbor_iata]))

    # Return None if the queue empties and no path is found
    return None


# Internal helper function for Dijkstra's Algorithm
def _reconstruct_path(prev_path: dict, start: str, end: str):
    """
    Reconstructs the route from start to end using the prev dictionary.

    prev[x] stores the airport we came from to reach x with the best known cost.
    We backtrack from end to start, then reverse the result to get start to end.
    """
    # Initialise a list to store the Path objects that makes up the final route
    route_paths = []
    # Start backtracking from the destination airport
    cur = end

    # Backtrack from destination to starting airport using prev_path
    # prev_path[x] stores the Path object used to reach airport xxx
    while cur != start:

        # Retrieve the Path object that led to the current airport
        path = prev_path.get(cur)

        # If no path exists, the route reconstruction fails
        if path is None:
            return None
        
        # Add the Path object to the route list
        route_paths.append(path)

        # Move backwards to the previous airport in the route
        cur = path.source

    # The paths were collected from destination to start, 
    # so reverse the list to obtain the correct order: start to destination
    route_paths.reverse()

    # Calculate the total distance and duration of the route by summing the distance and duration of each Path
    total_distance = sum(path.distance_km for path in route_paths)
    total_duration = sum(path.duration_min for path in route_paths)

    # Construct and return a Route object containing the total distance, total duration, and the list of Path objects that form the route
    return Route(
        distance_km=total_distance,
        duration_min=total_duration,
        paths=route_paths
    )


# Dijkstra
def find_route_dijkstra(graph: FlightGraph, start_iata: str, end_iata: str, mode="shortest") -> Route | None:
    """
    Finds the optimal route between two airports using Dijkstra's algorithm. (taught algorithm)

    Parameters:
    graph       (FlightGraph): The cleaned flight graph.
    start_iata  (str): The 3-letter IATA code of the starting airport.
    end_iata    (str): The 3-letter IATA code of the destination airport.
    mode        (str): "shortest" for distance, "fastest" for duration

    Returns:
    list: A list of airport IATA codes representing the optimal path, or None if no path exists.
    """
    # Validate if both airports exist in the graph
    if not graph.has_airport(start_iata) or not graph.has_airport(end_iata):
        return None

    # Dictionary storing the shortest known cost from the start airport
    dist = {start_iata: 0}

    # Dictionary used to reconstruct the final path
    prev = {start_iata: None}

    # Dictionary to store the Path object used to reach a given airport
    prev_path = {}

    # Priority queue storing tuples of (current_cost, airport)
    pq = [(0, start_iata)]

    while pq:
        # Remove the airport with the smallest known cost from the priority queue
        cur_cost, cur_airport = heapq.heappop(pq)

        # Skip outdated queue entries in priority queue. This happens if a shorter path to this airport was already discovered earlier
        if cur_cost != dist.get(cur_airport, float("inf")):
            continue

        # If destination is reached, return the reconstructed path (final route)
        if cur_airport == end_iata:
            return _reconstruct_path(prev_path, start_iata, end_iata)

        # Explore all neighbouring airports
        for path in graph.get_neighbours(cur_airport):

            # Get the destination airport code of the neighbouring airport
            neighbour = path.destination

            # Determine edge weight based on selected optimisation mode
            if mode == "shortest":
                weight = path.distance_km
            elif mode == "fastest":
                weight = path.duration_min
            else:
                raise ValueError("mode must be 'shortest' or 'fastest'")

            # Calculate new accumulated cost
            new_cost = cur_cost + weight

            # Update if a better route is found
            if new_cost < dist.get(neighbour, float("inf")):

                # Update the shortest known cost to reach the neighbouring airport
                dist[neighbour] = new_cost

                # Record the previous airport used to reach this neighbour
                prev[neighbour] = cur_airport

                # Record the Path object used to reach this neighbour
                prev_path[neighbour] = path

                # Push the updated neighbour and its cost into the priority queue so it can be explored in future iterations
                heapq.heappush(pq, (new_cost, neighbour))

    # Return None if no path exists
    return None

def find_route_bellmanFord(graph: FlightGraph, start_iata: str, end_iata: str, mode="shortest"):
    """
    Finds the optimal route between two airports using the Bellman-Ford algorithm. (new algorithm)
    
    Parameters:
    graph       (FlightGraph): The cleaned flight graph.
    start_iata  (str): The 3-letter IATA code of the starting airport.
    end_iata    (str): The 3-letter IATA code of the destination airport.
    mode        (str): "shortest" for distance, "fastest" for duration

    Returns:
    Route: A Route object representing the optimal path, or None if no path exists. 
    """
    # Validate if both airports exists in the graph
    if not graph.has_airport(start_iata) or not graph.has_airport(end_iata):
        return None
    
    # Get all airport codes in the graph
    airports = graph.get_all_codes()

    # Dictionary storing the shortest known cost from the start airport
    dist = {iata: float("inf") for iata in airports}
    dist[start_iata] = 0

    # Dictionary storing the Path object used to reach each airport
    prev_path = {}

    # Relax all paths V - 1 times (for Bellman Ford's algorithm, we go through each airport and outgoing path to try to improve the shortest path)
    for _ in range(len(airports) - 1):
        updated = False     # Track whether any distance was updated

        # Iterate through every airport in the graph
        for airport in airports:

            # Skip unreachable airports
            if dist[airport] == float("inf"):
                continue

            # Explore all outgoing paths from the current airport
            for path in graph.get_neighbours(airport):
                neighbour = path.destination

                # Determine edge weight based on selected mode
                if mode == "shortest":
                    weight = path.distance_km
                elif mode == "fastest":
                    weight = path.duration_min
                else:
                    raise ValueError("mode must be 'shortest' or 'fastest'")
                
                # Calculate the new cost through the current airport
                new_cost = dist[airport] + weight

                # Update if a better route is found
                if new_cost < dist.get(neighbour, float("inf")):
                    dist[neighbour] = new_cost
                    prev_path[neighbour] = path
                    updated = True
            
        # Stop early if no updates were made in this round
        if not updated:
            break

    # Optimal negative cycles detection
    for airport in airports:
        if dist[airport] == float("inf"):
            continue

        for path in graph.get_neighbours(airport):
            neighbour = path.destination

            if mode == "shortest":
                weight = path.distance_km
            else:
                weight = path.duration_min

            if dist[airport] + weight < dist.get(neighbour, float("inf")):
                raise ValueError("Graph contains a negative-weight cycle")
            
    # If destination was never reached, return None
    if end_iata != start_iata and end_iata not in prev_path:
        return None

    # Reconstruct and return the final Route object
    return _reconstruct_path(prev_path, start_iata, end_iata)
