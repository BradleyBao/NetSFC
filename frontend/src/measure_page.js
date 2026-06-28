// Get user location after requesting permission, return Latitude/Lonitude and marker

const GEO_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0
}

function getLocation() {
    if (!navigator.geolocation) {
        setStatus('This browser does not support this feature.', 'error');
        return;
    }

    document.getElementById('button_locate').disabled = true;
    document.getElementById('status').textContent = 'Locating';
 
    navigator.geolocation.getCurrentPosition(success, errorResult, GEO_OPTIONS);
}

function success(position) {
    const {latitude, longitude, accuracy } = position.coords;

    document.getElementById('lat').textContent      = latitude.toFixed(6) + '°';
    document.getElementById('long').textContent      = longitude.toFixed(6) + '°';
    document.getElementById('accuracy').textContent = 'Math.round(accuracy)' + 'm';
    document.getElementById('status').textContent   = 'Location acquired';
    document.getElementById('button_locate').disabled  = false;

    placeMarker(latitude, longitude, accuracy);
}

function errorResult(error) {
    const messages = {
        1: 'Permission denied, please allow location and try again.',
        2: 'Position unavailable, check if GPS is enabled.',
        3: 'Request timed out, please try again.'
    }

    document.getElementById('status').textContent  = messages[error.code] || 'Unknown error.';
    document.getElementById('button_locate').disabled = false;
}

