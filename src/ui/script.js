const target = "SKYPATH";
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const colors = ["#ffffff", "#ffffff", "#ffffff", "#0284c7", "#0284c7", "#0284c7", "#0284c7"];

const board = document.getElementById("solari-logo");

// Build tiles
target.split("").forEach((letter, i) => {
    const tile = document.createElement("div");
    tile.classList.add("solari-tile");

    const top = document.createElement("div");
    top.classList.add("solari-top");
    const topText = document.createElement("span");
    top.appendChild(topText);

    const bottom = document.createElement("div");
    bottom.classList.add("solari-bottom");
    const bottomText = document.createElement("span");
    bottom.appendChild(bottomText);

    const flap = document.createElement("div");
    flap.classList.add("solari-flap");
    const flapText = document.createElement("span");
    flap.appendChild(flapText);

    tile.appendChild(top);
    tile.appendChild(bottom);
    tile.appendChild(flap);
    board.appendChild(tile);
});

function flipTile(tileIndex, targetChar, color, step, totalSteps, resolve) {
    const tile = board.children[tileIndex];
    const topText = tile.querySelector(".solari-top span");
    const bottomText = tile.querySelector(".solari-bottom span");
    const flap = tile.querySelector(".solari-flap");
    const flapText = flap.querySelector("span");

    const isLast = step >= totalSteps;
    const currentChar = isLast ? targetChar : chars[Math.floor(Math.random() * chars.length)];

    topText.textContent = currentChar;
    topText.style.color = color;
    bottomText.textContent = currentChar;
    bottomText.style.color = color;
    flapText.textContent = currentChar;
    flapText.style.color = color;

    flap.style.animation = "none";
    flap.offsetHeight; // reflow
    flap.style.animation = "flip 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards";

    if (!isLast) {
        setTimeout(() => flipTile(tileIndex, targetChar, color, step + 1, totalSteps, resolve), 220);
    } else {
        resolve();
    }
}

function animateBoard() {
    const promises = target.split("").map((letter, i) => {
        return new Promise(resolve => {
            const delay = i * 180;
            const steps = 10 + Math.floor(Math.random() * 8);
            setTimeout(() => flipTile(i, letter, colors[i], 0, steps, resolve), delay);
        });
    });
}

// Run on load, then repeat every 6 seconds
window.addEventListener("load", () => {
    setTimeout(animateBoard, 300);
    setInterval(animateBoard, 6000);
});