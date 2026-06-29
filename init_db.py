import sqlite3, os
from dotenv import load_dotenv
from loguru import logger
load_dotenv()

def init_db(db_name:str):
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()

    logger.info(f"Initializing database: {db_name}...")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS wifi_measurements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            signal_strength INTEGER NOT NULL,
            ping_ms REAL NOT NULL
        )    
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS campus_pois (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            layer_type TEXT NOT NULL,
            name TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL
        )
    """)

    # TODO Add some example data to test 

    conn.commit()
    conn.close()
    logger.info("Database initialization completed!")


if __name__ == "__main__":
    db_name:str | None = os.getenv("DB_NAME")
    if not db_name:
        logger.error("Database name is not set in the environment variables.")
        raise ValueError("Database name is not set in the environment variables.")
    init_db(db_name)