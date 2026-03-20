import json
import webview
import os
import src.data_loader
import src.algorithms


class SkyPathApi:

    def __init__(self):
        base_directory = os.path.dirname(__file__)
        self.data_path = os.path.join(base_directory, "data", "airline_routes.json")
        self.flight_graph = src.data_loader.load_flight_data(self.data_path)

    def get_airports(self):

        with open(self.data_path, "r", encoding="utf-8") as file:
            airports_data = json.load(file)

        airports = []

        def to_float(value):
            try:
                if value in (None, ""):
                    return None
                return float(value)
            except (TypeError, ValueError):
                return None

        for code, airport in airports_data.items():
            airports.append(
                {
                    "code": airport.get("iata") or code,
                    "icao": airport.get("icao") or "Unknown",
                    "country": airport.get("country") or "Unknown",
                    "name": airport.get("name") or "Unknown Airport",
                    "route_count": len(airport.get("routes") or []),
                    "latitude": to_float(airport.get("latitude")),
                    "longitude": to_float(airport.get("longitude")),
                }
            )

        airports.sort(key=lambda airport: airport["code"])
        return airports

    # def draw_route(self, src_code, dest_code):

    def get_routes(self, src_code, dest_code, selected_filter, max_routes=4):
        if not src_code or not dest_code:
            return {"error": "Source and destination codes are required."}

        if src_code == dest_code:
            return {"error": "Source and destination cannot be the same."}

        if src_code not in self.flight_graph.airports:
            return {"error": f"Source airport '{src_code}' not found."}

        if dest_code not in self.flight_graph.airports:
            return {"error": f"Destination airport '{dest_code}' not found."}

        # start_airport = self.flight_graph.airports[src_code]
        # end_airport = self.flight_graph.airports[dest_code]

        if selected_filter == "shortest":
            pass
            # a* with distance heuristic

        if selected_filter == "cheapest":
            # bellman ford with price as weight
            pass

        if selected_filter == "fastest":
            start_airport = self.flight_graph.airports[src_code]
            end_airport = self.flight_graph.airports[dest_code]
            routes = src.algorithms.find_routes_dijkstra(
                self.flight_graph,
                start_airport,
                end_airport,
                mode=selected_filter,
                max_routes=max_routes,
            )

        if selected_filter == "fewest_stops":
            # bfs
            pass

        serialised_routes = []
        for route in routes:
            serialised_routes.append(
                {
                    "total_distance": route.distance_km,
                    "total_time": route.duration_min,
                    "price": route.price,
                    "paths": [
                        {
                            "source": p.source,
                            "destination": p.destination,
                            "distance_km": p.distance_km,
                            "duration_min": p.duration_min,
                            "price": p.price,
                        }
                        for p in route.paths
                    ],
                }
            )
        return {"ok": True, "error": None, "routes": serialised_routes}


if __name__ == "__main__":

    ui_path = os.path.join(os.path.dirname(__file__), "src", "ui", "index.html")

    webview.create_window(
        title="SkyPath - Flight Route Finder",
        url=ui_path,
        js_api=SkyPathApi(),
        width=1340,
        height=800,
        resizable=True,
        min_size=(800, 600),
    )
    webview.start(debug=False)
