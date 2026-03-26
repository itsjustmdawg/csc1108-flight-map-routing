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
	updatePaginationInfo();
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
let currentRoutes = [];
let routePolylines = [];
let waypointMarkers = [];

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

function clearRouteVisualization() {
	// Remove all polylines
	routePolylines.forEach((polyline) => map.removeLayer(polyline));
	routePolylines = [];

	// Remove all waypoint markers
	waypointMarkers.forEach((marker) => map.removeLayer(marker));
	waypointMarkers = [];
}

function clearRoutes() {
	// Clear route data and visualization (but not button display)
	currentRoutes = [];
	clearRouteVisualization();
}

function clearRoutesAndButtons() {
	// Clear route data, visualization, and button display
	currentRoutes = [];
	clearRouteVisualization();
	// Hide and reset all route buttons
    const routeOptionButtons = document.querySelectorAll(".route-option");
    routeOptionButtons.forEach((btn, index) => {
        btn.style.display = "flex"; // always visible
        const nameSpan = btn.querySelector(".route-option-name");
        const detailSpans = btn.querySelectorAll(".route-option-detail");

        if (nameSpan) nameSpan.textContent = `Route ${index + 1}`; // show Route 1, 2, ...
        if (detailSpans.length > 0) {
            detailSpans[0].textContent = "-";
            detailSpans[1].textContent = "-"; 
        }

        btn.classList.remove("active");
        btn.setAttribute("aria-pressed", "false");
    });


    // Reset pagination
    currentPage = 0;
    updatePaginationInfo();
}

function displayRouteOnMap(routeIndex) {
	clearRouteVisualization();

	if (routeIndex < 0 || routeIndex >= currentRoutes.length) {
		return;
	}

	const route = currentRoutes[routeIndex];
	const waypoints = [];

	// Collect all waypoint coordinates from the route paths
	route.paths.forEach((path) => {
		const sourceAirport = airportByCode.get(path.source);
		const destAirport = airportByCode.get(path.destination);

		if (
			sourceAirport &&
			hasValidCoordinates(sourceAirport) &&
			waypoints.length === 0
		) {
			waypoints.push([sourceAirport.latitude, sourceAirport.longitude]);
		}

		if (destAirport && hasValidCoordinates(destAirport)) {
			waypoints.push([destAirport.latitude, destAirport.longitude]);
		}
	});

	if (waypoints.length < 2) {
		return;
	}

	// Draw polyline connecting all waypoints
	const polyline = L.polyline(waypoints, { color: "blue", weight: 2 })
		.addTo(map)
		.bindPopup(`Route ${routeIndex + 1}`);
	routePolylines.push(polyline);

	// Add markers for each waypoint (except origin which is already shown)
	for (let i = 1; i < waypoints.length; i++) {
		const marker = L.marker(waypoints[i]).addTo(map);

		const airportCode =
			i === waypoints.length - 1
				? route.paths[route.paths.length - 1].destination
				: route.paths[i - 1].destination;

		const airport = airportByCode.get(airportCode);
		const airportName = airport?.name || "Unknown Airport";

		const markerLabel =
			i === waypoints.length - 1
				? `<b>Destination</b><br>${airportCode} - ${airportName}`
				: `<b>Stop</b><br>${airportCode} - ${airportName}`;

		marker.bindPopup(markerLabel);
		waypointMarkers.push(marker);
	}

	map.fitBounds(L.latLngBounds(waypoints), { padding: [40, 40] });
}

// ===============================================
// Pagination & Route Selection
// ===============================================

const ROUTES_PER_PAGE = 4; // routes per page
let currentPage = 0;       // 0-based page index
let selectedRouteIndex = 0;

const prevBtn = document.getElementById("prev-page");
const nextBtn = document.getElementById("next-page");
const pageInfo = document.getElementById("page-info");
const routeContainer = document.getElementById("route-options-container"); // wrapper for buttons

function updatePageNumber() {
    const pageNumberSpan = document.getElementById("page-number");
    pageNumberSpan.textContent = currentPage;
}

// Update page buttons and visible route buttons
function updatePaginationInfo() {
    const totalPages = Math.ceil(currentRoutes.length / ROUTES_PER_PAGE);

	if (!currentRoutes || currentRoutes.length === 0) {
		prevBtn.style.display = "none";
		nextBtn.style.display = "none";
		pageInfo.textContent = "";
		return;
	}

	pageInfo.textContent = currentPage + 1;

	prevBtn.style.display = currentPage > 0 ? "inline-block" : "none";
	nextBtn.style.display = currentPage < totalPages - 1 ? "inline-block" : "none";
}

