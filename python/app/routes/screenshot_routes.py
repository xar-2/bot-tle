from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
import os
import asyncio
from ..services.screenshot_service import screenshot_service

router = APIRouter(prefix="/screenshot", tags=["Screenshot"])

async def cleanup_file(file_path: str, delay: int = 300):
    await asyncio.sleep(delay)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            print(f"🗑 SS Cleanup: Deleted {file_path}")
        except:
            pass

@router.get("/")
async def take_ss(url: str = Query(...), background_tasks: BackgroundTasks = None):
    if not url.startswith("http"):
        url = "https://" + url
        
    try:
        file_path = await screenshot_service.take_screenshot(url)
        
        # Tambahkan tugas pembersihan otomatis setelah 5 menit
        if background_tasks:
            background_tasks.add_task(cleanup_file, file_path)
            
        return {
            "status": "success",
            "file_path": file_path,
            "filename": os.path.basename(file_path)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengambil screenshot: {str(e)}")
