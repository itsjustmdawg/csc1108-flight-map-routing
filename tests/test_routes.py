from src.adt import FlightGraph, Route
from src.data_loader import load_flight_data
from src.algorithms import find_route_dijkstra, find_route_least_connections, find_route_bellmanFord

def test():
    graph: FlightGraph = load_flight_data("data/airline_routes.json")

    print(graph)

    # NOTE: To use list[Route] for type safety
    # bfs_route: Route = find_route_least_connections(graph, "SIG", "CPX")
    bfs_route: Route = find_route_least_connections(graph, "SIG", "CPX")

    # NOTE: implement input validation for shortest and cheapest (fastest)
    # dijkstra_route: Route = find_route_dijkstra(graph, "SIG", "CPX", mode="shortest")
    dijkstra_route = find_route_dijkstra(graph, "SIG", "CPX", mode="shortest")

    # NOTE: Bellman-Ford alternative shortest path algorithm
    # bellman_route: Route = find_route_bellman_ford(graph, "SIG", "CPX", mode="shortest")
    bellman_route = find_route_bellmanFord(graph, "SIG", "CPX", mode="shortest")

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

    print(f"\nDjikstra (shortest) Result: {dijkstra_route}")
    # Calculate total dijkstra distance
    # NOTE: Convert to helper function
    if dijkstra_route:
        total_km: int = 0
        total_min: int = 0

        for path in dijkstra_route.paths:
            total_km += path.distance_km
            total_min += path.duration_min

        print(f"\nDijkstra algo distance: {total_km}km | Time: {total_min} minutes")

    # Calculate total bellman-ford distance
    # NOTE: Convert to helper function
    print(f"\nBellman-Ford (shortest) Result: {bellman_route}")
    if bellman_route:
        total_km: int = 0
        total_min: int = 0

        for path in bellman_route.paths:
            total_km += path.distance_km
            total_min += path.duration_min

        print(f"\nBellman-Ford algo distance: {total_km} km | Time: {total_min} minutes")

    """
    To compare whether Dijkstra and Bellman Ford gives the same total distance for "shortest (distance_km)" mode
    if dijkstra_route and bellman_route:
        print("\nComparing Dijkstra and Bellman-Ford:")
        print("Same distance:", dijkstra_route.distance_km == bellman_route.distance_km)
        print("Same duration:", dijkstra_route.duration_min == bellman_route.duration_min)
    """

"""
# For testing if algo works

if __name__ == "__main__":
    test()
"""



