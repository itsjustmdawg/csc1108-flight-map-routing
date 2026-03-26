
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
let routeAnimations = [];
let renderedRoutes = null;
let animationFrameId = null;

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
	// Enhanced cleanup: added safety checks to ensure all polylines and markers are actually removed from the map
	// This prevents "ghost" visualizations from lingering when swapping routes or airports
	
	if (animationFrameId) {
		cancelAnimationFrame(animationFrameId);
		animationFrameId = null;
	}

	// Remove all polylines from the map with layer existence check
	// map.hasLayer() ensures we don't try to remove layers that aren't on the map
	routePolylines.forEach((polyline) => {
		if (map.hasLayer(polyline)) {
			map.removeLayer(polyline);
		}
	});
	routePolylines = [];
 
	waypointMarkers.forEach((marker) => {
		if (map.hasLayer(marker)) {
			map.removeLayer(marker);
		}
	});
	waypointMarkers = [];
	routeAnimations = [];
	renderedRoutes = null;
}
 
function clearRoutes() {
	currentRoutes = [];
	clearRouteVisualization();
	if (routeDetailsElement) {
		routeDetailsElement.textContent = "No route selected.";
	}
}
 
function clearRoutesAndButtons() {
	currentRoutes = [];
	clearRouteVisualization();
    const routeOptionButtons = document.querySelectorAll(".route-option");
    routeOptionButtons.forEach((btn, index) => {
        btn.style.display = "flex";
        const nameSpan = btn.querySelector(".route-option-name");
        const detailSpans = btn.querySelectorAll(".route-option-detail");
 
        if (nameSpan) nameSpan.textContent = `Route ${index + 1}`;
        if (detailSpans.length > 0) {
            detailSpans[0].textContent = "-";
            detailSpans[1].textContent = "-"; 
        }
 
        btn.classList.remove("active");
        btn.setAttribute("aria-pressed", "false");
    });
 
    currentPage = 0;
    updatePaginationInfo();
}
 
