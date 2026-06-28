// Generates a heatmap with zoom/pan support
// Should be able to show user location

const MAP_CONFIG = {
    center: [35.3883, 139.4283], // default center, should be SFC campus
    zoom: 13,  // initial zoom level
    minZoom: 3, 
    maxZoom: 19,
}

const map = L.map('map', {
    center: MAP_CONFIG.center,
    zoom: MAP_CONFIG.zoom,
    minZoom: MAP_CONFIG.minZoom,
    maxZoom: MAP_CONFIG.maxZoom,

    zoomAnimation: true,
    fadeAnimation: true,
    zoomSnap: 0.5,
    zoomDelta: 0.5,
    wheelPixelZoomLevel: 80,

    inertia: true,
    inertiaDeceleration: 2000,
    inertiaMaxSpeed: 1500,
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribute: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: MAP_CONFIG.maxZoom,
    keepBuffer: 4,
    idleUpdate: false,
    zoomUpdate: false,
}).addTo(map);

const heatPoints = [];

const heatLayer = L.heatLayer(hearPoints, {
    radius: 35,
    blue: 25,
    maxZoom: MAP_CONFIG.maxZoom,
    gradient: { 0.4: 'blue', 0.7: 'orange', 1.0: 'red'}
}).addTo(map);

let currentMarker = null;
let accuracyCirle = null;

function placeMarker(lat, long, acc) {
    if (currentMarker) {
        map.removeLayer(currentMarker);
    }
    if (accuracyCirle) {
        map.removeLayer(accuracyCirle);
    }

    currentMarker = L.marker([lat,long])
        .addTo(map)
        .bindPopup(
            `<b>Your location</b><br>
            Lat: ${lat.toFixed(6)}°<br>
            Long: ${long.toFixed(6)}°<br>
            Accuracy: ±${Math.round(acc)} m`
    )
        .openPopup();

    accuracyCirle = L.circle([lat, long], {
        radius: acc,
        color:'#4f8ef7',
        fillColor:'#4f8ef7',
        fillOpacity: 0.15,
        weight: 1
    }).addTo(map); 
    
    map.flyToBounds(accuracyCirle.getBounds(), {
        padding: [48, 48],
        duration: 1.4,
        easeLinearity: 0.25,
    });

    addHeatmapPoint(lat, long, 1.0);
}

function addHeatmapPoint(lat, long, intensity = 1.0) {
    heatPoints.push([lat, long, intensity]);
    heatLayer.setLatLongs(heatPoints);
}