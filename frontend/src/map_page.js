// Generates a heatmap with zoom/pan support
// Should be able to show user location

const MAP_CONFIG = {
    center: [35.3883, 139.4283], // default center, SFC campus
    zoom: 17,
    minZoom: 3,
    maxZoom: 21,
}

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
};

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