function displayRouteOnMap(routeIndex) {
	if (routeIndex < 0 || routeIndex >= currentRoutes.length) {
		return;
	}

	if (renderedRoutes === currentRoutes) {
		updateRouteHighlighting(routeIndex);
		return;
	}

	clearRouteVisualization();
	renderedRoutes = currentRoutes;

	const selectedIndex = routeIndex;
	const uiOriginCode = originInput.dataset.airportCode;
	const uiDestCode = destinationInput.dataset.airportCode;

	// 1. Determine styling for all lines based on the currently selected filter
	let baseColor, dashArray, dashLength;
	if (selectedFilter.includes("fast")) {
		baseColor = "#16a34a";   // Green
		dashArray = "15, 10";    // Dashed line
		dashLength = 25;
	} else if (selectedFilter.includes("cheap")) {
		baseColor = "#9333ea";   // Purple
		dashArray = "5, 5";      // Dotted line
		dashLength = 10;
	} else if (selectedFilter.includes("fewest")) {
		baseColor = "#dc2626";   // Red
		dashArray = "15, 5";     // Alternate dashed line
		dashLength = 20;
	} else {
		baseColor = "#0284c7";   // Blue
		dashArray = "12, 8";     // Flowing dashed line
		dashLength = 20;
	}

	let globalStartTime = null;

	// 2. Loop through ALL routes currently loaded in this filter to draw them together
	currentRoutes.forEach((route, idx) => {
		const isSelected = (idx === selectedIndex);
		const waypoints = [];

		route.paths.forEach((path) => {
			const sourceAirport = airportByCode.get(path.source);
			const destAirport = airportByCode.get(path.destination);

			if (sourceAirport && hasValidCoordinates(sourceAirport) && waypoints.length === 0) {
				waypoints.push([sourceAirport.latitude, sourceAirport.longitude]);
			}
			if (destAirport && hasValidCoordinates(destAirport)) {
				waypoints.push([destAirport.latitude, destAirport.longitude]);
			}
		});

		if (waypoints.length < 2) {
			return; // Skip invalid routes
		}

		// ============================================================================
		// DIRECTION DETECTION & CORRECTION (FIX FOR SWAP BUG)
		// ============================================================================
		const firstPath = route.paths[0];
		const lastPath = route.paths[route.paths.length - 1];

		if (firstPath.source === uiDestCode && lastPath.destination === uiOriginCode) {
			route.paths.reverse();
			waypoints.reverse();
		}

		if (
			(route.paths[0].source !== uiOriginCode || route.paths[route.paths.length - 1].destination !== uiDestCode) &&
			waypoints[0][0] === airportByCode.get(uiOriginCode)?.latitude &&
			waypoints[0][1] === airportByCode.get(uiOriginCode)?.longitude
		) {
			// Already consistent by waypoints, do nothing
		} else if (
			route.paths[0].source === uiOriginCode &&
			route.paths[route.paths.length - 1].destination === uiDestCode
		) {
			// Route is fine as-is
		} else {
			const originLoc = airportByCode.get(uiOriginCode);
			const destLoc = airportByCode.get(uiDestCode);
			if (originLoc && destLoc && waypoints.length > 1) {
				const currentOrigin = waypoints[0];
				if (currentOrigin[0] === destLoc.latitude && currentOrigin[1] === destLoc.longitude) {
					waypoints.reverse();
				}
			}
		}

		// 3. Calculate distances between waypoints for interpolation
		let totalDistance = 0;
		const segmentDistances = [];
		for (let i = 0; i < waypoints.length - 1; i++) {
			const p1 = L.latLng(waypoints[i]);
			const p2 = L.latLng(waypoints[i + 1]);
			const dist = p1.distanceTo(p2);
			segmentDistances.push(dist);
			totalDistance += dist;
		}

		// Selected route is prominent, unselected variants are translucent/thinner
		const routeOpacity = isSelected ? 0.8 : 0.2;
		const routeWeight = isSelected ? 4 : 2;

		const polyline = L.polyline([], { 
			color: baseColor,
			weight: routeWeight,
			dashArray: dashArray,
			lineCap: 'round',
			lineJoin: 'round',
			opacity: routeOpacity
		}).addTo(map);
		if (isSelected) {
			polyline.bindPopup(`Selected Route ${idx + 1}`);
		}
		routePolylines.push(polyline);

		function getPointAtDistance(targetDist) {
			if (targetDist <= 0) return waypoints[0];
			if (targetDist >= totalDistance) return waypoints[waypoints.length - 1];
			
			let accumulatedDist = 0;
			for (let i = 0; i < waypoints.length - 1; i++) {
				const segDist = segmentDistances[i];
				if (accumulatedDist + segDist >= targetDist) {
					if (segDist === 0) return waypoints[i + 1];
					const segProgress = (targetDist - accumulatedDist) / segDist;
					const p1 = waypoints[i];
					const p2 = waypoints[i + 1];
					return [
						p1[0] + (p2[0] - p1[0]) * segProgress,
						p1[1] + (p2[1] - p1[1]) * segProgress
					];
				}
				accumulatedDist += segDist;
			}
			return waypoints[waypoints.length - 1];
		}

		const routeMarkers = [];

		// Plot waypoint markers across all routes, make unselected variant markers translucent too
		for (let i = 1; i < waypoints.length; i++) {
			const marker = L.marker(waypoints[i], { opacity: isSelected ? 1.0 : 0.4 }).addTo(map);
			const airportCode = i === waypoints.length - 1
					? route.paths[route.paths.length - 1].destination
					: route.paths[i - 1].destination;

			const airport = airportByCode.get(airportCode);
			const airportName = airport?.name || "Unknown Airport";
			const markerLabel = i === waypoints.length - 1
					? `<b>Destination</b><br>${airportCode} - ${airportName}`
					: `<b>Stop</b><br>${airportCode} - ${airportName}`;

			marker.bindPopup(markerLabel);
			waypointMarkers.push(marker);
			routeMarkers.push(marker);
		}

		routeAnimations.push({
			routeIdx: idx,
			polyline,
			waypoints,
			totalDistance,
			segmentDistances,
			getPointAtDistance,
			hasFullyDrawn: false,
			dashLength,
			markers: routeMarkers
		});
	});

	// 4. Combined animation loop iterating through the multiple lines safely
	const animationDuration = 2000;
		
	function animate(timestamp) {
		if (!globalStartTime) globalStartTime = timestamp;
		
		const elapsed = timestamp - globalStartTime;
		const cometProgress = (elapsed % animationDuration) / animationDuration;
		let drawProgress = elapsed / animationDuration;
		let drawProgressClamped = Math.min(drawProgress, 1);
		
		let keepAnimating = false;

		routeAnimations.forEach(anim => {
			if (!map.hasLayer(anim.polyline)) return;
			keepAnimating = true;

			if (drawProgress >= 1) {
				anim.hasFullyDrawn = true;
			}

			if (!anim.hasFullyDrawn) {
				const trailDistance = drawProgressClamped * anim.totalDistance;
				const trailPoints = [];
				let accumulatedDist = 0;
				trailPoints.push(anim.waypoints[0]);
				
				for (let i = 0; i < anim.waypoints.length - 1; i++) {
					accumulatedDist += anim.segmentDistances[i];
					if (accumulatedDist < trailDistance) {
						trailPoints.push(anim.waypoints[i + 1]);
					} else {
						break;
					}
				}
				trailPoints.push(anim.getPointAtDistance(trailDistance));
				anim.polyline.setLatLngs(trailPoints);
			} else {
				// Animate dashes flowing towards destination after drawing is complete
				// We offset the dash pattern based on elapsed time
				const flowSpeed = 40; // Lower is faster (ms per pixel)
				const dashOffset = anim.dashLength - ((elapsed / flowSpeed) % anim.dashLength);
				if (anim.polyline._path) {
					anim.polyline._path.style.strokeDashoffset = dashOffset;
				}
			}
		});

		if (keepAnimating) {
			animationFrameId = requestAnimationFrame(animate);
		}
	}

	if (routeAnimations.length > 0) {
		animationFrameId = requestAnimationFrame(animate);
		
		// Put the selected route on top of the translucent variants
		const selectedAnim = routeAnimations.find(a => a.routeIdx === selectedIndex);
		if (selectedAnim) {
			selectedAnim.polyline.bringToFront();
			map.fitBounds(L.latLngBounds(selectedAnim.waypoints), { padding: [40, 40] });
		} else {
			map.fitBounds(L.latLngBounds(routeAnimations[0].waypoints), { padding: [40, 40] });
		}
	}
}

