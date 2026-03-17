import json
import webview
import os
from tests.test_routes import test

class SkyPathApi:
    def get_airports(self):
        data_path = os.path.join(os.path.dirname(__file__), "data", "airline_routes.json")

        with open(data_path, "r", encoding="utf-8") as file:
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

if __name__ == '__main__':

    ui_path = os.path.join(os.path.dirname(__file__), "src", "ui", "index.html")

    # test()

    webview.create_window(
        title = 'SkyPath - Flight Route Finder',
        url= ui_path,
        js_api=SkyPathApi(),
        width=1340,
        height=800,
        resizable=True,
        min_size=(800, 600) 
    )
    webview.start(debug=False)
