// Generates a heatmap with zoom/pan support
// Should be able to show user location and display POI items directly on the map

const MAP_CONFIG = {
    center: [35.3883, 139.4283], // default center, SFC campus
    zoom: 17,
    minZoom: 10,
    maxZoom: 19,
}

const POI_ICONS = {
    washroom: '🚻',
    garbage: '🗑️',
    printer: '🖨️',
    water_fountain: '💧',
    elevator: '🛗',
    accessible_washroom: '♿',
    building: '🏢'
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
    // const url = `${window.ENV.API_HOST}/api/pois`;
    fetch("/data/facilities.json")
        .then(response => {
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            return response.json();
        })
        .then(facilities => {
            const { buildingItems, pointItems } = transformFacilities(facilities);
            placePOIs(buildingItems);
            placePOIs(pointItems);
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
                iconSize: [120, 34],
                iconAnchor: [8, 12],
                popupAnchor: [0, -12],
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

            const handleBuildingClick = (event) => {
                if (event.originalEvent) L.DomEvent.stopPropagation(event);
                openBuildingPanel(item);
                map.flyToBounds(polygon.getBounds(), { padding: [60, 60], duration: 0.5, maxZoom: 19 });
            };

            polygon.on('click', handleBuildingClick);
            polygon.on('mouseover', () => polygon.setStyle({ fillOpacity: 0.45 }));
            polygon.on('mouseout', () => polygon.setStyle({ fillOpacity: 0.25 }));

            const icon = POI_ICONS['building'] || '📍';
            const html = `
                <div class="poi-label">
                    <span class="poi-icon">${icon}</span>
                    <span class="poi-title">${labelText}</span>
                </div>
            `;
            const buildingIcon = L.divIcon({
                html,
                className: 'poi-div-icon',
                iconSize: [120, 24],
                iconAnchor: [60, 12],
                popupAnchor: [0, -12],
            });

            const centroid = getPolygonCentroid(item.coords);
            L.marker(centroid, { icon: buildingIcon, interactive: true })
                .addTo(map)
                .on('click', handleBuildingClick);

            return;
        }

        console.log('TODO: unsupported coords shape', item);
    });
}

function getPolygonCentroid(coords) {
    const total = coords.reduce((acc, [lat, lng]) => {
        acc.lat += lat;
        acc.lng += lng;
        return acc;
    }, { lat: 0, lng: 0 });

    return [total.lat / coords.length, total.lng / coords.length];
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

function transformFacilities(facilities) {
    const buildingPolygons = facilities.filter(f => f.layer_type === 'polygon');
    const pointFacilities = facilities.filter(f => f.layer_type !== 'polygon');

    // Group point facilities by building -> floor -> [item names]
    const groupedByBuilding = {};
    pointFacilities.forEach(f => {
        if (!f.building) return;
        if (!groupedByBuilding[f.building]) groupedByBuilding[f.building] = {};
        const floorKey = f.floor || 'Unspecified';
        if (!groupedByBuilding[f.building][floorKey]) groupedByBuilding[f.building][floorKey] = [];
        groupedByBuilding[f.building][floorKey].push(f.name);
    });

    // Building polygons -> match placePOIs' expected shape
    const buildingItems = buildingPolygons.map(poly => {
        const coords = poly.coords;

        const floorMap = groupedByBuilding[poly.building] || {};
        const floors = Object.keys(floorMap).map(floorLabel => ({
            level: floorLabel,
            label: floorLabel,
            classrooms: [],
            items: floorMap[floorLabel]
        }));

        return {
            layer_type: 'building', // note: still renamed here, so placePOIs' polygon-icon fallback text reads correctly
            name: poly.name,
            description: poly.description || '',
            coords: coords,
            floors: floors
        };
    });

    // Point facilities -> already have layer_type, coords already [lat, lng]
    const pointItems = pointFacilities.filter(f => f.coords); 

    return { buildingItems, pointItems };
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
