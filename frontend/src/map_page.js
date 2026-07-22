// Generates a heatmap with zoom/pan support
// Should be able to show user location and display POI items directly on the map
import { boundCheck } from './measure_page.js';

const MAP_CONFIG = {
    center: [35.3883, 139.4283], // default center, SFC campus
    zoom: 17,
    minZoom: 10,
    maxZoom: 22,
};

const POI_ICONS = {
    washroom: '🚻',
    garbage: '🗑️',
    printer: '🖨️',
    water_fountain: '🚰',
    elevator: '🛗',
    accessible_washroom: '♿',
    building: '🏢'
};

let map;
let heatLayer;
let heatPoints = [];

let userLocationMarker = null;
let userAccuracyCircle = null;
let currentUserLatLng = null;
let isFirstLocation = true;

let allPointFacilities = []; // Holds point items until building is called
let itemLayerGroup = null; // Tracks shown items on map
let categoryFilterLayerGroup = null; // Layer for global category filters (e.g., water fountains)

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
        maxNativeZoom: 19,
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
    initGeolocation();
    initSettingsModal();
    initCategoryChips();
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
            allPointFacilities = pointItems;
            placePOIs(buildingItems);
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
                iconSize: [100, 24],
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
                color: '#1a73e8',
                weight: 1.5,
                fillOpacity: 0.20,
                interactive: true
            }).addTo(map);

            polygon.bindTooltip(labelText, { direction: 'top', opacity: 0.85 });

            const handleBuildingClick = (event) => {
                if (event.originalEvent) L.DomEvent.stopPropagation(event);
                openBuildingPanel(item);
                map.flyToBounds(polygon.getBounds(), { padding: [60, 60], duration: 0.5, maxZoom: 19 });
            };

            polygon.on('click', handleBuildingClick);
            polygon.on('mouseover', () => polygon.setStyle({ fillOpacity: 0.40 }));
            polygon.on('mouseout', () => polygon.setStyle({ fillOpacity: 0.20 }));

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

// Get user locaton
function initGeolocation() {
    const locateBtn = document.getElementById('locate-btn');

    if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by your browser');
        return;
    }
    navigator.geolocation.watchPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;

            currentUserLatLng = [lat, lng];
            if (locateBtn) locateBtn.classList.add('active');

            // User Location Marker & Accuracy Circle
            if (userLocationMarker) {
                userLocationMarker.setLatLng(currentUserLatLng);
            } else {
                const userIcon = L.divIcon({
                    className: 'user-location-marker',
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                });
                userLocationMarker = L.marker(currentUserLatLng, { icon: userIcon }).addTo(map);
            }

            if (userAccuracyCircle) {
                userAccuracyCircle.setLatLng(currentUserLatLng);
                userAccuracyCircle.setRadius(accuracy);
            } else {
                userAccuracyCircle = L.circle(currentUserLatLng, {
                    radius: accuracy,
                    color: '#1a73e8',
                    fillColor: '#1a73e8',
                    fillOpacity: 0.12,
                    weight: 1.5,
                    interactive: false
                }).addTo(map);
            }

            // Locate user on first location update if user is in the campus bounds
            if (isFirstLocation && boundCheck(currentUserLatLng[0], currentUserLatLng[1])) {
                map.flyTo(currentUserLatLng, 18, { animate: true });
                isFirstLocation = false;
            }
        },
        (error) => {
            console.warn('Geolocation Error:', error.code, error.message);
            if (locateBtn) locateBtn.classList.remove('active');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 2000
        }
    );

    if (locateBtn) {
        locateBtn.addEventListener('click', () => {
            if (currentUserLatLng) {
                map.flyTo(currentUserLatLng, 18, { animate: true });
            } else {
                alert('Please check if location permissions are allowed.');
            }
        });
    }
}

// Category Filter Chips
function initCategoryChips() {
    const chipBtns = document.querySelectorAll('.chip-btn');

    chipBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            chipBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const category = btn.getAttribute('data-category');
            filterPOIsByCategory(category);
        });
    });
}

function filterPOIsByCategory(category) {
    if (categoryFilterLayerGroup) {
        map.removeLayer(categoryFilterLayerGroup);
        categoryFilterLayerGroup = null;
    }
    if (!category || category === 'all') return;

    categoryFilterLayerGroup = L.layerGroup().addTo(map);
    const matchingFacilities = allPointFacilities.filter(f => f.layer_type === category);

    matchingFacilities.forEach(item => {
        if (!item.coords || item.coords.length < 2) return;

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
            iconSize: [120, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -12],
        });

        L.marker([item.coords[0], item.coords[1]], { icon: poiIcon, interactive: true })
            .addTo(categoryFilterLayerGroup)
            .bindTooltip(labelText, {
                direction: 'top',
                offset: [0, -12],
                permanent: false,
                opacity: 0.85,
                className: 'poi-tooltip'
            });
    });
}