function updateRouteButtonsDisplay() {


	if (!currentRoutes || currentRoutes.length === 0) {
		routeOptionButtons.forEach((btn) => {
			btn.style.display = "none";
			btn.classList.remove("active");
			btn.setAttribute("aria-pressed", "false");
		});
		updatePaginationInfo();
		return;
	}

	const startIndex = currentPage * ROUTES_PER_PAGE;

	routeOptionButtons.forEach((btn, i) => {
		const routeIndex = startIndex + i;

		if (routeIndex < currentRoutes.length) {
			const route = currentRoutes[routeIndex];
			const stops = Math.max(0, route.paths.length - 1);

			btn.style.display = "flex";

			const nameSpan = btn.querySelector(".route-option-name");
			const detailSpans = btn.querySelectorAll(".route-option-detail");

			if (nameSpan) nameSpan.textContent = `Route ${routeIndex + 1}`;
			if (detailSpans.length > 0) {
				detailSpans[0].textContent =
					`${Math.round(route.total_distance)} km · ${Math.floor(route.total_time / 60)}h ${Math.round(route.total_time % 60)}m`;

				detailSpans[1].textContent =
					`${stops} ${stops === 1 ? "stop" : "stops"} · $${Math.round(route.price)}`;
			}

			btn.onclick = () => selectRoute(routeIndex);
			btn.classList.toggle("active", routeIndex === selectedRouteIndex);
			btn.setAttribute(
				"aria-pressed",
				routeIndex === selectedRouteIndex ? "true" : "false"
			);

		} else {
			btn.style.display = "none";
			btn.classList.remove("active");
			btn.setAttribute("aria-pressed", "false");
		}
	});

	updatePaginationInfo();
}

function selectRoute(routeIndex) {
	if (routeIndex < 0 || routeIndex >= currentRoutes.length) {
		return;
	}

	selectedRouteIndex = routeIndex;
	currentPage = Math.floor(routeIndex / ROUTES_PER_PAGE);
	updateRouteButtonsDisplay();
	displayRouteOnMap(routeIndex);
}

prevBtn.addEventListener("click", () => {
   if (currentPage > 0) { // 0-based
        currentPage--;
        selectedRouteIndex = currentPage * ROUTES_PER_PAGE;
        updateRouteButtonsDisplay();
        displayRouteOnMap(selectedRouteIndex);
    }
});

nextBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(currentRoutes.length / ROUTES_PER_PAGE);
    if (currentPage < totalPages - 1) { // last page = totalPages-1
        currentPage++;
        selectedRouteIndex = currentPage * ROUTES_PER_PAGE;
        updateRouteButtonsDisplay();
        displayRouteOnMap(selectedRouteIndex);
    }
});

// ===============================================
// Airport search dropdown logic
// ===============================================

// Helper function to apply toggle logic to button groups
function setupToggleButtons(buttonNodeList, onToggle) {
	buttonNodeList.forEach((button) => {
		button.addEventListener("click", () => {
			buttonNodeList.forEach((btn) => {
				btn.classList.remove("active");
				btn.setAttribute("aria-pressed", "false");
			});

			button.classList.add("active");
			button.setAttribute("aria-pressed", "true");
			onToggle(button);
		});
	});
}

// Filter button logic
const filterButtons = document.querySelectorAll(".filter-option");
let selectedFilter = "shortest_distance";
const routeOptionButtons = document.querySelectorAll(".route-option");
let selectedRouteOption = "route_1";

const originInput = document.getElementById("origin");
const destinationInput = document.getElementById("destination");
const swapButton = document.getElementById("swap-button");
const findRoutesButton = document.getElementById("find-routes-button");
const airportCountElement = document.getElementById("airport-count");
const originOptions = document.getElementById("origin-options");
const destinationOptions = document.getElementById("destination-options");
const originContainer = document.getElementById("origin-searchable");
const destinationContainer = document.getElementById("destination-searchable");

let airportsCache = [];
let popularAirports = [];
const airportByCode = new Map();
const POPULAR_AIRPORT_LIMIT = 20;
let filterTimeout;