function updateRouteHighlighting(selectedIndex) {
	routeAnimations.forEach(anim => {
		const isSelected = (anim.routeIdx === selectedIndex);
		const routeOpacity = isSelected ? 0.8 : 0.2;
		const routeWeight = isSelected ? 4 : 2;

		anim.polyline.setStyle({
			opacity: routeOpacity,
			weight: routeWeight
		});

		if (isSelected) {
			anim.polyline.bindPopup(`Selected Route ${anim.routeIdx + 1}`);
			anim.polyline.bringToFront();
		} else {
			anim.polyline.unbindPopup();
		}

		anim.markers.forEach(marker => {
			marker.setOpacity(isSelected ? 1.0 : 0.4);
		});
	});

	const selectedAnim = routeAnimations.find(a => a.routeIdx === selectedIndex);
	if (selectedAnim) {
		map.fitBounds(L.latLngBounds(selectedAnim.waypoints), { padding: [40, 40] });
	}
}
 
const routeDetailsElement = document.getElementById("route-details");
 
function formatDuration(mins) {
	const h = Math.floor(mins / 60);
	const m = Math.round(mins % 60);
	return `${h}h ${m}m`;
}
 
function getRouteText(route, index) {
	if (!route || !route.paths || route.paths.length === 0) {
		return "No route data available.";
	}
 
	const origin = route.paths[0]?.source || "N/A";
	const destination = route.paths[route.paths.length - 1]?.destination || "N/A";
	const totalStops = Math.max(0, route.paths.length - 1);
	const cabinClass = route.cabin_class || "Economy";
	const cabinDisplay = cabinClass === "premium_economy" ? "Premium Economy" : 
	                     cabinClass === "business" ? "Business" : 
	                     cabinClass === "first" ? "First Class" : "Economy";
	const tripType = route.trip_type === "return" ? "Round-Trip" : 
	                 route.trip_type === "multicity" ? "Multi-City" : "One-Way";
 
	let lines = [];
	lines.push(`Route ${index + 1}: ${origin} → ${destination}`);
	lines.push(`Type: ${tripType} | Class: ${cabinDisplay}`);
	lines.push(`Total: ${Math.round(route.total_distance)} km · ${formatDuration(route.total_time)} · $${route.price.toFixed(2)}`);
	lines.push(`Stops: ${totalStops}`);
	lines.push("");
 
	route.paths.forEach((path, i) => {
		const airlines = (path.airlines || [])
			.map((c) => c.name || c.iata || "Unknown")
			.join(", ") || "Unknown carrier";
		const segmentDuration = formatDuration(path.duration_min || 0);
		const segmentPrice = path.price ? `$${path.price.toFixed(2)}` : "$0.00";
		lines.push(`  ${i + 1}. ${path.source} → ${path.destination} | ${path.distance_km} km | ${segmentDuration} | ${segmentPrice} | ${airlines}`);
	});
 
	return lines.join("\n");
}
 
