// ===============================================
// Global variables and constants
// ===============================================
const target = "SKYPATH";
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const colors = [
	"#ffffff",
	"#ffffff",
	"#ffffff",
	"#0284c7",
	"#0284c7",
	"#0284c7",
	"#0284c7",
];

const board = document.getElementById("solari-logo");

// ===============================================
// Solari board animation logic
// ===============================================
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

// ===============================================
// Tile flipping logic
// ===============================================
function flipTile(tileIndex, targetChar, color, step, totalSteps, resolve) {
	const tile = board.children[tileIndex];
	const topText = tile.querySelector(".solari-top span");
	const bottomText = tile.querySelector(".solari-bottom span");
	const flap = tile.querySelector(".solari-flap");
	const flapText = flap.querySelector("span");
	const isLast = step >= totalSteps;
	const currentChar = isLast
		? targetChar
		: chars[Math.floor(Math.random() * chars.length)];

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
		setTimeout(
			() =>
				flipTile(
					tileIndex,
					targetChar,
					color,
					step + 1,
					totalSteps,
					resolve,
				),
			220,
		);
	} else {
		resolve();
	}
}

function animateBoard() {
	const promises = target.split("").map((letter, i) => {
		return new Promise((resolve) => {
			const delay = i * 180;
			const steps = 10 + Math.floor(Math.random() * 8);
			setTimeout(
				() => flipTile(i, letter, colors[i], 0, steps, resolve),
				delay,
			);
		});
	});
}

// Run on load, then repeat every 6 seconds
window.addEventListener("load", () => {
	setTimeout(animateBoard, 300);
	setInterval(animateBoard, 6000);
});

// ===============================================
// World map and marker logic
// ===============================================
var map = L.map("map").setView([20, 0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
	maxZoom: 19,
	attribution:
		'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

let originMarker = null;
let destinationMarker = null;

function getAirportFromInput(inputElement) {
	const selectedCode = inputElement.dataset.airportCode || "";
	if (!selectedCode) {
		return null;
	}

	return airportByCode.get(selectedCode) || null;
}

function hasValidCoordinates(airport) {
	return (
		airport &&
		typeof airport.latitude === "number" &&
		Number.isFinite(airport.latitude) &&
		typeof airport.longitude === "number" &&
		Number.isFinite(airport.longitude)
	);
}

function updateMapViewport() {
	const markerList = [originMarker, destinationMarker].filter(
		(marker) => marker,
	);

	if (markerList.length === 2) {
		const bounds = L.latLngBounds(
			markerList.map((marker) => marker.getLatLng()),
		);
		map.fitBounds(bounds, { padding: [40, 40] });
		return;
	}

	if (markerList.length === 1) {
		map.setView(markerList[0].getLatLng(), 5);
	}
}

function setAirportMarker(role, airport) {
	const markerRef = role === "origin" ? originMarker : destinationMarker;

	if (markerRef) {
		map.removeLayer(markerRef);
	}

	if (!hasValidCoordinates(airport)) {
		if (role === "origin") {
			originMarker = null;
		} else {
			destinationMarker = null;
		}
		updateMapViewport();
		return;
	}

	const marker = L.marker([airport.latitude, airport.longitude]).addTo(map);
	marker.bindPopup(
		`<b>${role === "origin" ? "Origin" : "Destination"}</b><br>${airport.code} - ${airport.name}`,
	);

	if (role === "origin") {
		originMarker = marker;
	} else {
		destinationMarker = marker;
	}

	updateMapViewport();
}

function updateMarkerForInput(inputElement) {
	const airport = getAirportFromInput(inputElement);
	const role = inputElement.id === "origin" ? "origin" : "destination";
	setAirportMarker(role, airport);
}

// ===============================================
// Airport search dropdown logic
// ===============================================

// Filter button logic
const filterButtons = document.querySelectorAll(".filter-option");
let selectedFilter = "shortest_distance";

const originInput = document.getElementById("origin");
const destinationInput = document.getElementById("destination");
const swapButton = document.getElementById("swap-button");
const airportCountElement = document.getElementById("airport-count");
const originOptions = document.getElementById("origin-options");
const destinationOptions = document.getElementById("destination-options");
const originContainer = document.getElementById("origin-searchable");
const destinationContainer = document.getElementById("destination-searchable");

let airportsCache = [];
let popularAirports = [];
const airportByCode = new Map();
const POPULAR_AIRPORT_LIMIT = 20;

filterButtons.forEach((button) => {
	button.addEventListener("click", () => {
		filterButtons.forEach((btn) => {
			btn.classList.remove("active");
			btn.setAttribute("aria-pressed", "false");
		});

		button.classList.add("active");
		button.setAttribute("aria-pressed", "true");
		selectedFilter = button.dataset.filter;
	});
});

function buildAirportOptionLabel(airport) {
	return `${airport.code} | ${airport.icao} | ${airport.country} | ${airport.name}`;
}

function getAirportSearchText(airport) {
	return `${airport.code} ${airport.icao} ${airport.country} ${airport.name}`.toLowerCase();
}

function clearOptions(container) {
	container.innerHTML = "";
}

function hideOptions(container) {
	container.hidden = true;
}

function showOptions(container) {
	container.hidden = false;
}

function updateClearButtonVisibility(inputElement, clearButtonElement) {
	if (!clearButtonElement) {
		return;
	}

	const hasValue = inputElement.value.trim() !== "";
	clearButtonElement.hidden = !hasValue;
}

function clearAirportSelection(
	inputElement,
	optionsElement,
	clearButtonElement,
) {
	inputElement.value = "";
	inputElement.dataset.airportCode = "";
	updateMarkerForInput(inputElement);
	renderFilteredOptions(inputElement, optionsElement);
	updateClearButtonVisibility(inputElement, clearButtonElement);
	inputElement.focus();
}

function createAirportOptionButton(airport, inputElement, optionsElement) {
	const optionButton = document.createElement("button");
	optionButton.type = "button";
	optionButton.className = "airport-option";

	const codeSpan = document.createElement("span");
	codeSpan.className = "airport-option-code";
	codeSpan.textContent = airport.code;

	const metaSpan = document.createElement("span");
	metaSpan.className = "airport-option-meta";
	metaSpan.textContent = `${airport.icao} | ${airport.country} | ${airport.name}`;

	optionButton.appendChild(codeSpan);
	optionButton.appendChild(metaSpan);

	optionButton.addEventListener("click", () => {
		inputElement.value = buildAirportOptionLabel(airport);
		inputElement.dataset.airportCode = airport.code;
		hideOptions(optionsElement);
		updateMarkerForInput(inputElement);

		const clearButtonElement =
			inputElement.parentElement?.querySelector(".dropdown-clear");
		updateClearButtonVisibility(inputElement, clearButtonElement);
	});

	return optionButton;
}

function renderFilteredOptions(inputElement, optionsElement) {
	clearOptions(optionsElement);

	const query = inputElement.value.trim().toLowerCase();
	const sourceAirports =
		query === ""
			? popularAirports
			: airportsCache.filter((airport) =>
					getAirportSearchText(airport).includes(query),
				);

	const filteredAirports = sourceAirports.slice(0, 120);

	if (filteredAirports.length === 0) {
		const emptyState = document.createElement("div");
		emptyState.className = "airport-option-empty";
		emptyState.textContent =
			query === ""
				? "No popular airports available"
				: "No matching airports";
		optionsElement.appendChild(emptyState);
		showOptions(optionsElement);
		return;
	}

	filteredAirports.forEach((airport) => {
		optionsElement.appendChild(
			createAirportOptionButton(airport, inputElement, optionsElement),
		);
	});

	showOptions(optionsElement);
}

function wireSearchableDropdown(
	inputElement,
	optionsElement,
	containerElement,
) {
	const clearButtonElement =
		containerElement.querySelector(".dropdown-clear");

	if (clearButtonElement) {
		clearButtonElement.setAttribute("role", "button");
		clearButtonElement.setAttribute("tabindex", "0");
		clearButtonElement.setAttribute("aria-label", "Clear selected airport");

		clearButtonElement.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			clearAirportSelection(
				inputElement,
				optionsElement,
				clearButtonElement,
			);
		});

		clearButtonElement.addEventListener("keydown", (event) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				event.stopPropagation();
				clearAirportSelection(
					inputElement,
					optionsElement,
					clearButtonElement,
				);
			}
		});
	}

	inputElement.addEventListener("focus", () => {
		renderFilteredOptions(inputElement, optionsElement);
		updateClearButtonVisibility(inputElement, clearButtonElement);
	});

	inputElement.addEventListener("input", () => {
		inputElement.dataset.airportCode = "";
		updateMarkerForInput(inputElement);
		renderFilteredOptions(inputElement, optionsElement);
		updateClearButtonVisibility(inputElement, clearButtonElement);
	});

	inputElement.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			hideOptions(optionsElement);
		}
	});

	document.addEventListener("click", (event) => {
		if (!containerElement.contains(event.target)) {
			hideOptions(optionsElement);
		}
	});

	updateClearButtonVisibility(inputElement, clearButtonElement);
}

