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
<<<<<<< HEAD
└── requirements.txt
```
=======
└── requirements.txt</p></code>
<h2>PREREQUISITES</h2>
<p>
  1. Install <b>Python 3.10+</b> and make sure <code>python</code> and <code>pip</code> are available in your terminal.
  <br>
  2. Install <b>pywebview</b>:
  <br>
  <code>pip install pywebview</code>
  <br>
  If your system uses <code>pip3</code>, use:
  <br>
  <code>pip3 install pywebview</code>
</p>
<h2>HOW TO USE THIS REPO?</h2>
<b>Clone the repo with HTTPs:</b>
<br>
<code>git clone https://github.com/itsjustmdawg/csc1108-flight-map-routing.git</code>
<br>
<b>Or with SSH:</b>
<br>
<code>git clone git@github.com:itsjustmdawg/csc1108-flight-map-routing.git</code>
<br>
<p>
  2. Create your personal branch to work on (you will auto switch to that branch to work on it)
  <br>
  <code>git checkout -b [branch name]</code>
</p>
<br>
<p>
  3. When you add code, your PyCharm will highlight files with code changes in red. You can add them to a list that you want to commit later with:
  <br>
  <code>git add .</code>
  <br>
  *the full stop means stage everything to prepare for commit, you can just git add [filename] also if you want to add 1 file*
</p>
<p>
  4.  When you done with the changes, you want to commit them with a message so everyone know what changes u made:
  <br>
  <code>git commit -m "example commit message with no full stop, and convention is to use present tense"</code>
  <br>
  Example commit: <code>git commit -m "Add airline classes to folder"</code> quotes are important
</p>
>>>>>>> 593ae4e (Add UI using HTML, CSS, and JS. Add fonts)

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