function renderRouteDetails(routeIndex) {
	if (!routeDetailsElement) {
		return;
	}
 
	if (!currentRoutes || currentRoutes.length === 0) {
		routeDetailsElement.textContent = "No routes found. Please select origin/destination and click Find Routes.";
		return;
	}
 
	if (routeIndex < 0 || routeIndex >= currentRoutes.length) {
		routeDetailsElement.textContent = "Selected route index is invalid.";
		return;
	}
 
	routeDetailsElement.textContent = getRouteText(currentRoutes[routeIndex], routeIndex);
}
 
function updateRouteButtonsDisplay() {
	const routeOptionButtons = document.querySelectorAll(".route-option");
}
const ROUTES_PER_PAGE = 4;
let currentPage = 0;
let selectedRouteIndex = 0;
 
const prevBtn = document.getElementById("prev-page");
const nextBtn = document.getElementById("next-page");
const pageInfo = document.getElementById("page-info");
const routeContainer = document.getElementById("route-options-container");
 
function updatePageNumber() {
    const pageNumberSpan = document.getElementById("page-number");
    pageNumberSpan.textContent = currentPage;
}
 
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
	const routeOptionButtons = document.querySelectorAll(".route-option");
 
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
	renderRouteDetails(routeIndex);
}
 
prevBtn.addEventListener("click", () => {
   if (currentPage > 0) {
        currentPage--;
        selectedRouteIndex = currentPage * ROUTES_PER_PAGE;
        updateRouteButtonsDisplay();
        displayRouteOnMap(selectedRouteIndex);
    }
});
 
nextBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(currentRoutes.length / ROUTES_PER_PAGE);
    if (currentPage < totalPages - 1) {
        currentPage++;
        selectedRouteIndex = currentPage * ROUTES_PER_PAGE;
        updateRouteButtonsDisplay();
        displayRouteOnMap(selectedRouteIndex);
    }
});
 
// ===============================================
// Airport search dropdown logic
// ===============================================
 
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
 
const filterButtons = document.querySelectorAll(".filter-option");
let selectedFilter = "shortest_distance";
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
const tripTypeSelect = document.getElementById("trip-type");
const departureDateInput = document.getElementById("departure-date");
const returnDateInput = document.getElementById("return-date");
const returnDateWrapper = document.getElementById("return-date-wrapper");
const cabinClassSelect = document.getElementById("cabin-class");
 
 
let airportsCache = [];
let popularAirports = [];
const airportByCode = new Map();
const POPULAR_AIRPORT_LIMIT = 20;
 
setupToggleButtons(filterButtons, async (button) => {
    selectedFilter = button.dataset.filter;
 
    filterButtons.forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
 
    filterButtons.forEach(btn => btn.setAttribute("aria-pressed", "false"));
    button.setAttribute("aria-pressed", "true");
});
 
const routeOptionButtons = document.querySelectorAll(".route-option");
setupToggleButtons(routeOptionButtons, (button) => {
	selectedRouteOption = button.dataset.routeOption;
	const routeIndex =
		currentPage * ROUTES_PER_PAGE + Array.from(routeOptionButtons).indexOf(button);
	selectRoute(routeIndex);
});
 
function buildAirportOptionLabel(airport) {
	return `${airport.country} | ${airport.code} | ${airport.name}`;
}
 
