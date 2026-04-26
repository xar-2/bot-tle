from fastapi import APIRouter, HTTPException, Query
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

@router.post("/execute")
async def execute_download(req: DownloadRequest):
    try:
        result = await media_downloader.download(req.url, req.type, req.quality, req.user_id)
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
