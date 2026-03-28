/* ============================================================================
   FLIGHT ROUTE VISUALIZATION - RECENT CHANGES & IMPROVEMENTS
   ============================================================================
   
   CHANGES MADE:
   
   1. ENHANCED ROUTE CLEANUP (clearRouteVisualization)
      - Added safety checks using map.hasLayer() before removing polylines/markers
      - Prevents "ghost" visualizations when swapping routes or airports
      - Ensures clean state between route selections
   
   2. DIRECTION DETECTION & CORRECTION SYSTEM (displayRouteOnMap)
      - Detects when route is reversed relative to user's airport selection
      - Example: User selects Dubai→China but algorithm returns China→Dubai
      - Automatically corrects route.paths order AND waypoint order
      - Three-tier detection ensures direction always matches UI selection
      - Fixes the "direction shows opposite" bug when using airport swap
   
   3. ANIMATED ROUTE VISUALIZATION REPLACEMENT
      - Removed: leaflet-arrowheads plugin (unreliable CDN, alignment issues)
      - Added: CSS-based animated dashes (flow-dashes animation)
      - Benefits: No DOM alignment issues when zooming, performant, reliable
      - Dashes flow continuously from origin to destination
      - Duration: 2 seconds per animation cycle
   
   ============================================================================ */

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

function setAirportMarker(role, airport, preventZoom = false) {
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
		if (!preventZoom) updateMapViewport();
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

	if (!preventZoom) updateMapViewport();
}

function updateMarkerForInput(inputElement) {
	// Do not override global origin/destination markers when using multi-city inputs
	if (inputElement.id && inputElement.id.startsWith("mc-")) {
		return;
	}
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

	// Remove all waypoint markers (stops and destination markers) with layer existence check
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
	// Clear route data and visualization (but not button display)
	currentRoutes = [];
	clearRouteVisualization();
	if (routeDetailsElement) {
		routeDetailsElement.innerHTML = "<div class='route-empty'>No route selected.</div>";
		routeDetailsElement.style.height = "";
	}
}

