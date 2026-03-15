from collections import deque
import heapq  # used by Dijkstra's to implement a priority queue for selecting the smallest distance node

from src.adt import FlightGraph, Airport, Route, Path
from src.utils import calculate_haversine_distance

# BFS
def find_route_least_connections(graph: FlightGraph, start_airport: Airport, end_airport: Airport) -> Route | None:
    """
    Finds the route with the fewest layovers between two airports using BFS.

    Parameters:
    graph (FlightGraph): The data structure of the cleaned JSON data.
    start_iata (str): The 3-letter IATA code of the starting airport.
    end_iata (str): The 3-letter IATA code of the destination airport.

    Returns:
    list: A list of IATA codes representing the shortest path, or None if no path exists.
    """

    # Extract iata from Airport class
    start_iata: str = start_airport.iata
    end_iata: str = end_airport.iata

    # Validate if iata is in graph dataset
    if not graph.has_airport(start_iata) or not graph.has_airport(end_iata):
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

        # Iterate through neighbouring nodes from the current airport
        for route in graph.get_neighbours(current_iata):

            # Assign route destination to local variable
            destination: str = route.destination

            # Appending relevant list to eventually meet search condition above
            if destination not in visited:

                # Append current destination to list of visited nodes
                visited.add(destination)

                # Create a new path list appending the neighbor
                queue.append((destination, current_path + [destination]))

    # Return None if the queue empties and no path is found
    return None

# Internal helper function for Dijkstra's Algorithm
def _reconstruct_path(prev_path: dict, start: str, end: str) -> Route | None:
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
    total_price = sum(path.price for path in route_paths)

    # Construct and return a Route object containing the total distance, total duration, and the list of Path objects that form the route
    return Route(
        distance_km=total_distance,
        duration_min=total_duration,
        paths=route_paths,
        price=total_price
    )


# Blocked-edge version of Dijkstra
def _find_route_dijkstra_blocked(graph: FlightGraph, start_iata: str, end_iata: str, mode="shortest", blocked_edges = None) -> Route | None:
    """
    Finds the optimal route between two airports using Dijkstra's algorithm 
    while ignoring blocked edges (edge meaning flight route between airports). (taught algorithm)

    Parameters:
    graph       (FlightGraph): The cleaned flight graph.
    start_iata  (str): The 3-letter IATA code of the starting airport.
    end_iata    (str): The 3-letter IATA code of the destination airport.
    mode        (str): "shortest" for distance, "fastest" for duration, "cheapest" for price

    Returns:
    Route | None: A list of airport IATA codes representing the optimal path, or None if no path exists.
    """

    if blocked_edges is None:
        blocked_edges = set()

    # Validate if both airports exist in the graph
    if not graph.has_airport(start_iata) or not graph.has_airport(end_iata):
        return None

    # Dictionary storing the shortest known cost from the start airport
    dist: dict[str, float] = {start_iata: 0.0}

    # Dictionary to store the Path object used to reach a given airport
    prev_path: dict[str, Path] = {}

    # Priority queue storing tuples of (current_cost, airport)
    pq: list[tuple[float, str]] = [(0.0, start_iata)]

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

            if (path.source, path.destination) in blocked_edges:
                continue

            # Determine edge weight based on selected optimisation mode
            if mode == "shortest":
                weight = float(path.distance_km)
            elif mode == "fastest":
                weight = float(path.duration_min)
            elif mode == "cheapest":
                weight = float(path.price)
            else:
                raise ValueError("mode must be 'shortest', 'fastest', or 'cheapest'")

            # Calculate new accumulated cost
            new_cost = cur_cost + weight

            # Update if a better route is found
            if new_cost < dist.get(neighbour, float("inf")):

                # Update the shortest known cost to reach the neighbouring airport
                dist[neighbour] = new_cost

                # Record the Path object used to reach this neighbour
                prev_path[neighbour] = path

                # Push the updated neighbour and its cost into the priority queue so it can be explored in future iterations
                heapq.heappush(pq, (new_cost, neighbour))

    # Return None if no path exists
    return None

