// Get user location after requesting permission, return Latitude/Longitude and marker

const GEO_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0
}

const BOUNDS = {
    minLat: 139.424,
    minLng: 35.384,
    maxLat: 139.433,
    maxLng: 35.393,
}

function boundCheck(lat, lng) {
    return (
        lat >= BOUNDS.minLat &&
        lat <= BOUNDS.maxLat &&
        lng >= BOUNDS.minLng &&
        lng <= BOUNDS.maxLng
    );
}

function setStatus(message, type = '') {
    const el = document.getElementById('status');
    el.textContent = message;
    el.className = type;
}

function getLocation() {
    if (!navigator.geolocation) {
        document.getElementById('status').textContent = 'This browser does not support this feature.';
        return;
    }

    document.getElementById('button_locate').disabled = true;
    document.getElementById('status').textContent = 'Locating…';
    setStatus('Obtaining GPS Location...');

    navigator.geolocation.getCurrentPosition(success, errorResult, GEO_OPTIONS);
}

function success(position) {
    const { latitude, longitude, accuracy } = position.coords;

    document.getElementById('lat').textContent      = latitude.toFixed(6) + '°';
    document.getElementById('long').textContent     = longitude.toFixed(6) + '°';
    document.getElementById('accuracy').textContent = '±' + Math.round(accuracy) + ' m';
    document.getElementById('status').textContent   = 'Location acquired.';
    document.getElementById('button_locate').disabled = false;

    if (boundCheck(latitude, longitude)) {
        setStatus('Location acquired.', 'success');

        document.getElementById('heatmap-link').style.display = 'inline-flex';
        document.getElementById('bounds-status').textContent = 'You are in SFC Campus.';

        localStorage.setItem('latitude', latitude);
        localStorage.setItem('longitude', longitude);
        localStorage.setItem('accuracy', accuracy);
    }

    else {
        setStatus('Location acquired', 'success')

        document.getElementById('heatmap-link').style.display = 'none';
        document.getElementById('bounds-status').textContent = 'You are outside SFC Campus.';
    }
}

function errorResult(error) {
    const messages = {
        1: 'Permission denied, please allow location and try again.',
        2: 'Position unavailable, check if GPS is enabled.',
        3: 'Request timed out, please try again.'
    }

    setStatus(messages[error.code] || 'Unknown error.', 'error');
    document.getElementById('status').textContent    = messages[error.code] || 'Unknown error.';
    document.getElementById('button_locate').disabled = false;
}