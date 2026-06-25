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
  "latitude": 35.388,
  "longitude": 139.427,
  "signal": 4,
  "ping_ms": 12.5
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
    "latitude": 35.3881,
    "longitude": 139.4272
  }
]
```
