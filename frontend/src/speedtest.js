// Latency Checker by using fetch, calculates with package send time and response time
const API_HOST = window.ENV.API_HOST;

async function measureLatency() {
    const t1 = Date.now();
    
    const mockPayload = {
        latitude: 1.0, 
        longitude: 1.0, 
        signal: 3.0,
        signal_strength: 3.0,
        ping_ms: 1.0
    };
    
    const response = await fetch(`${API_HOST}/api/measurements`, { 
        method:  'POST',
        cache: 'no-store', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockPayload) 
    });
        
    const ping_ms = Date.now() - t1;     
    return ping_ms;
}

async function sendLatency(latitude, longitude, accuracy, ping_ms) {
    const parsedLat = parseFloat(latitude);
    const parsedLon = parseFloat(longitude);
    const parsedPing = parseFloat(ping_ms);
    const rawAccuracy = parseFloat(accuracy);
    
    let signalScore = 3.0; // Wasn't too sure what signal meant, will update later
    
    const info = {
        latitude: parsedLat,
        longitude: parsedLon,
        signal: signalScore,
        signal_strength: signalScore, 
        ping_ms: parsedPing,
    };
 
    const response = await fetch(`${API_HOST}/api/measurements`, {
        method:  'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(info)
    });
 
    return response;
}

async function checkLatency() {

    const button = document.getElementById('button_latency');
    const status = document.getElementById('latency_status');
    const result = document.getElementById('latency_result');

    const latitude = localStorage.getItem('latitude');
    const longitude = localStorage.getItem('longitude');
    const accuracy = localStorage.getItem('accuracy');

    button.disabled = true;
    result.textContent = '';    
    result.style.color = '#1a1a1a';
    status.style.color = '#555';
    status.textContent = 'Measuring Latency...';
    
    let ping_ms;

    try {
        ping_ms = await measureLatency();
    }
    catch (err) {
        status.textContent = 'Error reaching /api/measurements during handshake.';
        status.style.color = '#c0392b';
        result.textContent = `Details: ${err.message}`;
        result.style.color = '#c0392b';
        button.disabled = false;
        return;
    }

    try {
        const response = await sendLatency(latitude, longitude, accuracy, ping_ms);
        
        if (response.ok) {
            status.textContent = 'Data sent successfully.';
            status.style.color = '#2e7d52';
            result.textContent = `Latency: ${ping_ms} ms  (HTTP ${response.status})`;
            result.style.color = '#2e7d52';
        } else {
            const serverErrText = await response.text();
            status.textContent = `Server Internal Error (${response.status}).`;
            status.style.color = '#c0392b';
            result.textContent = `DB Error Logs: ${serverErrText}`;
            result.style.color = '#c0392b';
        }
    } 
    catch (err) {
        status.textContent = 'POST failed.';
        status.style.color = '#c0392b';
        result.textContent = `Details: ${err.message}`;
        result.style.color = '#c0392b';
    }
    button.disabled = false;
}