setupToggleButtons(filterButtons, async (button) => {
    selectedFilter = button.dataset.filter;

    // Disable buttons immediately
    filterButtons.forEach(btn => btn.disabled = true);

    // Cancel any previous scheduled fetch
    if (filterTimeout) clearTimeout(filterTimeout);

    filterTimeout = setTimeout(async () => {
        const originAirport = originInput.dataset.airportCode || "";
        const destinationAirport = destinationInput.dataset.airportCode || "";

        if (!originAirport || !destinationAirport) {
            filterButtons.forEach(btn => btn.disabled = false);
            return;
        }

        try {
            const result = await window.pywebview.api.get_routes(
                originAirport,
                destinationAirport,
                selectedFilter,
                999 // limit routes to prevent overload
            );

            if (result && result.ok) {
                currentRoutes = result.routes || [];
                currentPage = 0;
                selectedRouteIndex = 0;
                updateRouteButtonsDisplay();
                if (currentRoutes.length > 0) selectRoute(0);
            }
        } catch (err) {
            console.error(err);
        } finally {
            filterButtons.forEach(btn => btn.disabled = false);
        }
    }, 150); // wait 150ms after last click
});

setupToggleButtons(routeOptionButtons, (button) => {
	selectedRouteOption = button.dataset.routeOption;
	const routeIndex =
		currentPage * ROUTES_PER_PAGE + Array.from(routeOptionButtons).indexOf(button);
	selectRoute(routeIndex);
});

function buildAirportOptionLabel(airport) {
	return `${airport.country} | ${airport.code} | ${airport.name}`;
}

function getAirportSearchText(airport,query) {
	if (!query) return true;
	const q = query.toLowerCase();
	return (
		(airport.country || "").toLowerCase().includes(q) ||
		(airport.code || "").toLowerCase().includes(q) ||
		(airport.icao || "").toLowerCase().includes(q) ||
		(airport.name || "").toLowerCase().includes(q)
	);
}

function getSearchScore(airport, query) {
	const country = (airport.country || "").toLowerCase();
	const code = (airport.code || "").toLowerCase();
	const icao = (airport.icao || "").toLowerCase();
	const name = (airport.name || "").toLowerCase();

	if (country.startsWith(query)) return 0;   // "sing" → Singapore
	if (code.startsWith(query)) return 1;       // "sin" → SIN code
	if (name.startsWith(query)) return 2;       // "gla" → Glasgow Airport
	if (code.includes(query)) return 3;
	if (name.includes(query)) return 4;         // airport name contains query
	if (country.includes(query)) return 5;      // "gla" → Ban"gla"desh (partial)
	if (icao.startsWith(query)) return 6;
	if (icao.includes(query)) return 7;
	return 8;
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
	clearRoutesAndButtons();
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
	metaSpan.textContent = `${airport.name}`;

	optionButton.appendChild(codeSpan);
	optionButton.appendChild(metaSpan);

	optionButton.addEventListener("click", () => {
		inputElement.value = buildAirportOptionLabel(airport);
		inputElement.dataset.airportCode = airport.code;
		inputElement.dataset.autoCompleted = "true";
		hideOptions(optionsElement);
		updateMarkerForInput(inputElement);
		clearRoutes();

		const clearButtonElement =
			inputElement.parentElement?.querySelector(".dropdown-clear");
		updateClearButtonVisibility(inputElement, clearButtonElement);
	});

	return optionButton;
}

