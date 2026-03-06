from src.adt import FlightGraph, Route
from src.data_loader import load_flight_data
from src.algorithms import find_route_dijkstra, find_route_least_connections

def test():
    graph: FlightGraph = load_flight_data("data/airline_routes.json")

    print(graph)

    # NOTE: To use list[Route] for type safety
    # bfs_route: Route = find_route_least_connections(graph, "SIG", "CPX")
    bfs_route: Route = find_route_least_connections(graph, "SIG", "CPX")

    # NOTE: implement input validation for shortest and cheapest
    # dijkstra_route: Route = find_route_dijkstra(graph, "SIG", "CPX", mode="shortest")
    dijkstra_route = find_route_dijkstra(graph, "SIG", "CPX", mode="shortest")

    print(f"BFS Result: {bfs_route}")
    # Calculate total dijkstra distance
    # NOTE: Convert to helper function
    if bfs_route:
        total_km: int = 0
        total_min: int = 0

        for path in bfs_route.paths:
            total_km += path.distance_km
            total_min += path.duration_min
        print(f"\nBFS algo distance: {total_km}km | Time: {total_min} minutes")

    print(f"Djikstra (shortest) Result: {dijkstra_route}")
    # Calculate total dijkstra distance
    # NOTE: Convert to helper function
    if dijkstra_route:
        total_km: int = 0
        total_min: int = 0

        for path in dijkstra_route.paths:
            total_km += path.distance_km
            total_min += path.duration_min

        print(f"\nDijkstra algo distance: {total_km}km | Time: {total_min} minutes")