function populateAirportDropdowns(airports) {
	airportsCache = airports;
	popularAirports = [...airports]
		.sort((a, b) => {
			const byRoutes = (b.route_count || 0) - (a.route_count || 0);
			if (byRoutes !== 0) {
				return byRoutes;
			}

			return a.code.localeCompare(b.code);
		})
		.slice(0, POPULAR_AIRPORT_LIMIT);

	airportByCode.clear();

	airports.forEach((airport) => {
		airportByCode.set(airport.code, airport);
	});
}

// ===============================================
// Initialization logic
// ===============================================

// Load airports from Python and populate dropdowns
async function loadAirports() {
	if (
		!(
			window.pywebview &&
			window.pywebview.api &&
			window.pywebview.api.get_airports
		)
	) {
		return;
	}

	try {
		const airports = await window.pywebview.api.get_airports();
		populateAirportDropdowns(airports);

		if (airportCountElement) {
			airportCountElement.textContent = airports.length.toLocaleString();
		}
	} catch (error) {
		console.error("Failed to load airports:", error);
	}
}

// ==============================================
// Swap button logic
// ==============================================
swapButton.addEventListener("click", () => {
	const currentOriginLabel = originInput.value;
	const currentOriginCode = originInput.dataset.airportCode || "";

	originInput.value = destinationInput.value;
	originInput.dataset.airportCode =
		destinationInput.dataset.airportCode || "";

	destinationInput.value = currentOriginLabel;
	destinationInput.dataset.airportCode = currentOriginCode;

	updateMarkerForInput(originInput);
	updateMarkerForInput(destinationInput);

	const originClearButton =
		originInput.parentElement?.querySelector(".dropdown-clear");
	const destinationClearButton =
		destinationInput.parentElement?.querySelector(".dropdown-clear");
	updateClearButtonVisibility(originInput, originClearButton);
	updateClearButtonVisibility(destinationInput, destinationClearButton);
});

wireSearchableDropdown(originInput, originOptions, originContainer);
wireSearchableDropdown(
	destinationInput,
	destinationOptions,
	destinationContainer,
);

window.addEventListener("pywebviewready", loadAirports);

if (
	window.pywebview &&
	window.pywebview.api &&
	window.pywebview.api.get_airports
) {
	loadAirports();
}
