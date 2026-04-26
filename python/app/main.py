from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security import APIKeyHeader
from .routes import search_routes, download_routes
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env")

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

@app.get("/ping")
async def ping():
    return {"status": "ok", "message": "Bot-tle Engine is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
