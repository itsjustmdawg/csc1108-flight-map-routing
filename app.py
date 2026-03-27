import json
import webview
import os
from datetime import datetime
import src.data_loader
import src.algorithms


class SkyPathApi:

    def __init__(self):
        base_directory = os.path.dirname(__file__)
        self.data_path = os.path.join(base_directory, "data", "airline_routes.json")
        self.airlines_path = os.path.join(base_directory, "data", "airlines.json")
        self.flight_graph = src.data_loader.load_flight_data(self.data_path)
        self.airlines_config = self._load_airlines_config()

    def _load_airlines_config(self):
        """Load cabin class configuration."""
        try:
            with open(self.airlines_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            return {"cabin_classes": {}, "airlines": {}}

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

    def _is_weekend(self, date_str: str) -> bool:
        """
        Check if a date falls on a weekend (Saturday=5, Sunday=6).
        Date format: 'YYYY-MM-DD'
        """
        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            return date_obj.weekday() >= 5  # 5=Saturday, 6=Sunday
        except ValueError:
            return False

    def _apply_cabin_multiplier(self, base_price: float, cabin_class: str) -> float:
        """Apply cabin class pricing multiplier."""
        cabin_config = self.airlines_config.get("cabin_classes", {})
        multiplier = cabin_config.get(cabin_class, {}).get("multiplier", 1.0)
        return base_price * multiplier

    def _apply_weekend_multiplier(self, price: float, departure_date: str) -> float:
        """Apply 1.2x multiplier if departure date is a weekend."""
        if self._is_weekend(departure_date):
            return price * 1.2
        return price

    def get_routes(self, src_code, dest_code, selected_filter, max_routes=4, cabin_class="economy", trip_type="oneway", departure_date=None):
        if not src_code or not dest_code:
            return {"error": "Source and destination codes are required."}

        if src_code == dest_code:
            return {"error": "Source and destination cannot be the same."}

        if src_code not in self.flight_graph.airports:
            return {"error": f"Source airport '{src_code}' not found."}

        if dest_code not in self.flight_graph.airports:
            return {"error": f"Destination airport '{dest_code}' not found."}

        start_airport = self.flight_graph.airports[src_code]
        end_airport = self.flight_graph.airports[dest_code]

        routes = None

        # a* with distance heuristic
        if selected_filter == "shortest":
            routes = src.algorithms.find_routes_astar(
                self.flight_graph,
                start_airport,
                end_airport,
                max_routes=max_routes
            )

        # bellman ford with price as weight
        if selected_filter == "cheapest":
            routes = src.algorithms.find_routes_bellmanFord(
                self.flight_graph,
                start_airport,
                end_airport,
                mode=selected_filter,
                max_routes=max_routes
            )

        if selected_filter == "fastest":
            routes = src.algorithms.find_routes_dijkstra(
                self.flight_graph,
                start_airport,
                end_airport,
                mode=selected_filter,
                max_routes=max_routes
            )

        if selected_filter == "fewest_stops":
            # bfs
            routes = src.algorithms.find_route_least_connections(
                self.flight_graph,
                start_airport,
                end_airport,
                max_routes=max_routes
            )

        # Handle case where no routes are found
        if routes is None:
            routes = []

        serialised_routes = []
        for route in routes:
            # Apply cabin class and weekend multipliers to route price
            route_price = route.price
            route_price = self._apply_cabin_multiplier(route_price, cabin_class)
            if departure_date:
                route_price = self._apply_weekend_multiplier(route_price, departure_date)
            
            # For return trips, apply multipliers again (double the price)
            if trip_type == "return" and departure_date:
                route_price *= 2
            
            serialised_routes.append(
                {
                    "total_distance": route.distance_km,
                    "total_time": route.duration_min,
                    "price": route_price,
                    "cabin_class": cabin_class,
                    "trip_type": trip_type,
                    "paths": [
                        {
                            "source": p.source,
                            "destination": p.destination,
                            "distance_km": p.distance_km,
                            "duration_min": p.duration_min,
                            "price": self._apply_cabin_multiplier(p.price, cabin_class),
                            "airlines": [
                                {"iata": carrier.iata, "name": carrier.name}
                                for carrier in (p.airlines or [])
                            ],
                            "cabin_class": cabin_class,
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
