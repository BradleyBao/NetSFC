from fastapi import FastAPI, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import sqlite3, os, asyncio
from typing import Any, Dict, List
from dotenv import load_dotenv
from loguru import logger
from init_db import init_db
from typing import Coroutine, Any

load_dotenv()
APITITLE:str | None = os.getenv("APITITLE")
VERSION:str | None = os.getenv("VERSION")
DB_NAME:str | None = os.getenv("DB_NAME")

if not APITITLE or not VERSION or not DB_NAME:
    logger.error("Configuration Error")
    raise ValueError("Configuration Value is empty, check your .env")

app = FastAPI(title=APITITLE, version=VERSION)
init_db(DB_NAME)

# TODO Enable CORS for development, should be removed in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MeasurementReport(BaseModel):
    latitude: float = Field(...)
    longitude: float = Field(...)
    signal_strength: int = Field(..., ge=1, le=5)
    ping_ms: float = Field(...)

class POIResponse(BaseModel):
    id: int
    name: str
    layer_type: str
    latitude: float
    longitude: float

class ConnectionManager():
    def __init__(self):
        self.connections:list[WebSocket] = []
    
    async def connect(self, websocket:WebSocket):
        await websocket.accept()
        self.connections.append(websocket)
        logger.info("New connection established")

    def disconnect(self, websocket:WebSocket):
        if websocket in self.connections:
            self.connections.remove(websocket)
            logger.info("Client disconnected")

    async def broadcast_json(self, data: dict[str,str] | list[str]):
        if not self.connections:
            return 
        
        tasks:list[Coroutine[Any, Any, None]] = []
        for connection in self.connections:
            tasks.append(self._send_json(connection, data))
        await asyncio.gather(*tasks)

    async def _send_json(self, websocket:WebSocket, data: dict[str,str] | list[str]):
        try:
            await websocket.send_json(data)
        except Exception:
            self.disconnect(websocket)

manager = ConnectionManager()

@app.websocket("/ws/heatmap")
async def heatmap_websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"Unexpected WebSocket error: {str(e)}")
        manager.disconnect(websocket)

@app.post("/api/measurements", status_code=status.HTTP_201_CREATED)
async def report_measurement(report: MeasurementReport):
    try:
        # TODO Broadcast to all other devices using WebSocket
        if not DB_NAME:
            logger.error("Invalid Database Name")
            raise ValueError("Database invalid.")
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO wifi_measurements (latitude, longitude, signal_strength, ping_ms)
            VALUES (?, ?, ?, ?)
        ''', (report.latitude, report.longitude, report.signal_strength, report.ping_ms))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Measurement recorded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/layers/{layerType}", response_model=List[POIResponse])
async def get_layer_items(layerType: str):
    try:
        if not DB_NAME:
            logger.error("Invalid Database Name")
            raise ValueError("Database invalid.")
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, name, latitude, longitude 
            FROM campus_pois 
            WHERE layer_type = ?
        ''', (layerType,))
        rows = cursor.fetchall()
        conn.close()
        results:List[Dict[str, Any]] = [
            {
                "id": row[0], 
                "name": row[1], 
                "layer_type": layerType,
                "latitude": row[2], 
                "longitude": row[3]
            }
            for row in rows
        ]
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/health")
async def heart_beat():
    return {"status": "ok", "message": "NetSFC Server is running"}