# Dijkstra: return multiple routes
def find_routes_dijkstra(graph: FlightGraph, start_airport: Airport, end_airport: Airport, mode = "shortest") -> list[Route]:
    """
    Finds multiple route options between two airports using repeated Dijkstra runs.

    Parameters:
    graph       (FlightGraph): The cleaned flight graph.
    start_iata  (str): The 3-letter IATA code of the starting airport.
    end_iata    (str): The 3-letter IATA code of the destination airport.
    mode        (str): "shortest" for distance, "fastest" for duration, "cheapest" for price

    Returns:
    list[Route]: A list of route options from best to less optimal.
    """
    start_iata = start_airport.iata
    end_iata = end_airport.iata

    routes: list[Route] = []
    blocked_edges: set[tuple[str, str]] = set()
    seen_signatures: set[tuple[tuple[str, str], ...]] = set()

    while True:
        route = _find_route_dijkstra_blocked(
            graph,
            start_iata,
            end_iata,
            mode = mode,
            blocked_edges = blocked_edges
        )

        # Stop when no more routes can be found
        if route is None:
            break

        # Build a unique signature for the route
        signature = tuple((path.source, path.destination) for path in route.paths)

        # Stop if the same route appears again
        if signature in seen_signatures:
            break

        seen_signatures.add(signature)
        routes.append(route)

        # Blocked one edge from the current route to force a different alternative
        if route.paths:
            blocked_new_edge = False

            for path in route.paths:
                edge_to_block = (path.source, path.destination)

                if edge_to_block not in blocked_edges:
                    blocked_edges.add(edge_to_block)
                    blocked_new_edge = True
                    break

            if not blocked_new_edge:
                break
        else:
            break

    return routes


# Blocked-edge version of Bellman-Ford
def _find_route_bellmanFord_blocked(graph: FlightGraph, start_iata: str, end_iata: str, mode="shortest", blocked_edges = None) -> Route | None:
    """
    Finds the optimal route between two airports using the Bellman-Ford algorithm
    while ignoring blocked edges. (new algorithm)

    Parameters:
    graph       (FlightGraph): The cleaned flight graph.
    start_iata  (str): The 3-letter IATA code of the starting airport.
    end_iata    (str): The 3-letter IATA code of the destination airport.
    mode        (str): "shortest" for distance, "fastest" for duration, "cheapest" for price

    Returns:
    Route: A Route object representing the optimal path, or None if no path exists. 
    """

    if blocked_edges is None:
        blocked_edges = set()

    # Validate if both airports exists in the graph
    if not graph.has_airport(start_iata) or not graph.has_airport(end_iata):
        return None
    
    # Get all airport codes in the graph
    airports = graph.get_all_codes()

    # Dictionary storing the shortest known cost from the start airport
    dist: dict[str, float] = {iata: float("inf") for iata in airports}
    dist[start_iata] = 0.0

    # Dictionary storing the Path object used to reach each airport
    prev_path: dict[str, Path] = {}

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

                if (path.source, path.destination) in blocked_edges:
                    continue

                neighbour = path.destination

                # Determine edge weight based on selected mode
                if mode == "shortest":
                    weight = float(path.distance_km)
                elif mode == "fastest":
                    weight = float(path.duration_min)
                elif mode == "cheapest":
                    weight = float(path.price)
                else:
                    raise ValueError("mode must be 'shortest', 'fastest', or 'cheapest'")

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

            if (path.source, path.destination) in blocked_edges:
                continue

            neighbour = path.destination

            if mode == "shortest":
                weight = float(path.distance_km)
            elif mode == "fastest":
                weight = float(path.duration_min)
            elif mode == "cheapest":
                weight = float(path.price)
            else:
                raise ValueError("mode must be 'shortest', 'fastest', or 'cheapest'")

            if dist[airport] + weight < dist.get(neighbour, float("inf")):
                raise ValueError("Graph contains a negative-weight cycle")

    # If destination was never reached, return None
    if end_iata != start_iata and end_iata not in prev_path:
        return None

    # Reconstruct and return the final Route object
    return _reconstruct_path(prev_path, start_iata, end_iata)

# Bellman-Ford: returns multiple routes
def find_routes_bellmanFord(graph: FlightGraph, start_airport: Airport, end_airport: Airport, mode="shortest") -> list[Route]:
    """
    Finds multiple optimal route between two airports using the Bellman-Ford algorithm.

    Parameters:
    graph       (FlightGraph): The cleaned flight graph.
    start_iata  (str): The 3-letter IATA code of the starting airport.
    end_iata    (str): The 3-letter IATA code of the destination airport.
    mode        (str): "shortest" for distance, "fastest" for duration, "cheapest" for price

    Returns:
    list[Route]: A list of route options from best to less optimal. 
    """
    start_iata = start_airport.iata
    end_iata = end_airport.iata
    routes: list[Route] = []
    blocked_edges: set[tuple[str, str]] = set()
    seen_signatures: set[tuple[tuple[str, str], ...]] = set()

    while True:
        route = _find_route_bellmanFord_blocked(
            graph,
            start_iata,
            end_iata,
            mode=mode,
            blocked_edges=blocked_edges
        )
        # Stop when no more routes can be found
        if route is None:
            break
        
        # Build a unique signature for the route
        signature = tuple((p.source, p.destination) for p in route.paths)

        # Stop if the same route appears again
        if signature in seen_signatures:
            break

        seen_signatures.add(signature)
        routes.append(route)

        # block one edge to force alternative route
        if route.paths:
            blocked_new_edge = False

            for path in route.paths:
                edge_to_block = (path.source, path.destination)

                if edge_to_block not in blocked_edges:
                    blocked_edges.add(edge_to_block)
                    blocked_new_edge = True
                    break

            if not blocked_new_edge:
                break
        else:
            break

    return routes

