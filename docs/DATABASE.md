# Database Schema

## 1. Wi-Fi Measurements (`wifi_measurements`)
Stores crowdsourced Wi-Fi speed and latency test data submitted by clients.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | Primary Key, Autoincrement | Unique measurement ID |
| `timestamp` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Auto-generated submission timestamp |
| `signal_strength` | INTEGER | NOT NULL | Wi-Fi Signal strength scale (e.g., 1-5) |
| `ping_ms` | REAL | NOT NULL | Network latency in milliseconds |

---

## 2. Campus Facilities & Buildings (`campus_pois`)
Stores campus POIs (Points of Interest), facilities, and building polygon geometries.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | Primary Key | Unique POI or Building ID |
| `name` | TEXT | NOT NULL | Name/description (e.g., 'Epsilon Building 2', 'Printer - Omicron Building') |
| `layer_type` | TEXT | NOT NULL | Facility type (e.g., 'printer', 'washroom', 'garbage', 'water_fountain', 'polygon') |
| `building` | TEXT | Nullable | Associated building name (e.g., 'Alpha Building', 'Epsilon Building') |
| `floor` | TEXT | Nullable | Floor location (e.g., '1F', '2F', 'B1F', '1F, 2F') |
| `coords` | TEXT | NOT NULL | JSON string array storing single point `[lat, lng]` or polygon array `[[lat, lng], ...]` |