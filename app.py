import webview
import os

if __name__ == '__main__':

    ui_path = os.path.join(os.path.dirname(__file__), "src", "ui", "index.html")

    webview.create_window(
        title = 'SkyPath - Flight Route Finder',
        url= ui_path,
        width=1340,
        height=800,
        resizable=True,
        min_size=(800, 600) 
    )
    webview.start(debug=False)