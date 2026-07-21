# API Specifications

## Health Check 
- URL: `/api/health`
- Method: `GET`
- Response:
```json
{"status": "ok", "message": "NetSFC Server is running"}
```

## WiFi measurement report
- URL: `/api/measurements`
- Method: `POST`
- Payload (JSON)
```json
{
  "signal": 4,
  "ping_ms": 12.5,
  "bandwidth": 100.0, // In Mbps
  "coords": [35.3881, 139.4272]
}
```
- Response: 201 Created

## Get Specific Layer Items

- URL: `/api/layers/:layerType` (e.g., `/api/layers/water`)
- Method: `GET`
- Response (JSON)
```json
[
  {
    "id": 1,
    "name": "Delta Building 1F Water Dispenser",
    "layer_type": "water_fountain",
    "building": "Delta Building",
    "floor": "1F",
    "coords": [35.3881, 139.4272]
  }
]
```

## Get All POIs

- URL: `/api/pois`
- Method: `GET`
- Response (JSON)
```json
[
  {
    "id": 1,
    "name": "Delta Building 1F Water Dispenser",
    "layer_type": "water_fountain",
    "building": "Delta Building",
    "floor": "1F",
    "coords": [35.3881, 139.4272]
  }
]
```
