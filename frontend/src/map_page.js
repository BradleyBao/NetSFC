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

        // Handle Items
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
        
        // Handle Buildings
        if (item.coords.length > 2 && Array.isArray(item.coords[0])) {
            const labelText = item.name || item.layer_type.replace(/_/g, ' ');

            const polygon = L.polygon(item.coords, {
                color: '#3388ff',
                weight: 2,
                fillOpacity: 0.25,
                interactive: true
            }).addTo(map);

            polygon.bindTooltip(labelText, { direction: 'top', opacity: 0.85 });

            polygon.on('click', () => openBuildingPanel(item));
            polygon.on('mouseover', () => polygon.setStyle({ fillOpacity: 0.45 }));
            polygon.on('mouseout', () => polygon.setStyle({ fillOpacity: 0.25 }));

            return;
        }

        console.log('TODO: unsupported coords shape', item);
    });
}

let currentBuildingFloors = [];

function openBuildingPanel(item) {
    document.getElementById('building-panel-name').textContent = item.name || 'Unnamed building';
    document.getElementById('building-panel-description').textContent = item.description || '';

    currentBuildingFloors = item.floors || [];

    const tabsContainer = document.getElementById('building-floor-tabs');
    tabsContainer.innerHTML = '';

    if (currentBuildingFloors.length === 0) {
        document.getElementById('building-panel-classrooms').innerHTML = '';
        document.getElementById('building-panel-items').innerHTML = '';
    } else {
        currentBuildingFloors.forEach((floor, index) => {
            const tab = document.createElement('button');
            tab.className = 'building-floor-tab' + (index === 0 ? ' active' : '');
            tab.textContent = floor.label || `Floor ${floor.level}`;
            tab.addEventListener('click', () => selectFloor(index));
            tabsContainer.appendChild(tab);
        });
        renderFloorContent(currentBuildingFloors[0]);
    }

    document.getElementById('building-panel').classList.add('open');
}

function selectFloor(index) {
    const tabs = document.querySelectorAll('.building-floor-tab');
    tabs.forEach((tab, i) => tab.classList.toggle('active', i === index));
    renderFloorContent(currentBuildingFloors[index]);
}

function renderFloorContent(floor) {
    const classroomsEl = document.getElementById('building-panel-classrooms');
    const itemsEl = document.getElementById('building-panel-items');

    classroomsEl.innerHTML = (floor.classrooms || [])
        .map(c => `<li>${c}</li>`).join('') || '<li style="color:#999;">None listed</li>';

    itemsEl.innerHTML = (floor.items || [])
        .map(i => `<li>${i}</li>`).join('') || '<li style="color:#999;">None listed</li>';
}

document.getElementById('building-panel-close').addEventListener('click', () => {
    document.getElementById('building-panel').classList.remove('open');
});

// TEMP: force panel open with sample data for debugging
document.addEventListener('DOMContentLoaded', () => {
    // wait a tick to be sure `map` is initialized elsewhere in your app
    setTimeout(() => {
        const center = map.getCenter(); // uses wherever your map is already centered
        const offset = 0.0007; // roughly a small building's footprint

        const debugBuilding = {
            name: "Wilson Library (debug)",
            description: "Sample building shown by default for panel debugging.",
            layer_type: "building",
            coords: [
                [center.lat - offset, center.lng - offset],
                [center.lat - offset, center.lng + offset],
                [center.lat + offset, center.lng + offset],
                [center.lat + offset, center.lng - offset]
            ],
            floors: [
                {
                    level: 1,
                    label: "1st Floor",
                    classrooms: ["Reading Room A", "Reading Room B", "Info Desk"],
                    items: ["Printers (x4)", "Water fountain", "Lockers"]
                },
                {
                    level: 2,
                    label: "2nd Floor",
                    classrooms: ["Study Room 201", "Study Room 202", "Quiet Zone"],
                    items: ["Vending machine"]
                }
            ]
        };

        try {
            placePOIs([debugBuilding]);
        } catch (err) {
            console.error('placePOIs failed:', err);
        }

        // panel opens regardless of whether the polygon drew successfully
        openBuildingPanel(debugBuilding);
    }, 300);
});

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
