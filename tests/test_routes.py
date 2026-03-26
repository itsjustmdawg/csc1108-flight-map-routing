from src.adt import FlightGraph, Route, Airport
from src.data_loader import load_flight_data
from src.algorithms import find_routes_dijkstra, find_route_least_connections, find_routes_bellmanFord

def print_route(route: Route, graph: FlightGraph):
    """
    Prints the airports in a route with coordinates.
    """
    if not route.paths:
        print("Empty route")
        return

    airports = [route.paths[0].source]

    for path in route.paths:
        airports.append(path.destination)

    # Print route path
    print(" -> ".join(airports))

    # Print coordinates for each airport
    print("Coordinates:")
    for code in airports:
        airport = graph.airports[code]
        print(f"{code}: ({airport.latitude}, {airport.longitude})")

    print("\nAirlines:")
    for path in route.paths:
        if path.airlines:
            airline_names = [airline.name for airline in path.airlines]
        else:
            airline_names = ["Unknown"]

        print(f"{path.source} -> {path.destination}: {', '.join(airline_names)}")

    print(
        f"Distance: {route.distance_km} km | "
        f"Time: {route.duration_min} min | "
        f"Price: ${route.price:.2f}"
    )

def test():
    graph: FlightGraph = load_flight_data("data/airline_routes.json")

    start_airport: Airport = graph.airports["AAE"]
    end_airport: Airport = graph.airports["CDG"]

    print(graph)

    # Choose optimisation mode: shortest, fastest, cheapest
    mode = "shortest"

    print(f"\nOptimisation Mode: {mode.upper()}")

    """         
    # NOTE: To use list[Route] for type safety
    # bfs_route: Route = find_route_least_connections(graph, "SIG", "CPX")
    bfs_route: list[Route] | None = find_route_least_connections(graph, start_airport, end_airport)
    """

    # NOTE: implement input validation for shortest and cheapest (fastest)
    # dijkstra_route: Route = find_route_dijkstra(graph, "SIG", "CPX", mode=mode)
    dijkstra_routes: list[Route] = find_routes_dijkstra(graph, start_airport, end_airport, mode=mode)

    # NOTE: Bellman-Ford alternative shortest path algorithm
    # bellman_route: Route = find_route_bellmanFord(graph, "SIG", "CPX", mode=mode)
    bellman_routes: list[Route] = find_routes_bellmanFord(graph, start_airport, end_airport, mode=mode)

    """
    print(f"BFS Result: {bfs_route}")
    # Calculate total bfs distance
    # NOTE: Convert to helper function
    if bfs_route:
        total_km: int = 0
        total_min: int = 0

        for path in bfs_route.paths:
            total_km += path.distance_km
            total_min += path.duration_min
        print(f"\nBFS algo distance: {total_km}km | Time: {total_min} minutes")
    """

    """
    print(f"\nDjikstra (shortest) Result: {dijkstra_route}")
    # Calculate total dijkstra distance
    # NOTE: Convert to helper function
    if dijkstra_route:
        total_km: int = 0
        total_min: int = 0
        total_price: float = 0

        for path in dijkstra_route.paths:
            total_km += path.distance_km
            total_min += path.duration_min
            total_price += path.price

        print(f"\nDijkstra algo distance: {total_km}km | Time: {total_min} minutes | Price: ${total_price:.2f}")
    """
        
    print(f"\nNumber of Dijkstra routes found: {len(dijkstra_routes)}")
    print("\nDijkstra Routes:")
    for i, route in enumerate(dijkstra_routes, start=1):
        print(f"\nRoute {i}:")
        print_route(route, graph)
    
    """
    # Calculate total bellman-ford distance
    # NOTE: Convert to helper function
    print(f"\nBellman-Ford (shortest) Result: {bellman_route}")
    if bellman_route:
        total_km: int = 0
        total_min: int = 0
        total_price: float = 0

        for path in bellman_route.paths:
            total_km += path.distance_km
            total_min += path.duration_min
            total_price += path.price

        print(f"\nBellman-Ford algo distance: {total_km} km | Time: {total_min} minutes | Price: ${total_price:.2f}")
    """
    print(f"\nNumber of Bellman-Ford routes found: {len(bellman_routes)}")
    print("\nBellman-Ford Routes:")
    for i, route in enumerate(bellman_routes, start=1):
        print(f"\nRoute {i}:")
        print_route(route, graph)


# For testing if algo works

if __name__ == "__main__":
    test()

