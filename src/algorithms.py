from collections import deque
import json
import utils
import heapq    # used by Dijkstra's to implement a priority queue for selecting the smallest distance node

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

# internal helper function for Dijkstra's Algorithm
def _reconstruct_path(prev: dict, start: str, end: str):
    """
    Reconstructs the route from start to end using the prev dictionary.
    prev[x] stores the airport we came from to reach x with the best known cost.
    We backtracked from end to start, then reverse to get the start to end.
    """
    path = [] 
    cur = end

    # Backtrack from destination to start using prev pointers
    while cur is not None:
        path.append(cur)
        cur = prev.get(cur)
    path.reverse()

    # If reconstruction doesn't start at the start node, no valid path works
    if end not in prev and end != start:
        return None
    
    return path

def find_route_dijkstra(graph, start_iata, end_iata, mode="shortest"):
    """
    Find the optimal route between two airports using Dijktra's algorithm

    Parameters:
    graph (dict): The parsed airline routes adjacency list.
    start_iata (str): The 3-letter IATA code of the starting airport.
    end_iata (str): The 3-letter IATA code of the destination airport.
    mode (str): Determines the weight type ("shortest" for km, "fastest" for minutes)

    Returns:
    list: A list of airport IATA codes representing the optimal path, or None if no path exists
    """
    if start_iata not in graph or end_iata not in graph:
        return None
    
    # Dictionary storing the shortest known distance from the start airport
    dist = {start_iata: 0.0}

    # Dictionary used to reconstruct the final path
    prev = {start_iata: None}

    # Priority Queue (pq) storing (distance, airport)
    # The airport with the smallest distance is processed first
    pq = [(0.0, start_iata)]

    # Set to track visited airports
    visited = set()

    while pq:
        # Remove current airport with the smallest distance from queue
        cur_dist, cur_airport = heapq.heappop(pq)

        # Skip if current airport is already processed
        if cur_airport in visited:
            continue
        visited.add(cur_airport)

        # If destination is reached, return the reconstructed path (to find actual route)
        if cur_airport == end_iata:
            return _reconstruct_path(prev, start_iata, end_iata)
        
        # Explore all connected airports
        for route in graph[cur_airport].get("routes", []):
            neighbour = route["iata"]

            # Determine weight based on the selected mode
            if mode == "shortest":
                weight = route["km"]
            elif mode == "fastest":
                weight = route["min"]
            
            # Calculate the new distance
            new_dist = cur_dist + weight

            # Update distance if a shorter path is foun
            if neighbour not in dist or new_dist < dist[neighbour]:
                dist[neighbour] = new_dist
                prev[neighbour] = cur_airport
            
                # Push updated distance into priority queue
                heapq.heappush(pq, (new_dist, neighbour))
    # No path found
    return None