function initSettingsModal() {
    const gearBtn = document.getElementById('meta-settings-btn');
    const modal = document.getElementById('settings-modal');
    const closeBtn = document.getElementById('close-settings-btn');

    if (gearBtn && modal) {
        gearBtn.addEventListener('click', () => modal.classList.add('open'));
    }

    const closeModal = () => modal && modal.classList.remove('open');

    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
}

function showItemsForBuilding(buildingName) {
    // clear whatever items were shown for the previously clicked building
    if (itemLayerGroup) {
        map.removeLayer(itemLayerGroup);
        itemLayerGroup = null;
    }

    const matchingItems = allPointFacilities.filter(f => f.building === buildingName);
    if (matchingItems.length === 0) return;

    itemLayerGroup = L.layerGroup().addTo(map);

    matchingItems.forEach(item => {
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
            iconSize: [120, 24],
            iconAnchor: [8, 12],
            popupAnchor: [0, -12],
        });

        L.marker([item.coords[0], item.coords[1]], { icon: poiIcon, interactive: true })
            .addTo(itemLayerGroup)   // add to the group, not directly to map
            .bindTooltip(labelText, {
                direction: 'top',
                offset: [0, -12],
                permanent: false,
                opacity: 0.85,
                className: 'poi-tooltip'
            });
    });
}

let currentBuildingFloors = [];

function openBuildingPanel(item) {
    document.getElementById('building-panel-name').textContent = item.name || 'Unnamed building';
    document.getElementById('building-panel-description').textContent = item.description || '';

    currentBuildingFloors = item.floors || [];

    showItemsForBuilding(item.building || item.name); // Filter items by its building

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
    const imageEl = document.getElementById('building-floor-image');

    classroomsEl.innerHTML = (floor.classrooms || [])
        .map(c => `<li>${c}</li>`).join('') || '<li style="color:#999;">None listed</li>';

    itemsEl.innerHTML = (floor.items || [])
        .map(i => `<li>${i}</li>`).join('') || '<li style="color:#999;">None listed</li>';

    imageEl.src = floor.image_url || `https://placehold.co/600x375?text=${encodeURIComponent(floor.label || 'Floor Plan')}`;

}

function closeBuildingPanel() {
    document.getElementById('building-panel').classList.remove('open');

    if (itemLayerGroup) {
        map.removeLayer(itemLayerGroup);
        itemLayerGroup = null;
    }
}

document.getElementById('building-panel-close').addEventListener('click', () => {
    closeBuildingPanel();
});

function transformFacilities(facilities) {
    const buildingPolygons = facilities.filter(f => f.layer_type === 'polygon');
    const pointFacilities = facilities.filter(f => f.layer_type !== 'polygon');

    // Group point facilities by building -> floor -> items
    const groupedByBuilding = {};
    pointFacilities.forEach(f => {
        const buildingKey = f.building;
        if (!buildingKey) return;
        if (!groupedByBuilding[buildingKey]) groupedByBuilding[buildingKey] = {};
        const floorKey = f.floor || 'Unspecified';
        if (!groupedByBuilding[buildingKey][floorKey]) groupedByBuilding[buildingKey][floorKey] = [];
        groupedByBuilding[buildingKey][floorKey].push(f.name);
    });

    // Building polygons -> match placePOIs' expected shape
    const buildingItems = buildingPolygons.map(poly => {
        const coords = poly.coords;
        const buildingName = poly.building;
        const floorMap = groupedByBuilding[poly.building] || {};

        let declaredFloors = [];
        if (poly.floor) {
            const rawParts = poly.floor.split(',');
            for (let i = 0; i < rawParts.length; i++) {
                const trimmed = rawParts[i].trim();
                if (trimmed !== '') {
                    declaredFloors.push(trimmed);
                }
            }
        }

        const floorLabels = [];
        for (let i = 0; i < declaredFloors.length; i++) {
            if (!floorLabels.includes(declaredFloors[i])) {
                floorLabels.push(declaredFloors[i]);
            }
        }
        const facilityFloors = Object.keys(floorMap);
        for (let i = 0; i < facilityFloors.length; i++) {
            if (!floorLabels.includes(facilityFloors[i])) {
                floorLabels.push(facilityFloors[i]);
            }
        }

        const floors = floorLabels.map(floorLabel => ({
            level: floorLabel,
            label: floorLabel,
            classrooms: [],
            items: floorMap[floorLabel] || []
        }));

        return {
            layer_type: 'building', 
            name: buildingName,
            building: buildingName,
            description: poly.description || '',
            coords: coords,
            floors: floors
        };
    });

    const pointItems = pointFacilities.filter(f => f.coords); 

    return { buildingItems, pointItems };
}