function renderFilteredOptions(inputElement, optionsElement) {
	clearOptions(optionsElement);

	// If an airport has already been selected, show popular airports instead of filtering
	const hasSelectedAirport = inputElement.dataset.airportCode !== "";
	const query = inputElement.value.trim().toLowerCase();
	const sourceAirports =
		query === "" || hasSelectedAirport
			? popularAirports
			: airportsCache
    			.filter((airport) => {
    				// Search by code, country, or name only
    				const q = query.toLowerCase();
    				return (
    					(airport.code || "").toLowerCase().includes(q) ||
    					(airport.country || "").toLowerCase().includes(q) ||
    					(airport.name || "").toLowerCase().includes(q)
    				);
    			})
    			.sort((a, b) => getSearchScore(a, query) - getSearchScore(b, query))

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

	// Group airports by country
	const grouped = {};
	filteredAirports.forEach((airport) => {
		const country = airport.country || "Unknown";
		if (!grouped[country]) {
			grouped[country] = [];
		}
		grouped[country].push(airport);
	});

	// Sort countries alphabetically
	const sortedCountries = Object.keys(grouped).sort((a, b) => {
    	const bestScoreA = Math.min(...grouped[a].map(airport => getSearchScore(airport, query)));
    	const bestScoreB = Math.min(...grouped[b].map(airport => getSearchScore(airport, query)));
    	return bestScoreA - bestScoreB;
	});

	sortedCountries.forEach((country) => {
		// Add country group header
		const header = document.createElement("div");
		header.className = "airport-group-header";
		header.textContent = `${country} (${grouped[country].length})`;
		optionsElement.appendChild(header);

		// Add airports under that country
		grouped[country].forEach((airport) => {
			optionsElement.appendChild(
				createAirportOptionButton(airport, inputElement, optionsElement),
			);
		});
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
		// Just render the options when focused, let keyboard events handle text changes
		if (inputElement.dataset.airportCode && inputElement.value.includes("|")) {
			// Instead of clearing in focus, we just select all text so user can see it
			// and any keypress will replace it, just like a URL bar
			inputElement.select();
		}
		renderFilteredOptions(inputElement, optionsElement);
		updateClearButtonVisibility(inputElement, clearButtonElement);
	});

	inputElement.addEventListener("input", () => {
		inputElement.dataset.airportCode = "";
		inputElement.dataset.autoCompleted = "false";
		updateMarkerForInput(inputElement);
		renderFilteredOptions(inputElement, optionsElement);
		updateClearButtonVisibility(inputElement, clearButtonElement);
	});

	inputElement.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			hideOptions(optionsElement);
			return;
		}

		// URL bar behavior: replacing entire auto-completed string on character input
		if (
			inputElement.dataset.autoCompleted === "true" &&
			event.key.length === 1 &&
			!event.ctrlKey &&
			!event.metaKey &&
			!event.altKey
		) {
			// If user hasn't made a manual selection (e.g. they just clicked the field or clicked it to move cursor)
			if (inputElement.selectionStart === inputElement.selectionEnd) {
				event.preventDefault();
				inputElement.value = event.key;
				inputElement.dataset.airportCode = "";
				inputElement.dataset.autoCompleted = "false";
				
				// Dispatch an input event manually to trigger standard processing
				const inputEvent = new Event("input", { bubbles: true });
				inputElement.dispatchEvent(inputEvent);
			}
			// If they made a manual selection, let the default behavior happen (it will replace selection)
		} 
		// Handle backspace properly for URL-like behavior
		else if (event.key === "Backspace" && inputElement.dataset.autoCompleted === "true") {
			inputElement.dataset.autoCompleted = "false";
			inputElement.dataset.airportCode = "";
			
			// Custom manual backspace logic to ensure it behaves consistently when in autoCompleted state
			const selStart = inputElement.selectionStart;
			const selEnd = inputElement.selectionEnd;
			
			if (selStart !== selEnd) {
				// Prevent default to control the deletion exactly
				event.preventDefault();
				inputElement.value = inputElement.value.substring(0, selStart) + inputElement.value.substring(selEnd);
				inputElement.setSelectionRange(selStart, selStart);
				
				const inputEvent = new Event("input", { bubbles: true });
				inputElement.dispatchEvent(inputEvent);
			} else if (selStart > 0) {
				// Explicitly delete ONLY the character before the cursor
				event.preventDefault();
				const newPos = selStart - 1;
				inputElement.value = inputElement.value.substring(0, newPos) + inputElement.value.substring(selStart);
				inputElement.setSelectionRange(newPos, newPos);
				
				const inputEvent = new Event("input", { bubbles: true });
				inputElement.dispatchEvent(inputEvent);
			}
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

findRoutesButton.addEventListener("click", async () => {
	const originAirport = originInput.dataset.airportCode || "";
	const destinationAirport = destinationInput.dataset.airportCode || "";

	if (!originAirport || !destinationAirport) {
		alert("Please select both origin and destination airports.");
		return;
	}

	try {
		const result = await window.pywebview.api.get_routes(
			originAirport,
			destinationAirport,
			selectedFilter,
			999
		);

		if (!result || !result.ok) {
			alert("Failed to retrieve routes.");
			return;
		}

		currentRoutes = result.routes || [];

		currentPage = 0;
		selectedRouteIndex = 0;

		updateRouteButtonsDisplay();

		if (currentRoutes.length > 0) {
			selectRoute(0);
		}

	} catch (error) {
		console.error(error);
	}
});

window.addEventListener("pywebviewready", loadAirports);