function getAirportSearchText(airport, query) {
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
 
	if (country.startsWith(query)) return 0;
	if (code.startsWith(query)) return 1;
	if (name.startsWith(query)) return 2;
	if (code.includes(query)) return 3;
	if (name.includes(query)) return 4;
	if (country.includes(query)) return 5;
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
 
function clearAirportSelection(inputElement, optionsElement, clearButtonElement) {
	inputElement.value = "";
	inputElement.dataset.airportCode = "";
	updateMarkerForInput(inputElement);
	clearRoutesAndButtons();
	renderFilteredOptions(inputElement, optionsElement);
	updateClearButtonVisibility(inputElement, clearButtonElement);
	inputElement.focus();
}
 
// ================================
// AIRPORT DROPDOWN LOGIC
// ================================
function createAirportOptionButton(airport, inputElement, optionsElement) {
    const optionButton = document.createElement("button");
    optionButton.type = "button";
    optionButton.className = "airport-option";
 
    const codeSpan = document.createElement("span");
    codeSpan.className = "airport-option-code";
    codeSpan.textContent = airport.code;
 
    const metaSpan = document.createElement("span");
    metaSpan.className = "airport-option-meta";
    metaSpan.textContent = airport.name;
 
    optionButton.appendChild(codeSpan);
    optionButton.appendChild(metaSpan);
 
    optionButton.addEventListener("click", () => {
        inputElement.value = `${airport.country} | ${airport.code} | ${airport.name}`;
        inputElement.dataset.airportCode = airport.code;
        inputElement.dataset.autoCompleted = "true";
 
        hideOptions(optionsElement);
        updateMarkerForInput(inputElement);
        clearRoutes();
        const clearBtn = inputElement.parentElement?.querySelector(".dropdown-clear");
        updateClearButtonVisibility(inputElement, clearBtn);
        inputElement.focus();
    });
 
    return optionButton;
}
 
function renderFilteredOptions(inputElement, optionsElement) {
    // FIX: Guard against airports not yet loaded
    if (!airportsCache || airportsCache.length === 0) {
        optionsElement.hidden = true;
        return;
    }
 
    optionsElement.innerHTML = "";
    const query = inputElement.value.trim().toLowerCase();
 
    const filteredAirports = airportsCache
        .filter(a =>
            (a.country || "").toLowerCase().includes(query) ||
            (a.name || "").toLowerCase().includes(query) ||
            (a.code || "").toLowerCase().includes(query) ||
            (a.icao || "").toLowerCase().includes(query)
        )
        .sort((a, b) => {
            const q = query;
            const score = a => 
                ((a.country || "").toLowerCase().startsWith(q) ? 0 : 10) +
                ((a.code || "").toLowerCase().startsWith(q) ? 1 : 10) +
                ((a.icao || "").toLowerCase().startsWith(q) ? 2 : 10) +
                ((a.name || "").toLowerCase().startsWith(q) ? 3 : 10);
            return score(a) - score(b);
        });
 
    if (filteredAirports.length === 0) {
        const empty = document.createElement("div");
        empty.className = "airport-option-empty";
        empty.textContent = query ? "No matching airports" : "No airports available";
        optionsElement.appendChild(empty);
        optionsElement.hidden = false;
        return;
    }
 
    // Group by country
    const grouped = {};
    filteredAirports.forEach(a => {
        const country = a.country || "Unknown";
        if (!grouped[country]) grouped[country] = [];
        grouped[country].push(a);
    });
 
    Object.keys(grouped).sort().forEach(country => {
        const header = document.createElement("div");
        header.className = "airport-group-header";
        header.textContent = `${country} (${grouped[country].length})`;
        optionsElement.appendChild(header);
 
        grouped[country].forEach(a => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "airport-option";
            btn.textContent = `${a.country} | ${a.code} | ${a.icao || "-"} | ${a.name}`;
            btn.addEventListener("click", () => {
                inputElement.value = `${a.country} | ${a.code} | ${a.name}`;
                inputElement.dataset.airportCode = a.code;
                optionsElement.hidden = true;
                updateMarkerForInput(inputElement);
                clearRoutesAndButtons();
            });
            optionsElement.appendChild(btn);
        });
    });
 
    optionsElement.hidden = false;
}
 
