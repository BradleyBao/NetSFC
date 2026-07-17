// Generates a heatmap with zoom/pan support
// Should be able to show user location and display POI items directly on the map

const MAP_CONFIG = {
    center: [35.3883, 139.4283], // default center, SFC campus
    zoom: 17,
    minZoom: 3,
    maxZoom: 21,
}

const POI_ICONS = {
    washroom: '🚻',
    garbage: '🗑️',
    printer: '🖨️',
    water_fountain: '💧',
    elevator: '🛗',
    accessible_washroom: '♿',
};

let map;
let heatLayer;
let heatPoints = [];
let currentMarker = null;
let accuracyCircle = null;

window.onload = function() {
    map = L.map('map', {
        center: MAP_CONFIG.center,
        zoom: MAP_CONFIG.zoom,
        minZoom: MAP_CONFIG.minZoom,
        maxZoom: MAP_CONFIG.maxZoom,

        zoomControl: false,
        zoomAnimation: true,
        fadeAnimation: true,
        markerZoomAnimation: true,
        zoomSnap: 0.5,
        zoomDelta: 0.5,
        wheelPxPerZoomLevel: 80,

        inertia: true,
        inertiaDeceleration: 2000,
        inertiaMaxSpeed: 1500,
    });

    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: MAP_CONFIG.maxZoom,
        keepBuffer: 4,
        updateWhenIdle: false,
        updateWhenZooming: false,
    }).addTo(map);

    heatLayer = L.heatLayer(heatPoints, {
        radius: 35,
        blur: 25,
        maxZoom: MAP_CONFIG.maxZoom,
        gradient: { 0.4: 'blue', 0.7: 'orange', 1.0: 'red' }
    }).addTo(map);

    loadPOIs();
};

function loadPOIs() {
    const url = `${window.ENV.API_HOST}/api/pois`;
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            return response.json();
        })
        .then(items => {
            placePOIs(items);
        })
        .catch(error => {
            console.error('Failed to load POIs', error);
        });
}

function placePOIs(items) {
    items.forEach(item => {
        if (!item.coords || !Array.isArray(item.coords)) {
            console.warn('Skipping POI without coords:', item);
            return;
        }

        if (item.coords.length === 2 && typeof item.coords[0] === 'number' && typeof item.coords[1] === 'number') {
            const icon = POI_ICONS[item.layer_type] || '📍';
            const labelText = item.name || item.layer_type.replace(/_/g, ' ');
            const html = `
                <div class="poi-label">
                    <span class="poi-icon">${icon}</span>
                    <span class="poi-title">${labelText}</span>
                </div>
            `;

            const poiIcon = L.divIcon({
                html,
                className: 'poi-div-icon',
                iconSize: [180, 34],
                iconAnchor: [10, 18],
                popupAnchor: [0, -18],
            });

            L.marker([item.coords[0], item.coords[1]], { icon: poiIcon, interactive: true })
                .addTo(map)
                .bindTooltip(labelText, {
                    direction: 'top',
                    offset: [0, -24],
                    permanent: false,
                    opacity: 0.85,
                    className: 'poi-tooltip'
                });
            return;
        }

        // TODO: support building or room polygons when coords is an array of multiple [lat, lon] points
        console.log('TODO: support polygon coords for building shapes', item);
    });
}

function placeMarker(lat, long, acc) {
    if (currentMarker) map.removeLayer(currentMarker);
    if (accuracyCircle) map.removeLayer(accuracyCircle);

    currentMarker = L.marker([lat, long])
        .addTo(map)
        .bindPopup(
            `<b>Your location</b><br>
            Lat: ${lat.toFixed(6)}°<br>
            Long: ${long.toFixed(6)}°<br>
            Accuracy: ±${Math.round(acc)} m`
        )
        .openPopup();

    accuracyCircle = L.circle([lat, long], {
        radius: acc,
        color: '#4f8ef7',
        fillColor: '#4f8ef7',
        fillOpacity: 0.15,
        weight: 1
    }).addTo(map);

    map.flyToBounds(accuracyCircle.getBounds(), {
        padding: [48, 48],
        duration: 1.4,
        easeLinearity: 0.25,
    });

    addHeatmapPoint(lat, long, 1.0);
}

function addHeatmapPoint(lat, long, intensity = 1.0) {
    heatPoints.push([lat, long, intensity]);
    heatLayer.setLatLngs(heatPoints);
}