# Internal helper function for A* Algorithm
def _find_route_astar_blocked(graph: FlightGraph, start_airport: Airport, end_airport: Airport, blocked_edges: set) -> Route | None:
    """
    Finds the optimal route between two airports using the A* algorithm
    while ignoring blocked edges.
    """
    if blocked_edges is None:
        blocked_edges = set()

    start_iata = start_airport.iata
    end_iata = end_airport.iata

    # Initialise the heuristic (h_score) for the start node using Haversine distance to the destination
    # h(n) = distance from node n to target
    h_start = calculate_haversine_distance(start_airport.latitude, start_airport.longitude, end_airport.latitude, end_airport.longitude)

    # Priority queue stores tuples of (f_score, iata_code)
    # f_score = g_score + h_score. We order the queue by f_score to explore the most promising paths first.
    pq = [(h_start, start_iata)]

    # Dictionary storing the cheapest cost from start to a node (g_score)
    # Default is infinity, start node is 0
    g_score: dict[str, int | float] = { start_iata: 0 }

    # Dictionary storing the Path object used to reach each airport (used for reconstructing the route later)
    prev_path = {}

    # Set to keep track of visited nodes to avoid processing them multiple times (optimization for consistent heuristics)
    visited = set()

    while pq:
        # Pop the node with the lowest f_score from the priority queue
        current_f, current_iata = heapq.heappop(pq)

        # If the destination is reached, reconstruct the path from start to end
        if current_iata == end_iata:
            route = _reconstruct_path(prev_path, start_iata, end_iata)
            if route:
                # As requested, force the price to 0.0 for now
                route.price = 0.0
            return route

        # Optimization: If we have already visited (expanded) this node, skip it
        if current_iata in visited:
            continue
        visited.add(current_iata)

        # Get the g_score of the current node
        current_g = g_score.get(current_iata, float('inf'))

        # Explore all valid flight paths (neighbors) from the current airport
        for path in graph.get_neighbours(current_iata):
            neighbor_iata = path.destination

            # Skip this path if it is in the blocked_edges set (used for finding alternative routes)
            if (path.source, path.destination) in blocked_edges:
                continue

            # Calculate the tentative g_score (current cost + distance of this flight segment)
            tentative_g = current_g + path.distance_km

            # If this path is better than any previously known path to the neighbor
            if tentative_g < g_score.get(neighbor_iata, float('inf')):
                # Update the g_score for the neighbor
                g_score[neighbor_iata] = tentative_g
                # Record the path used to reach this neighbor for reconstruction
                prev_path[neighbor_iata] = path

                # Calculate the heuristic (h_score) for the neighbor: distance from neighbor to destination
                neighbor_airport = graph.airports[neighbor_iata]
                h_neighbor = calculate_haversine_distance(neighbor_airport.latitude, neighbor_airport.longitude, end_airport.latitude, end_airport.longitude)

                # Calculate f_score = g_score + h_score
                f_neighbor = tentative_g + h_neighbor

                # Add the neighbor to the priority queue with its new f_score
                heapq.heappush(pq, (f_neighbor, neighbor_iata))

    # Return None if no path is found
    return None

# A* Algorithm: return multiple routes
def find_routes_astar(graph: FlightGraph, start_airport: Airport, end_airport: Airport) -> list[Route]:
    """
    Finds a list of all available routes from the best Route to the worst using the A* algorithm.
    It repeatedly finds the shortest path and then blocks an edge to find the next best alternative.
    """
    routes = []
    blocked_edges = set()
    seen_signatures = set()

    while True:
        # Attempt to find the optimal route given the current set of blocked edges
        route = _find_route_astar_blocked(graph, start_airport, end_airport, blocked_edges)

        # If no route is found, we have exhausted all options
        if route is None:
            break

        # Create a unique signature for the route based on the sequence of flight paths
        # This helps in detecting if we found a duplicate route (e.g. via different internal calculations)
        signature = tuple((p.source, p.destination) for p in route.paths)

        if signature in seen_signatures:
            break

        seen_signatures.add(signature)
        routes.append(route)

        # Block the last edge of the current route to force the algorithm to find a different path in the next iteration
        if route.paths:
            # We block the tuple (source, destination) of the last path segment
            edge_to_block = (route.paths[-1].source, route.paths[-1].destination)
            blocked_edges.add(edge_to_block)
        else:
            break

    # Return the list of found routes, sorted from best to worst
    return routes
