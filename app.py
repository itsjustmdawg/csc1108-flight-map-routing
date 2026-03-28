import json
import webview
import os
import itertools
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

    def get_routes(self, src_code, dest_code, selected_filter, max_routes=4, cabin_class="economy", trip_type="oneway", departure_date=None, return_date=None):
        if not src_code or not dest_code:
            return {"error": "Source and destination codes are required."}

        if src_code == dest_code:
            return {"error": "Source and destination cannot be the same."}

        # Handle return trips dynamically as a 2-leg multicity trip
        if trip_type == "return":
            itinerary = [
                {"origin": src_code, "dest": dest_code, "date": departure_date},
                {"origin": dest_code, "dest": src_code, "date": return_date}
            ]
            result = self.get_multicity_routes(itinerary, selected_filter, max_routes, cabin_class)
            
            # Ensure UI still recognizes this as a 'return' trip for title display
            if result.get("ok") and result.get("routes"):
                for r in result["routes"]:
                    r["trip_type"] = "return"
            return result

        if src_code not in self.flight_graph.airports:
            return {"error": f"Source airport '{src_code}' not found."}

        if dest_code not in self.flight_graph.airports:
            return {"error": f"Destination airport '{dest_code}' not found."}

        start_airport = self.flight_graph.airports[src_code]
        end_airport = self.flight_graph.airports[dest_code]

        routes = None

        # a* with distance heuristic
        if "shortest" in selected_filter:
            routes = src.algorithms.find_routes_astar(
                self.flight_graph,
                start_airport,
                end_airport,
                max_routes=max_routes
            )

        # bellman ford with price as weight
        elif "cheap" in selected_filter:
            routes = src.algorithms.find_routes_bellmanFord(
                self.flight_graph,
                start_airport,
                end_airport,
                mode="cheapest",
                max_routes=max_routes
            )

        elif "fast" in selected_filter:
            routes = src.algorithms.find_routes_dijkstra(
                self.flight_graph,
                start_airport,
                end_airport,
                mode="fastest",
                max_routes=max_routes
            )

        elif "fewest" in selected_filter:
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
                            "leg_index": 0,
                        }
                        for p in route.paths
                    ],
                }
            )
        return {"ok": True, "error": None, "routes": serialised_routes}

    def get_multicity_routes(self, itinerary, selected_filter, max_routes=4, cabin_class="economy"):
        if not itinerary or len(itinerary) < 1:
            return {"error": "Empty itinerary"}

        segment_routes_list = []

        for segment in itinerary:
            src_code = segment.get("origin")
            dest_code = segment.get("dest")
            dep_date = segment.get("date")

            if src_code not in self.flight_graph.airports or dest_code not in self.flight_graph.airports:
                return {"error": f"Invalid airport code in segment: {src_code} -> {dest_code}"}
            
            start_airport = self.flight_graph.airports[src_code]
            end_airport = self.flight_graph.airports[dest_code]

            routes = None
            if "shortest" in selected_filter:
                routes = src.algorithms.find_routes_astar(self.flight_graph, start_airport, end_airport, max_routes=3)
            elif "cheap" in selected_filter:
                routes = src.algorithms.find_routes_bellmanFord(self.flight_graph, start_airport, end_airport, mode="cheapest", max_routes=3)
            elif "fast" in selected_filter:
                routes = src.algorithms.find_routes_dijkstra(self.flight_graph, start_airport, end_airport, mode="fastest", max_routes=3)
            elif "fewest" in selected_filter:
                routes = src.algorithms.find_route_least_connections(self.flight_graph, start_airport, end_airport, max_routes=3)
            
            if not routes:
                return {"ok": True, "routes": []}
            
            segment_routes_list.append((routes, dep_date))

        stitched_routes = []
        
        route_options_per_segment = [s[0] for s in segment_routes_list]
        dep_dates_per_segment = [s[1] for s in segment_routes_list]

        all_combinations = list(itertools.product(*route_options_per_segment))

        for combo in all_combinations:
            total_distance = sum(route.distance_km for route in combo)
            total_duration = sum(route.duration_min for route in combo)
            
            total_price = 0.0
            combined_paths = []
            
            for i, route in enumerate(combo):
                dep_date = dep_dates_per_segment[i]
                
                segment_price = route.price
                segment_price = self._apply_cabin_multiplier(segment_price, cabin_class)
                if dep_date:
                    segment_price = self._apply_weekend_multiplier(segment_price, dep_date)
                
                total_price += segment_price

                for p in route.paths:
                    path_price = self._apply_cabin_multiplier(p.price, cabin_class)
                    if dep_date:
                        path_price = self._apply_weekend_multiplier(path_price, dep_date)

                    combined_paths.append({
                        "source": p.source,
                        "destination": p.destination,
                        "distance_km": p.distance_km,
                        "duration_min": p.duration_min,
                        "price": path_price,
                        "airlines": [{"iata": c.iata, "name": c.name} for c in (p.airlines or [])],
                        "cabin_class": cabin_class,
                        "leg_index": i,
                    })

            stitched_routes.append({
                "total_distance": total_distance,
                "total_time": total_duration,
                "price": total_price,
                "cabin_class": cabin_class,
                "trip_type": "multicity",
                "paths": combined_paths
            })

        if "shortest" in selected_filter:
            stitched_routes.sort(key=lambda x: x["total_distance"])
        elif "cheap" in selected_filter:
            stitched_routes.sort(key=lambda x: x["price"])
        elif "fast" in selected_filter:
            stitched_routes.sort(key=lambda x: x["total_time"])
        elif "fewest" in selected_filter:
            stitched_routes.sort(key=lambda x: len(x["paths"]))

        return {"ok": True, "error": None, "routes": stitched_routes[:max_routes]}


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
