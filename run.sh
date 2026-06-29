#!/bin/bash
source .netsfc_pyvenv/bin/activate
export $(grep -v '^#' .env | xargs)
uvicorn main:app --reload --host $HOST --port $PORT