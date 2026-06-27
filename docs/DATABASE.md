# Database Schema

## Wi-Fi measurement
Stores crowdsourced Wi-Fi and ping data
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Primary Key, Autoincrement |
| `timestamp`| DATETIME| Auto-generated timestamp |
| `latitude` | REAL | Client GPS Latitude |
| `longitude`| REAL | Client GPS Longitude |
| `signal` | INTEGER | Wi-Fi Signal strength (dBm or scale 1-5) |
| `ping_ms`  | REAL | Latency in milliseconds |

## General campus position
Store campus facilities
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Primary Key |
| `layer_type`| TEXT | e.g., 'water', 'vending machines' |
| `name` | TEXT | Description of the spot |
| `latitude` | REAL | Fixed GPS Latitude |
| `longitude`| REAL | Fixed GPS Longitude |