function clearRoutesAndButtons() {
	// Clear route data, visualization, and button display
	currentRoutes = [];
	clearRouteVisualization();
	updateRouteButtonsDisplay();
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

	// Always clear and redraw to focus only on the selected route
	clearRouteVisualization();
	renderedRoutes = currentRoutes;

	const selectedIndex = routeIndex;
	const uiOriginCode = originInput.dataset.airportCode;
	const uiDestCode = destinationInput.dataset.airportCode;

	// 1. Determine styling for all lines based on the currently selected filter
	let baseColor, dashArray, dashLength, routePalette;
	if (selectedFilter.includes("fast")) {
		baseColor = "#16a34a";   // Green
		routePalette = ["#16a34a", "#15803d", "#064e3b", "#4ade80", "#22c55e"]; // Green shades
		dashArray = "15, 10";    // Dashed line
		dashLength = 25;
	} else if (selectedFilter.includes("cheap")) {
		baseColor = "#9333ea";   // Purple
		routePalette = ["#9333ea", "#7e22ce", "#4c1d95", "#c084fc", "#a855f7"]; // Purple shades
		dashArray = "5, 5";      // Dotted line
		dashLength = 10;
	} else if (selectedFilter.includes("fewest")) {
		baseColor = "#dc2626";   // Red
		routePalette = ["#dc2626", "#991b1b", "#450a0a", "#f87171", "#ef4444"]; // Red/Maroon shades
		dashArray = "15, 5";     // Alternate dashed line
		dashLength = 20;
	} else {
		baseColor = "#0284c7";   // Blue
		routePalette = ["#0284c7", "#0369a1", "#082f49", "#38bdf8", "#0ea5e9"]; // Blue shades
		dashArray = "12, 8";     // Flowing dashed line
		dashLength = 20;
	}

	let globalStartTime = null;

	// 2. Only draw the currently selected route
	currentRoutes.forEach((route, idx) => {
		if (idx !== selectedIndex) return;

		const isSelected = true;

		// Group paths by leg_index (for multi-city segments)
		const legs = [];
		route.paths.forEach(path => {
			const lIdx = path.leg_index || 0;
			if (!legs[lIdx]) legs[lIdx] = [];
			legs[lIdx].push(path);
		});

		legs.forEach((legPaths, legIdx) => {
			if (!legPaths || legPaths.length === 0) return;
			
			const waypoints = [];
			legPaths.forEach((path) => {
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
			// Only apply to standard routes, multi-city uses different inputs
			// ============================================================================
			if (route.trip_type !== "multicity" && route.trip_type !== "return") {
				const firstPath = legPaths[0];
				const lastPath = legPaths[legPaths.length - 1];

				if (firstPath.source === uiDestCode && lastPath.destination === uiOriginCode) {
					legPaths.reverse();
					waypoints.reverse();
				}

				if (
					(legPaths[0].source !== uiOriginCode || legPaths[legPaths.length - 1].destination !== uiDestCode) &&
					waypoints[0][0] === airportByCode.get(uiOriginCode)?.latitude &&
					waypoints[0][1] === airportByCode.get(uiOriginCode)?.longitude
				) {
					// Already consistent by waypoints, do nothing
				} else if (
					legPaths[0].source === uiOriginCode &&
					legPaths[legPaths.length - 1].destination === uiDestCode
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

			// Selected route is prominent
			const routeOpacity = 0.8;
			const routeWeight = 4;

			// Apply varying shades based on leg index rather than alternative route index
			const routeColor = (route.trip_type === "multicity" || route.trip_type === "return")
				? routePalette[legIdx % routePalette.length]
				: baseColor;

			const polyline = L.polyline([], { 
				color: routeColor,
				weight: routeWeight,
				dashArray: dashArray,
				lineCap: 'round',
				lineJoin: 'round',
				opacity: routeOpacity
			}).addTo(map);
			if (isSelected) {
				polyline.bindPopup(`Selected Route ${idx + 1}${route.trip_type === "multicity" ? " (Leg " + (legIdx + 1) + ")" : ""}`);
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

			// Standard routes rely on the UI origin marker, but multi-city needs its own
			let skipOrigin = false;
			if (route.trip_type !== "multicity" && route.trip_type !== "return") {
				skipOrigin = true;
				const prevLeg = legs[legIdx - 1];
				if (prevLeg && prevLeg.length > 0) {
					const prevDest = prevLeg[prevLeg.length - 1].destination;
					if (prevDest === legPaths[0].source) {
						skipOrigin = true; // Skip if it perfectly connects to previous leg's destination
					}
				}
			}

			// Plot waypoint markers for the selected route
			for (let i = skipOrigin ? 1 : 0; i < waypoints.length; i++) {
				const marker = L.marker(waypoints[i], { opacity: 1.0 }).addTo(map);
				
				let airportCode, markerLabel;
				
				if (i === 0) {
					airportCode = legPaths[0].source;
					const airport = airportByCode.get(airportCode);
					const airportName = airport?.name || "Unknown Airport";
					markerLabel = `<b>Origin</b><br>${airportCode} - ${airportName}`;
				} else {
					airportCode = i === waypoints.length - 1
							? legPaths[legPaths.length - 1].destination
							: legPaths[i - 1].destination;
					const airport = airportByCode.get(airportCode);
					const airportName = airport?.name || "Unknown Airport";
					markerLabel = i === waypoints.length - 1
							? `<b>Destination</b><br>${airportCode} - ${airportName}`
							: `<b>Stop</b><br>${airportCode} - ${airportName}`;
				}

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
		
		// Gather all waypoints across all legs for the selected route to fit bounds
		const allWaypoints = [];
		routeAnimations.forEach(anim => {
			anim.polyline.bringToFront();
			allWaypoints.push(...anim.waypoints);
		});
		
		if (allWaypoints.length > 0) {
			map.fitBounds(L.latLngBounds(allWaypoints), { padding: [40, 40] });
		}
	}
}

const routeDetailsElement = document.getElementById("route-details");

function formatDuration(mins) {
	const h = Math.floor(mins / 60);
	const m = Math.round(mins % 60);
	return `${h}h ${m}m`;
}

function renderRouteDetails(routeIndex) {
	if (!routeDetailsElement) {
		return;
	}

	if (!currentRoutes || currentRoutes.length === 0) {
		routeDetailsElement.innerHTML = "<div class='route-empty'>No routes found. Please select origin/destination and click Find Routes.</div>";
		routeDetailsElement.style.height = "";
		return;
	}

	if (routeIndex < 0 || routeIndex >= currentRoutes.length) {
		routeDetailsElement.innerHTML = "<div class='route-empty'>Selected route index is invalid.</div>";
		routeDetailsElement.style.height = "";
		return;
	}

	const route = currentRoutes[routeIndex];
	const totalStops = Math.max(0, route.paths.length - 1);
	const cabinClass = route.cabin_class || "Economy";
	const cabinDisplay = cabinClass === "premium_economy" ? "Premium Economy" : 
	                     cabinClass === "business" ? "Business" : 
	                     cabinClass === "first" ? "First Class" : "Economy";
	const tripType = route.trip_type === "return" ? "Round-Trip" : 
	                 route.trip_type === "multicity" ? "Multi-City" : "One-Way";

	let html = `<div class="structured-itinerary">`;
	
	html += `
	<div class="resize-handle-bar">
		<div class="resize-grabber left"></div>
		<div class="resize-grabber right"></div>
	</div>`;
	
	html += `<div class="itinerary-body">`;
	html += `<div class="itinerary-main">`;
	html += `<div class="itinerary-header">Route ${routeIndex + 1} (${tripType})</div>`;

	route.paths.forEach((path, i) => {
		const airlines = (path.airlines || []).map(c => c.name || c.iata || "Unknown").join(", ") || "Unknown carrier";
		const duration = formatDuration(path.duration_min || 0);
		
		const hasNextSameLeg = (i < route.paths.length - 1) && (route.paths[i + 1].leg_index === path.leg_index);

		if (i === 0 || route.paths[i].leg_index !== route.paths[i - 1].leg_index) {
			if (route.trip_type === "return" || route.trip_type === "multicity") {
				const legIdx = path.leg_index || 0;
				const legLabel = route.trip_type === "return" 
					? (legIdx === 0 ? "Outbound Flight" : "Return Flight") 
					: `Flight ${legIdx + 1}`;
				
				const extraStyle = i > 0 ? ' style="padding-top: 15px; border-top: 1px dashed #cbd5e1;"' : '';
				html += `<div class="leg-divider"${extraStyle}>${legLabel}</div>`;
			}
		}

		html += `
		<div class="flight-strip">
			<div class="strip-side left">
				<span class="strip-code">${path.source}</span>
			</div>
			<div class="strip-middle">
				<span class="strip-airline">${airlines}</span>
				<div class="strip-line"><span class="plane-icon">✈</span></div>
				<span class="strip-duration">${duration}</span>
			</div>
			<div class="strip-side right">
				<span class="strip-code">${path.destination}</span>
			</div>
		</div>`;

		if (hasNextSameLeg) {
			html += `
			<div class="layover-section">
				<div class="strip-side left"></div>
				<div class="layover-text">Layover in ${path.destination}</div>
				<div class="strip-side right"></div>
			</div>`;
		}
	});
	html += `</div>`;

	const stopsText = totalStops === 0 ? "Non-stop" : `${totalStops} Stop${totalStops > 1 ? 's' : ''}`;
	const co2Est = Math.round(route.total_distance * 0.115); // Rough CO2 estimate based on km

	html += `
	<div class="itinerary-sidebar">
		<div class="sidebar-item highlight">
			<span class="summary-label">Total Price</span>
			<span class="sidebar-value price">$${route.price.toFixed(2)}</span>
		</div>
		<div class="sidebar-item">
			<span class="sidebar-label">Flight Class</span>
			<span class="sidebar-value class-badge">${cabinDisplay}</span>
		</div>
		<div class="sidebar-item">
			<span class="sidebar-label">Est. CO₂</span>
			<span class="sidebar-value">${co2Est.toLocaleString()} kg</span>
		</div>
		<div class="sidebar-separator"></div>
		<div class="sidebar-item">
			<span class="sidebar-label">Total Distance</span>
			<span class="sidebar-value">${Math.round(route.total_distance).toLocaleString()} km</span>
		</div>
		<div class="sidebar-item">
			<span class="sidebar-label">Total Time</span>
			<span class="sidebar-value">${formatDuration(route.total_time)}</span>
		</div>
		<div class="sidebar-item">
			<span class="sidebar-label">Stops</span>
			<span class="sidebar-value">${stopsText}</span>
		</div>
	</div>`;

	html += `</div></div>`;
	routeDetailsElement.innerHTML = html;

	const resizeBar = routeDetailsElement.querySelector(".resize-handle-bar");
	if (resizeBar) {
		resizeBar.addEventListener("mousedown", (e) => {
			isDraggingDetails = true;
			dragStartY = e.clientY;
			dragStartHeight = routeDetailsElement.offsetHeight;
			document.body.style.cursor = "ns-resize";
			e.preventDefault();
		});
	}
}

// ===============================================
// Resize Drag Logic for Route Details
// ===============================================
let isDraggingDetails = false;
let dragStartY = 0;
let dragStartHeight = 0;

document.addEventListener("mousemove", (e) => {
	if (!isDraggingDetails) return;
	const deltaY = dragStartY - e.clientY;
	const newHeight = dragStartHeight + deltaY;
	const maxHeight = window.innerHeight * 0.5;
	
	if (newHeight >= 110 && newHeight <= maxHeight) {
		routeDetailsElement.style.height = `${newHeight}px`;
	} else if (newHeight > maxHeight) {
		routeDetailsElement.style.height = `${maxHeight}px`;
	} else {
		routeDetailsElement.style.height = "110px";
	}
});

document.addEventListener("mouseup", () => {
	if (isDraggingDetails) {
		isDraggingDetails = false;
		document.body.style.cursor = "";
	}
});

/// ===============================================
// Pagination state
// ===============================================
const ROUTES_PER_PAGE = 4;
let currentPage = 0;
let selectedRouteIndex = 0;

const prevBtn = document.getElementById("prev-page");
const nextBtn = document.getElementById("next-page");
const pageInfo = document.getElementById("page-info");

/**
 * Updates the prev/next button visibility and page indicator.
 * Rules:
 *  - Both buttons hidden when there are no routes
 *  - Prev hidden on first page (page 0)
 *  - Next hidden on last page
 *  - Page indicator hidden when no routes
 */
function updatePaginationControls() {
	const totalPages = Math.ceil(currentRoutes.length / ROUTES_PER_PAGE);

	if (!currentRoutes || currentRoutes.length === 0) {
		prevBtn.style.display = "none";
		nextBtn.style.display = "none";
		pageInfo.textContent = "";
		return;
	}

	// Show current page number (1-based for display)
	pageInfo.textContent = `${currentPage + 1}`;

	// Hide prev on first page, hide next on last page
	prevBtn.style.display = currentPage > 0 ? "flex" : "none";
	nextBtn.style.display = currentPage < totalPages - 1 ? "flex" : "none";
}

function updateRouteButtonsDisplay() {
	const routeOptionButtons = document.querySelectorAll(".route-option");
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
			if (detailSpans[0])
				detailSpans[0].textContent = `${Math.round(route.total_distance)} km · ${Math.floor(route.total_time / 60)}h ${Math.round(route.total_time % 60)}m`;
			if (detailSpans[1])
				detailSpans[1].textContent = `${stops} ${stops === 1 ? "stop" : "stops"} · $${Math.round(route.price)}`;

			btn.classList.toggle("active", routeIndex === selectedRouteIndex);
			btn.setAttribute("aria-pressed", routeIndex === selectedRouteIndex ? "true" : "false");
			btn.onclick = () => selectRoute(routeIndex);
		} else {
			// No route for this slot — hide the button
			btn.style.display = "none";
			btn.classList.remove("active");
			btn.setAttribute("aria-pressed", "false");
		}
	});

	updatePaginationControls();
}

function selectRoute(routeIndex) {
	if (routeIndex < 0 || routeIndex >= currentRoutes.length) return;

	selectedRouteIndex = routeIndex;
	currentPage = Math.floor(routeIndex / ROUTES_PER_PAGE);
	updateRouteButtonsDisplay();
	displayRouteOnMap(routeIndex);
	renderRouteDetails(routeIndex);
}

// Prev / Next button click handlers
prevBtn.addEventListener("click", () => {
	if (currentPage > 0) {
		currentPage--;
		selectedRouteIndex = currentPage * ROUTES_PER_PAGE;
		updateRouteButtonsDisplay();
		displayRouteOnMap(selectedRouteIndex);
		renderRouteDetails(selectedRouteIndex);
	}
});

nextBtn.addEventListener("click", () => {
	const totalPages = Math.ceil(currentRoutes.length / ROUTES_PER_PAGE);
	if (currentPage < totalPages - 1) {
		currentPage++;
		selectedRouteIndex = currentPage * ROUTES_PER_PAGE;
		updateRouteButtonsDisplay();
		displayRouteOnMap(selectedRouteIndex);
		renderRouteDetails(selectedRouteIndex);
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

// Set minimum date for standard date inputs to today
const now = new Date();
const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
if (departureDateInput) departureDateInput.min = todayStr;
if (returnDateInput) returnDateInput.min = todayStr;

// Ensure return date cannot be earlier than departure date
if (departureDateInput && returnDateInput) {
	departureDateInput.addEventListener("change", (e) => {
		const depValue = e.target.value;
		if (depValue) {
			returnDateInput.min = depValue;
			// If the user pushes the departure date past the current return date, bump return date +1 day
			if (returnDateInput.value && returnDateInput.value < depValue) {
				const parts = depValue.split('-');
				const depDate = new Date(parts[0], parts[1] - 1, parts[2]); // local date parsing avoids UTC shift
				depDate.setDate(depDate.getDate() + 1);
				returnDateInput.value = `${depDate.getFullYear()}-${String(depDate.getMonth() + 1).padStart(2, '0')}-${String(depDate.getDate()).padStart(2, '0')}`;
			}
		} else {
			returnDateInput.min = todayStr;
		}
	});
}

let airportsCache = [];
let popularAirports = [];
const airportByCode = new Map();
const POPULAR_AIRPORT_LIMIT = 20;

setupToggleButtons(filterButtons, (button) => {
	selectedFilter = button.dataset.filter;
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

// Add multi-city option to the trip type dropdown if not already present
if (!Array.from(tripTypeSelect.options).some(opt => opt.value === "multicity")) {
	const mcOption = document.createElement("option");
	mcOption.value = "multicity";
	mcOption.textContent = "Multi-City";
	tripTypeSelect.appendChild(mcOption);
}

let multiCityFlights = [];
const MAX_MULTICITY_FLIGHTS = 5;
let mcWrapper = null;
let previousTripType = tripTypeSelect.value || "oneway";

// Trip type dropdown handler
tripTypeSelect.addEventListener("change", (e) => {
	const tripType = e.target.value;
	
	// Identify standard input wrappers to toggle their visibility
	const originWrapper = originContainer.parentElement;
	const destWrapper = destinationContainer.parentElement;
	const depDateWrapper = departureDateInput.parentElement;
	const swapWrapper = document.getElementById("swap");

	// If switching between multicity and standard modes, clear everything to avoid ghost states
	if ((previousTripType === "multicity" && tripType !== "multicity") || 
		(previousTripType !== "multicity" && tripType === "multicity")) {
		
		clearRoutes();
		setAirportMarker("origin", null, true);
		setAirportMarker("destination", null, true);
		map.setView([20, 0], 2);
		
		// Clear standard inputs
		originInput.value = "";
		originInput.dataset.airportCode = "";
		destinationInput.value = "";
		destinationInput.dataset.airportCode = "";
		
		const originClearBtn = originContainer.querySelector(".dropdown-clear");
		const destClearBtn = destinationContainer.querySelector(".dropdown-clear");
		if (originClearBtn) originClearBtn.hidden = true;
		if (destClearBtn) destClearBtn.hidden = true;
		
		// Reset multi-city fields so they don't restore old inputs when switching back
		if (mcWrapper) {
			mcWrapper.remove();
			mcWrapper = null;
			multiCityFlights = [];
		}
	}
	previousTripType = tripType;

	if (tripType === "return") {
		returnDateWrapper.style.display = "";
		toggleStandardFields(true);
		if (mcWrapper) mcWrapper.style.display = "none";
		updateMarkerForInput(originInput);
		updateMarkerForInput(destinationInput);
	} else if (tripType === "multicity") {
		returnDateWrapper.style.display = "none";
		toggleStandardFields(false);
		
		if (!mcWrapper) {
			mcWrapper = createMultiCityUI();
		}
		mcWrapper.style.display = "block";
	} else {
		returnDateWrapper.style.display = "none";
		toggleStandardFields(true);
		if (mcWrapper) mcWrapper.style.display = "none";
		updateMarkerForInput(originInput);
		updateMarkerForInput(destinationInput);
	}

	function toggleStandardFields(show) {
		const display = show ? "" : "none";
		if (originWrapper) originWrapper.style.display = display;
		if (destWrapper) destWrapper.style.display = display;
		if (depDateWrapper) depDateWrapper.style.display = display;
		if (swapWrapper) swapWrapper.style.display = display;
	}
});

function updateMultiCityDateConstraints() {
	let currentMinDate = todayStr;
	multiCityFlights.forEach((flight) => {
		flight.date.min = currentMinDate;
		if (flight.date.value && flight.date.value < currentMinDate) {
			flight.date.value = ""; // Auto-clear if the new min-date constraint invalidates the current selection
		}
		if (flight.date.value) {
			currentMinDate = flight.date.value;
		}
	});
}

function createMultiCityUI() {
	const wrapper = document.createElement("div");
	wrapper.id = "multicity-wrapper";
	
	const flightsContainer = document.createElement("div");
	flightsContainer.id = "multicity-flights-container";
	wrapper.appendChild(flightsContainer);
	
	// Add first two flight pairs by default
	addMultiCityFlight(flightsContainer, 1);
	addMultiCityFlight(flightsContainer, 2);
	
	// Checkbox option to add more flights
	const addFlightWrapper = document.createElement("div");
	addFlightWrapper.className = "field-wrapper multicity-add-wrapper";
	
	const addFlightCheckbox = document.createElement("input");
	addFlightCheckbox.type = "checkbox";
	addFlightCheckbox.id = "add-flight-checkbox";
	
	const addFlightLabel = document.createElement("label");
	addFlightLabel.htmlFor = "add-flight-checkbox";
	addFlightLabel.textContent = " Add another flight (Max 5)";
	
	addFlightCheckbox.addEventListener("change", (e) => {
		if (e.target.checked) {
			if (multiCityFlights.length < MAX_MULTICITY_FLIGHTS) {
				addMultiCityFlight(flightsContainer, multiCityFlights.length + 1);
			}
			if (multiCityFlights.length >= MAX_MULTICITY_FLIGHTS) {
				addFlightWrapper.style.display = "none";
			}
			// Uncheck immediately so it acts as a reusable trigger
			setTimeout(() => { e.target.checked = false; }, 200);
		}
	});
	
	addFlightWrapper.appendChild(addFlightCheckbox);
	addFlightWrapper.appendChild(addFlightLabel);
	wrapper.appendChild(addFlightWrapper);
	
	// Insert wrapper just before the standard origin field so it sits under the header
	const originWrapper = originContainer.parentElement;
	originWrapper.parentElement.insertBefore(wrapper, originWrapper);
	
	return wrapper;
}

function addMultiCityFlight(container, index) {
	const flightDiv = document.createElement("div");
	flightDiv.className = "multicity-flight-row";
	flightDiv.dataset.flightIndex = index;

	const removeButtonHTML = index > 2
		? `<button type="button" class="remove-flight-btn" aria-label="Remove Flight ${index}">✖</button>`
		: '';

	flightDiv.innerHTML = `
		<div class="section-label" style="margin-top: 15px; color: #0ea5e9;">
			<span>FLIGHT ${index}</span>
			${removeButtonHTML}
		</div>
		<div class="field-wrapper">
			<label>Origin</label>
			<div class="field-input-box" id="mc-origin-container-${index}">
				<input type="text" id="mc-origin-${index}" class="airport-search-input" placeholder="City or Airport" autocomplete="off" />
				<span class="dropdown-clear" hidden>✖</span>
				<div id="mc-origin-options-${index}" class="airport-options" hidden></div>
			</div>
		</div>
		<div style="text-align: center; margin: -5px 0 5px 0;">
			<button type="button" id="mc-swap-${index}" class="action-button action-button-compact" style="width: auto; padding: 4px 12px; height: auto; margin: 0 auto; border-radius: 4px; display: inline-block;">
				<span class="icon">⇅</span> SWAP
			</button>
		</div>
		<div class="field-wrapper">
			<label>Destination</label>
			<div class="field-input-box" id="mc-dest-container-${index}">
				<input type="text" id="mc-dest-${index}" class="airport-search-input" placeholder="City or Airport" autocomplete="off" />
				<span class="dropdown-clear" hidden>✖</span>
				<div id="mc-dest-options-${index}" class="airport-options" hidden></div>
			</div>
		</div>
		<div class="field-wrapper">
			<label>Departure Date</label>
			<input type="date" id="mc-date-${index}" class="form-input" min="${todayStr}" />
		</div>
	`;
	container.appendChild(flightDiv);
	
	// Add event listener for the remove button if it exists
	if (index > 2) {
		const removeBtn = flightDiv.querySelector('.remove-flight-btn');
		removeBtn.addEventListener('click', () => removeMultiCityFlight(index));
	}
	
	const originInput = flightDiv.querySelector(`#mc-origin-${index}`);
	const originOptions = flightDiv.querySelector(`#mc-origin-options-${index}`);
	const originContainerNode = flightDiv.querySelector(`#mc-origin-container-${index}`);
	
	const destInput = flightDiv.querySelector(`#mc-dest-${index}`);
	const destOptions = flightDiv.querySelector(`#mc-dest-options-${index}`);
	const destContainerNode = flightDiv.querySelector(`#mc-dest-container-${index}`);
	
	const swapBtn = flightDiv.querySelector(`#mc-swap-${index}`);
	swapBtn.addEventListener("click", () => {
		const tempVal = originInput.value;
		const tempCode = originInput.dataset.airportCode || "";
		
		originInput.value = destInput.value;
		originInput.dataset.airportCode = destInput.dataset.airportCode || "";
		
		destInput.value = tempVal;
		destInput.dataset.airportCode = tempCode;
		
		updateClearButtonVisibility(originInput, originContainerNode.querySelector(".dropdown-clear"));
		updateClearButtonVisibility(destInput, destContainerNode.querySelector(".dropdown-clear"));
	});

	// Hook the new inputs up to your awesome existing dropdown logic
	wireSearchableDropdown(originInput, originOptions, originContainerNode);
	wireSearchableDropdown(destInput, destOptions, destContainerNode);
	
	const dateInput = flightDiv.querySelector(`#mc-date-${index}`);
	dateInput.addEventListener("change", updateMultiCityDateConstraints);
	
	multiCityFlights.push({
		origin: originInput,
		dest: destInput,
		date: dateInput
	});
	
	updateMultiCityDateConstraints();
}

function removeMultiCityFlight(indexToRemove) {
	const container = document.getElementById("multicity-flights-container");
	const flightDivToRemove = container.querySelector(`.multicity-flight-row[data-flight-index="${indexToRemove}"]`);
	if (!flightDivToRemove) return;

	// 1. Remove the DOM element
	container.removeChild(flightDivToRemove);

	// 2. Remove the corresponding flight object from our state array
	multiCityFlights.splice(indexToRemove - 1, 1);

	// 3. Show the "Add Flight" button again as we are no longer at the max limit
	const addFlightWrapper = document.getElementById('multicity-wrapper').querySelector('.multicity-add-wrapper');
	if (addFlightWrapper) {
		addFlightWrapper.style.display = "flex";
	}

	// 4. Renumber the labels, IDs, and listeners of all subsequent flight rows
	const remainingRows = container.querySelectorAll('.multicity-flight-row');
	remainingRows.forEach((row, i) => {
		const newIndex = i + 1;
		const oldIndex = parseInt(row.dataset.flightIndex, 10);

		// Only update rows that came after the one we removed
		if (oldIndex > indexToRemove) {
			row.dataset.flightIndex = newIndex;

			// Update "FLIGHT X" label
			row.querySelector('.section-label span').textContent = `FLIGHT ${newIndex}`;

			// Update all element IDs within this row to reflect the new index
			row.querySelectorAll('[id]').forEach(el => {
				el.id = el.id.replace(/-\d+$/, `-${newIndex}`);
			});

			// Update the remove button's functionality
			const removeBtn = row.querySelector('.remove-flight-btn');
			if (removeBtn) {
				removeBtn.setAttribute('aria-label', `Remove Flight ${newIndex}`);
				
				// Clone and replace the button to remove the old event listener
				// and add a new one with the correct new index
				const newBtn = removeBtn.cloneNode(true);
				removeBtn.parentNode.replaceChild(newBtn, removeBtn);
				newBtn.addEventListener('click', () => removeMultiCityFlight(newIndex));
			}
		}
	});
	
	updateMultiCityDateConstraints();
}

findRoutesButton.addEventListener("click", async () => {
	const tripType = tripTypeSelect.value || "oneway";
	const cabinClass = cabinClassSelect.value || "economy";

	// ---- Multi-city validation and payload ----
	if (tripType === "multicity") {
		const mcData = multiCityFlights.map(f => ({
			origin: f.origin.dataset.airportCode || "",
			dest: f.dest.dataset.airportCode || "",
			date: f.date.value || ""
		}));
		
		for (let i = 0; i < mcData.length; i++) {
			if (!mcData[i].origin || !mcData[i].dest || !mcData[i].date) {
				alert(`Please complete all fields (Origin, Destination, Date) for Flight ${i + 1}.`);
				return;
			}
		}

		try {
			const result = await window.pywebview.api.get_multicity_routes(
				mcData,
				selectedFilter,
				10,
				cabinClass
			);
			
			if (!result || !result.ok) {
				console.error("Failed to retrieve routes:", result?.error);
				alert("Failed to retrieve routes. Please try again.");
				return;
			}

			currentRoutes = result.routes;
			updateRouteButtonsDisplay();

			if (currentRoutes.length > 0) {
				selectRoute(0);
			} else {
				console.log("No routes found for the selected airports.");
			}
		} catch (error) {
			console.error("Error while finding routes:", error);
		}
		return;
	}

	// ---- Standard one-way / return validation ----
	const originAirport = originInput.dataset.airportCode || "";
	const destinationAirport = destinationInput.dataset.airportCode || "";
	const departureDate = departureDateInput.value || null;
	const returnDate = returnDateInput.value || null;

	if (!originAirport || !destinationAirport) {
		alert("Please select both origin and destination airports.");
		return;
	}

	if (!departureDate) {
		alert("Please select a departure date.");
		return;
	}

	if (tripType === "return" && !returnDate) {
		alert("Please select a return date for return trips.");
		return;
	}

	if (tripType === "return" && returnDate < departureDate) {
		alert("Return date cannot be earlier than the departure date.");
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
			departureDate,
			returnDate
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

		// Store routes and update display
		currentRoutes = result.routes;
		updateRouteButtonsDisplay();

		// Display the first route by default
		if (currentRoutes.length > 0) {
			selectRoute(0);
		} else {
			console.log("No routes found for the selected airports.");
		}
	} catch (error) {
		console.error("Error while finding routes:", error);
	}
});

window.addEventListener("pywebviewready", loadAirports);
