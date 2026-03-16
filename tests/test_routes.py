import json
from src.adt import FlightGraph, Route, Airport
from src.data_loader import load_flight_data
from src.algorithms import find_routes_dijkstra, find_route_least_connections, find_routes_bellmanFord

# Helper function to calculate route
def calculate_route_totals(route: Route) -> dict:
    total_km = 0
    total_min = 0
    total_price = 0.0

    for path in route.paths:
        total_km += path.distance_km
        total_min += path.duration_min
        total_price += path.price

    return {
        "distance_km": total_km,
        "duration_min": total_min,
        "price": total_price
    }

# Helper function to extract coordinates from Route
def route_to_airport_coordinates(route: Route, graph: FlightGraph) -> list[dict]:
    airports_data = []

    if not route.paths:
        return airports_data

    # first airport = source of first path
    start_iata = route.paths[0].source
    start_airport = graph.airports[start_iata]

    airports_data.append({
        "iata": start_airport.iata,
        "name": start_airport.name,
        "latitude": float(start_airport.latitude),
        "longitude": float(start_airport.longitude)
    })

    # remaining airports = destination of each path
    for path in route.paths:
        next_iata = path.destination
        next_airport = graph.airports[next_iata]

        airports_data.append({
            "iata": next_airport.iata,
            "name": next_airport.name,
            "latitude": float(next_airport.latitude),
            "longitude": float(next_airport.longitude)
        })

    return airports_data

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
    dijkstra_output = []
    if dijkstra_route:
        for index, route in enumerate(dijkstra_route, start=1):
            
            totals = calculate_route_totals(route)
            coordinates = route_to_airport_coordinates(route, graph)
            
            print(f"\nRoute Option {index}: {route}")
            print(
                f"Dijkstra route distance: {totals['distance_km']} km | "
                f"Time: {totals['duration_min']} minutes | "
                f"Price: ${totals['price']:.2f}"
            )

            dijkstra_output.append({
                "route_option": index,
                "algorithm": "dijkstra",
                "mode": mode,
                "summary": totals,
                "airports": coordinates
            })

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
    bellman_output = []
    if bellman_route:
        for index, route in enumerate(bellman_route, start=1):
            totals = calculate_route_totals(route)
            coordinates = route_to_airport_coordinates(route, graph)

            print(f"\nRoute Option {index}: {route}")
            print(
                f"Bellman-Ford route distance: {totals['distance_km']} km | "
                f"Time: {totals['duration_min']} minutes | "
                f"Price: ${totals['price']:.2f}"
            )

            bellman_output.append({
                "route_option": index,
                "algorithm": "bellman-ford",
                "mode": mode,
                "summary": totals,
                "airports": coordinates
            })

    else:
        print("No routes found.")

    return {
        # "BFS": bfs_output,
        "dijkstra": dijkstra_output,
        "bellman_ford": bellman_output
    }


# For testing if algo works

if __name__ == "__main__":
    result = test()
    print("\nReturned data for app.py:")
    print(json.dumps(result, indent=4))     # this allows the returned output to look like airline_routes.json