// FIX: wireSearchableDropdown is called ONCE per input, right here.
// The original code called it a second time near the swap button, which
// doubled all event listeners and caused the dropdown to close on open.
function wireSearchableDropdown(inputElement, optionsElement, containerElement) {
    const clearBtn = containerElement.querySelector(".dropdown-clear");
 
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            inputElement.value = "";
            inputElement.dataset.airportCode = "";
            renderFilteredOptions(inputElement, optionsElement);
            updateMarkerForInput(inputElement);
            clearRoutesAndButtons();
        });
    }
 
    inputElement.addEventListener("focus", () => {
        inputElement.dataset.airportCode = "";
        renderFilteredOptions(inputElement, optionsElement);
    });
 
    inputElement.addEventListener("input", () => {
        inputElement.dataset.airportCode = "";
        renderFilteredOptions(inputElement, optionsElement);
        updateMarkerForInput(inputElement);
        clearRoutesAndButtons();
    });
 
    // Single document click listener per dropdown — no duplicates
    document.addEventListener("click", (event) => {
        if (!containerElement.contains(event.target)) {
            optionsElement.hidden = true;
        }
    });
}
 
// ✅ Called ONCE each — fix applied here
wireSearchableDropdown(originInput, originOptions, originContainer);
wireSearchableDropdown(destinationInput, destinationOptions, destinationContainer);
 
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
		console.log("Airports loaded:", airports.length);
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
	originInput.dataset.airportCode = destinationInput.dataset.airportCode || "";
 
	destinationInput.value = currentOriginLabel;
	destinationInput.dataset.airportCode = currentOriginCode;
 
	updateMarkerForInput(originInput);
	updateMarkerForInput(destinationInput);
 
	const originClearButton = originInput.parentElement?.querySelector(".dropdown-clear");
	const destinationClearButton = destinationInput.parentElement?.querySelector(".dropdown-clear");
	updateClearButtonVisibility(originInput, originClearButton);
	updateClearButtonVisibility(destinationInput, destinationClearButton);
});
 
// Trip type dropdown handler
tripTypeSelect.addEventListener("change", (e) => {
	const tripType = e.target.value;
	if (tripType === "return") {
		returnDateWrapper.style.display = "";
	} else {
		returnDateWrapper.style.display = "none";
	}
});
 
findRoutesButton.addEventListener("click", async () => {
	const originAirport = originInput.dataset.airportCode || "";
	const destinationAirport = destinationInput.dataset.airportCode || "";
	const tripType = tripTypeSelect.value || "oneway";
	const cabinClass = cabinClassSelect.value || "economy";
	const departureDate = departureDateInput.value || null;
 
    findRoutesTimeout = setTimeout(async () => {
        findRoutesButton.disabled = true;
 
	if (!departureDate) {
		alert("Please select a departure date.");
		return;
	}
 
	if (tripType === "return" && !returnDateInput.value) {
		alert("Please select a return date for return trips.");
		return;
	}
 
	if (
		!(
			window.pywebview &&
			window.pywebview.api &&
			window.pywebview.api.get_routes
		)
	) {
		console.error("Python API not available for route finding.");
		alert("Route finding functionality is currently unavailable.");
		return;
	}
 
	try {
		const result = await window.pywebview.api.get_routes(
			originAirport,
			destinationAirport,
			selectedFilter,
			10,
			cabinClass,
			tripType,
			departureDate
		);
		if (!result || !result.ok) {
			console.error("Failed to retrieve routes:", result?.error);
			alert("Failed to retrieve routes. Please try again.");
			return;
		}
 
		console.log("Selected filter:", selectedFilter);
		console.log("Trip type:", tripType);
		console.log("Cabin class:", cabinClass);
		console.log("Departure date:", departureDate);
		console.log("Route finding result:", result.routes);
 
            if (!result || !result.ok) {
                alert("Failed to retrieve routes.");
                findRoutesButton.disabled = false;
                return;
            }
 
            currentRoutes = result.routes || [];
            currentPage = 0;
            selectedRouteIndex = 0;
 
            updateRouteButtonsDisplay();
 
            if (currentRoutes.length > 0) selectRoute(0);
        } catch (err) {
            console.error(err);
        } finally {
            findRoutesButton.disabled = false;
        }
    }, 200);
});
 
window.addEventListener("pywebviewready", loadAirports);