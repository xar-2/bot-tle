from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security import APIKeyHeader
from fastapi.staticfiles import StaticFiles
from .routes import search_routes, download_routes, screenshot_routes
# from .routes import ai  # tambahkan jika ada ai router
import os
import uvicorn
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Bot-tle AI & Media Engine", version="2.0.0")

# Security
API_KEY = os.getenv("INTERNAL_API_TOKEN", "bot-tle-secret-key-123")
api_key_header = APIKeyHeader(name="X-API-KEY", auto_error=False)

async def verify_api_key(key: str = Security(api_key_header)):
    if key != API_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return key

# Routes
app.include_router(search_routes.router, dependencies=[Depends(verify_api_key)])
app.include_router(download_routes.router, dependencies=[Depends(verify_api_key)])
app.include_router(screenshot_routes.router, dependencies=[Depends(verify_api_key)])
# app.include_router(ai.router, dependencies=[Depends(verify_api_key)])

# Serve downloaded files via /files/ endpoint
if not os.path.exists("downloads"):
    os.makedirs("downloads")
app.mount("/files", StaticFiles(directory="downloads"), name="downloads")

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Bot-tle Engine",
        "version": "2.0.0",
        "docs": "/docs"
    }

@app.get("/ping")
async def ping():
    return {"status": "ok", "message": "Bot-tle Engine is running"}