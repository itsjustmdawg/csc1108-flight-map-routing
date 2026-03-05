<h2>Project Directory</h2>
<code><p>flight-routing-project/
├── data/
│   └── airline_routes.json   # Your Jonty dataset
├── src/
│   ├── data_loader.py        # Logic to open JSON and convert strings to floats
│   ├── algorithms.py         # A* and BFS logic
│   ├── models.py             # Airport and Flight classes
│   └── utils.py              # Haversine distance calculator
├── app.py                    # Streamlit/Folium UI
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

<p>
  5. When you want to share you saved code with everyone you need to push your code:
  <br>
  <code>git push</code>
</p>

<p>
  5a.  If you just created that branch and it doesn't exists on github, use this push command instead
  <br>
  <code>git push --set-upstream [branch name that can be different from your local branch name]</code>
</p>

<p>
  6. If you want to receive updates from a branch, you can pull the changes from the internet
  <br>
  <code>git checkout [GitHub branch name that you want to pull from]</code>
  <br>
  <code>git pull</code> To download the changes into your pc
  <br>
  <code>git checkout -b [my new branch name]</code> good practice to recreate a new branch to get your new updates
  <br>
</p>
<hr>
<H2>TIPS</H2>
<ol>
  <li> Your commits should be extremely tiny features, like even 3-4 lines of code is enough for a commit</li>
  <li> Your branches should be small also, don't need to make it to something so big like, actions  then inside got like 50+ commits. Break it down into multiple branches like move-action, eat-action, fight-action each with 10-20 commits</li>
</ol>
<hr>
