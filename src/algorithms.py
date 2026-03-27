from collections import deque
import heapq  # used by Dijkstra's to implement a priority queue for selecting the smallest distance node

from src.adt import FlightGraph, Airport, Route, Path
from src.utils import calculate_haversine_distance

# BFS
def find_route_least_connections(graph: FlightGraph, start_airport: Airport, end_airport: Airport, max_routes: int = 4) -> list[Route]:
    """
    Finds multiple route options with the fewest layovers between two airports using BFS.

    Parameters:
    graph (FlightGraph): The data structure of the cleaned JSON data.
    start_airport (Airport): The starting airport object.
    end_airport (Airport): The destination airport object.
    max_routes (int): Maximum number of alternative routes to return.

    Returns:
        list[Route]: A list of route options from best (fewest stops) to less optimal.
    """

    # Extract iata from Airport class
    start_iata: str = start_airport.iata
    end_iata: str = end_airport.iata

    # Validate if iata is in graph dataset
    if not graph.has_airport(start_iata) or not graph.has_airport(end_iata):
        return []

    routes: list[Route] = []
    seen_signatures: set[tuple[tuple[str, str], ...]] = set()
    visit_count: dict[str, int] = {}

    # Initialize a queue for BFS that stores tuples of Path objects
    queue = deque([(start_iata, [start_iata], [])])

    while queue and len(routes) < max_routes:
        # Dequeue the first element
        current_iata, current_path_iatas, current_path_objects = queue.popleft()

        # Track how many times we've expanded this airport
        visit_count[current_iata] = visit_count.get(current_iata, 0) + 1

        # Stop expanding if we've visited this node enough times to satisfy max_routes
        if visit_count[current_iata] > max_routes:
            continue

        # If the destination is reached, construct and return the Route
        if current_iata == end_iata:
            signature = tuple((p.source, p.destination) for p in current_path_objects)
            
            if signature not in seen_signatures:
                seen_signatures.add(signature)
                
                total_distance = sum(path.distance_km for path in current_path_objects)
                total_duration = sum(path.duration_min for path in current_path_objects)
                total_price = sum(path.price for path in current_path_objects)
                
                route = Route(
                    distance_km=total_distance,
                    duration_min=total_duration,
                    paths=current_path_objects,
                    price=total_price
                )
                routes.append(route)
                
            continue

        # Iterate through neighbouring nodes from the current airport
        for path_obj in graph.get_neighbours(current_iata):

            # Assign route destination to local variable
            destination: str = path_obj.destination

            # Cycle Prevention: don't revisit airports already in the current path
            if destination in current_path_iatas:
                continue

            # Create a new path list appending the neighbor
            new_path_iatas = current_path_iatas + [destination]
            new_path_objects = current_path_objects + [path_obj]
            queue.append((destination, new_path_iatas, new_path_objects))

    return routes

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
def find_routes_dijkstra(graph: FlightGraph, start_airport: Airport, end_airport: Airport, mode = "shortest", max_routes: int = 4) -> list[Route]:
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

    while len(routes) < max_routes:
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
def find_routes_bellmanFord(graph: FlightGraph, start_airport: Airport, end_airport: Airport, mode="shortest", max_routes: int = 4) -> list[Route]:
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

    while len(routes) < max_routes:
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

# A* Algorithm: return multiple routes using k-Shortest Path A*
def find_routes_astar(graph: FlightGraph, start_airport: Airport, end_airport: Airport, max_routes: int = 4) -> list[Route]:
    """
    Finds multiple route options between two airports using the k-Shortest Path A* algorithm.
    This runs a single continuous A* search, allowing multiple visits to airports 
    to find alternative paths, stopping once the destination is reached `max_routes` times.
    """
    start_iata = start_airport.iata
    end_iata = end_airport.iata

    routes: list[Route] = []
    seen_signatures: set[tuple[tuple[str, str], ...]] = set()
    visit_count: dict[str, int] = {}

    # Initialise the heuristic (h_score) for the start node using Haversine distance
    h_start = calculate_haversine_distance(
        start_airport.latitude, start_airport.longitude, 
        end_airport.latitude, end_airport.longitude
    )

    # Priority queue stores tuples of:
    # (f_score, push_count, g_score, current_iata, current_route_paths)
    # push_count ensures we don't compare strings or lists if f_scores are equal
    push_count = 0
    pq: list[tuple[float, int, float, str, list[Path]]] = [(h_start, push_count, 0.0, start_iata, [])]

    while pq and len(routes) < max_routes:
        current_f, _, current_g, current_iata, current_paths = heapq.heappop(pq)

        # Track how many times we've expanded this airport
        visit_count[current_iata] = visit_count.get(current_iata, 0) + 1

        # If an airport has been expanded more times than the max routes we want,
        # we can safely stop expanding it to save time and prevent infinite loops.
        if visit_count[current_iata] > max_routes:
            continue

        # If the destination is reached, reconstruct the path from start to end
        if current_iata == end_iata:
            signature = tuple((p.source, p.destination) for p in current_paths)
            
            if signature not in seen_signatures:
                seen_signatures.add(signature)
                
                total_distance = sum(p.distance_km for p in current_paths)
                total_duration = sum(p.duration_min for p in current_paths)
                total_price = sum(p.price for p in current_paths)
                
                route = Route(
                    distance_km=total_distance,
                    duration_min=total_duration,
                    paths=current_paths,
                    price=total_price
                )
                routes.append(route)
                
            # Continue searching for the next best route; do not expand out from the destination
            continue

        # Explore all valid flight paths (neighbors) from the current airport
        for path in graph.get_neighbours(current_iata):
            neighbor_iata = path.destination

            # Cycle Prevention: don't revisit airports already in the current path
            # This prevents A -> B -> A loops
            if any(p.source == neighbor_iata for p in current_paths):
                continue

            # Calculate the exact cost to reach the neighbor (g_score)
            tentative_g = current_g + float(path.distance_km)

            # Calculate the heuristic (h_score) for the neighbor
            neighbor_airport = graph.airports[neighbor_iata]
            h_neighbor = calculate_haversine_distance(
                neighbor_airport.latitude, neighbor_airport.longitude, 
                end_airport.latitude, end_airport.longitude
            )

            # f_score = actual cost + estimated remaining cost
            f_neighbor = tentative_g + h_neighbor
            
            # Create the new path history
            new_paths = current_paths + [path]
            
            push_count += 1
            heapq.heappush(pq, (f_neighbor, push_count, tentative_g, neighbor_iata, new_paths))

    return routes
