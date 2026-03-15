from src.adt import FlightGraph, Route, Airport
from src.data_loader import load_flight_data
from src.algorithms import find_routes_dijkstra, find_route_least_connections, find_routes_bellmanFord

def test():
    graph: FlightGraph = load_flight_data("data/airline_routes.json")

    start_airport: Airport = graph.airports["SIG"]
    end_airport: Airport = graph.airports["CPX"]

    print(graph)

    # Choose optimisation mode: shortest, fastest, cheapest
    mode = "shortest"

    print(f"\nOptimisation Mode: {mode.upper()}")

    # NOTE: To use list[Route] for type safety
    # bfs_route: Route = find_route_least_connections(graph, "SIG", "CPX")
    bfs_route: list[Route] | None = find_route_least_connections(graph, start_airport, end_airport)

    # NOTE: implement input validation for shortest and cheapest (fastest)
    # dijkstra_route: Route = find_route_dijkstra(graph, "SIG", "CPX", mode=mode)
    dijkstra_route: list[Route] = find_routes_dijkstra(graph, start_airport, end_airport, mode=mode)

    # NOTE: Bellman-Ford alternative shortest path algorithm
    # bellman_route: Route = find_route_bellmanFord(graph, "SIG", "CPX", mode=mode)
    bellman_route: list[Route] = find_routes_bellmanFord(graph, start_airport, end_airport, mode=mode)

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
        
    print(f"\Dijkstra Multiple Routes ({mode}) Result:")
    if dijkstra_route:
        for index, route in enumerate(dijkstra_route, start=1):
            print(f"\nRoute Option {index}: {route}")

            total_km: int = 0
            total_min: int = 0
            total_price: float = 0

            for path in route.paths:
                total_km += path.distance_km
                total_min += path.duration_min
                total_price += path.price

            print(f"Bellman-Ford route distance: {total_km} km | Time: {total_min} minutes | Price: ${total_price:.2f}")
    else:
        print("No routes found.")
    
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
    print(f"\nBellman-Ford Multiple Routes ({mode}) Result:")
    if bellman_route:
        for index, route in enumerate(bellman_route, start=1):
            print(f"\nRoute Option {index}: {route}")

            total_km: int = 0
            total_min: int = 0
            total_price: float = 0

            for path in route.paths:
                total_km += path.distance_km
                total_min += path.duration_min
                total_price += path.price

            print(f"Bellman-Ford route distance: {total_km} km | Time: {total_min} minutes | Price: ${total_price:.2f}")
    else:
        print("No routes found.")


# For testing if algo works

if __name__ == "__main__":
    test()

