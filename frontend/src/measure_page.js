// Get user location after requesting permission, return Latitude/Lonitude and marker

const GEO_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0
}

function getLocation() {
    if (!navigator.geolocation) {
        setStatus('This browser does not support geolocation.', 'error');
        return;
    }

    setLoading(true);
    setStatus('Getting location info');
    hideCoords();

    navigator.geolocation.getCurrentPosition(
        success,
        errorResult,
        GEO_OPTIONS
    );
}

function success(position) {
    setLoading(false);

    const {latitude, longitude, accuracy, altitude } = position.coords;

    showCoords(latitude, longitude, accuracy); 
    setStatus(`Location acquired (±${Math.round(accuracy)} m accuracy).`, 'success');
    placeMarker(latitude, longitude, accuracy);
}

function errorResult(error) {
    setLoading(false);

    switch (error.code) {
        case 1: //Permission Denied
            setStatus(
                'Permission denied. To get location information, please give permission and try again', 'error'
            );
            break;
        case 2: //Postion unavaliable
            setStatus(
                'Position is unavliable. Try changing location.', 'error'
            );
            break;
        case 3: //Timed out
            setStatus(
                'GPS timed out, please try again', 'error'
            );
            break;
        default:
            setStatus('Unknown error (code ${error.code}): ${error.message}', 'error');
    }
}

function setLoading(loading) {
    const button = document.getElementById('button_locate');
    const spinner = document.getElementById('Spinner');
    const label = document.getElementById('button_label');

    button.disabled = loading;
    if (loading) {
        spinner.style.display = 'block';
        label.textContent = 'Locating';
    }
    else {
        spinner.style.display = 'none';
        label.textContent = 'Get my location';
    }
}

function setStatus(message, type = '') {
    const element = document.getElementById('status');
    element.textContent = message;
    element.className = type;
}

function showCoords(lat, long, acc) {
    const element = document.getElementById('coord');
    element.style.display = 'inline_block';
    element.textContent = `Lat: ${lat.toFixed(6)}°  Lng: ${long.toFixed(6)}°  ±${Math.round(acc)} m`;
}

function hideCoords() {
    document.getElementById('coords').style.display = 'none';
}