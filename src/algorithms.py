from collections import deque
import json
import utils


def find_route_least_connections(graph, start_iata, end_iata):
    """
    Finds the route with the fewest layovers between two airports using BFS.
    
    Parameters:
    graph (dict): The parsed airline routes adjacency list.
    start_iata (str): The 3-letter IATA code of the starting airport.
    end_iata (str): The 3-letter IATA code of the destination airport.
    
    Returns:
    list: A list of IATA codes representing the shortest path, or None if no path exists.
    """
    
    # Validate if iata is in graph dataset
    if start_iata not in graph or end_iata not in graph:
        return None

    # Initialize a queue for BFS that stores tuples containing the current airport and the path taken to reach it.
    queue = deque([(start_iata, [start_iata])])
    
    # Set to keep track of visited airports to prevent infinite loops
    visited = {start_iata}

    while queue:
        # Dequeue the first element
        current_iata, current_path = queue.popleft()

        # If the destination is reached, return the path
        if current_iata == end_iata:
            return current_path

        # Iterate through all outgoing flights from the current airport
        # Using the specific 'routes' list structure from your JSON
        for route in graph[current_iata].get('routes', []):
            neighbor_iata = route['iata']

            # If the neighbor hasn't been visited, add it to the queue
            if neighbor_iata not in visited:
                visited.add(neighbor_iata)
                # Create a new path list appending the neighbor
                queue.append((neighbor_iata, current_path + [neighbor_iata]))

    # Return None if the queue empties and no path is found
    return None
