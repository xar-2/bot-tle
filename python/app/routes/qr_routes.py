from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
import os
import asyncio
from ..services.qr_service import qr_service

router = APIRouter(prefix="/qr", tags=["QR Code"])

async def cleanup_file(file_path: str, delay: int = 300):
    await asyncio.sleep(delay)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            print(f"🗑 QR Cleanup: Deleted {file_path}")
        except:
            pass

@router.get("/generate")
async def generate(data: str = Query(...), background_tasks: BackgroundTasks = None):
    try:
        file_path = qr_service.generate_qr(data)
        
        if background_tasks:
            background_tasks.add_task(cleanup_file, file_path)
            
        return {
            "status": "success",
            "file_path": file_path,
            "filename": os.path.basename(file_path)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal membuat QR: {str(e)}")
