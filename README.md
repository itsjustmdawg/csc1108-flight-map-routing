# Project Directory

```text
flight-routing-project/
# Project Directory

```text
flight-routing-project/
├── data/
│   └── airline_routes.json   # Your Jonty dataset
├── src/
│   ├── data_loader.py        # Logic to open JSON and convert strings to floats
│   ├── algorithms.py         # A* and BFS logic
│   ├── models.py             # Airport and Flight classes
│   └── utils.py              # Haversine distance calculator
├── app.py                    # Streamlit/Folium UI
└── requirements.txt
```

## Prerequisites

1. Install **Python 3.10+** and make sure `python` and `pip` are available in your terminal.
2. Install the **pre-release** version of `pythonnet`:

  ```bash
  pip install --pre pythonnet
  ```

3. Install **pywebview**:

  ```bash
  pip install pywebview
  ```

  If your system uses `pip3`, use:

  ```bash
  pip3 install pywebview
  ```

## How to Use This Repo

1. Clone the repo using HTTPS:

  ```bash
  git clone https://github.com/itsjustmdawg/csc1108-flight-map-routing.git
  ```

  Or clone using SSH:

  ```bash
  git clone git@github.com:itsjustmdawg/csc1108-flight-map-routing.git
  ```

2. Create your personal branch to work on:

  ```bash
  git checkout -b [branch-name]
  ```

3. Stage your changes:

  ```bash
  git add .
  ```

  You can also stage a single file with `git add [filename]`.

4. Commit your changes with a clear message:

  ```bash
  git commit -m "example commit message in present tense"
  ```

  Example:

  ```bash
  git commit -m "Add airline classes to folder"
  ```

5. Push your branch:

  ```bash
  git push
  ```

6. If this is a new branch that doesn't exist on GitHub yet, push with upstream:

  ```bash
  git push --set-upstream origin [branch-name]
  ```

7. To receive updates from another branch:

  ```bash
  git checkout [branch-to-pull]
  git pull
  git checkout -b [my-new-branch-name]
  ```

## Tips

1. Keep commits small and focused. Even small changes (3-4 lines) can be a good commit.
2. Keep branches focused on one task. Break large work into smaller branches where possible.
