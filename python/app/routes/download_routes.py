from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
import asyncio
import os
from pydantic import BaseModel
from ..services.media_downloader import media_downloader

router = APIRouter(prefix="/download", tags=["Download"])

class DownloadRequest(BaseModel):
    url: str
    type: str = "best"
    quality: str = "best"
    user_id: str = "0"

@router.get("/info")
async def get_info(url: str = Query(...)):
    try:
        info = await media_downloader.get_info(url)
        return info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def cleanup_file(file_path: str, delay: int = 300):
    await asyncio.sleep(delay)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            print(f"🗑 Background cleanup: Deleted {file_path}")
        except Exception as e:
            print(f"❌ Error during cleanup: {e}")

@router.post("/execute")
async def execute_download(req: DownloadRequest, background_tasks: BackgroundTasks):
    try:
        result = await media_downloader.download(req.url, req.type, req.quality, req.user_id)
        # Add cleanup task (delete after 5 minutes)
        if "file_path" in result:
            background_tasks.add_task(cleanup_file, result["file_path"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/photos")
async def get_photos(url: str = Query(...), user_id: str = Query("0")):
    try:
        photos = await media_downloader.download_photos(url, user_id)
        return {"photos": photos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cancel")
async def cancel_download(req: DownloadRequest):
    media_downloader.cancel_download(req.user_id)
    return {"status": "success", "message": "Cancellation request received"}
