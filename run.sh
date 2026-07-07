#!/bin/bash

VENV_DIR=".netsfc_pyvenv"

echo "Checking Virtual Environment..."
if [ ! -d "$VENV_DIR" ]; then
	echo "Virtual Environment not found."
	echo "Creating..."

	python3 -m venv "$VENV_DIR"
	source "$VENV_DIR/bin/activate"

	if [ -f "requirements.txt" ]; then
		echo "Installing requirements..."
		pip install --upgrade pip
		pip install -r requirements.txt
		echo "All dependencies installed."
	else
		echo "requirements.txt not found, installing baseline packages..."
		pip install fastapi uvicorn pydantic python-dotenv
		echo "Installed."
	fi
else
	echo "Virtual environment found, continuing..."
	source "$VENV_DIR/bin/activate"
fi

if [ -f ".env" ]; then
	echo "Loading .env"
	set -a
	source .env
	set +a
	echo "Loaded .env"
else
	echo "Error: .env file missing."
	echo "Please create a .env file with APITITLE, VERSION, DB_NAME, HOST, and PORT."
	exit 1
fi

echo "Starting server on $HOST:$PORT..."
uvicorn main:app --reload --host $HOST --port $PORT
