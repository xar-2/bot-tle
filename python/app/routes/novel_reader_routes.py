from fastapi import APIRouter, HTTPException, Query
from ..services.web_scraper import scraper_service

router = APIRouter(prefix="/novel", tags=["Novel Reader"])

@router.get("/read")
async def read_novel(url: str = Query(...)):
    if not url.startswith("http"):
        return {"status": "error", "message": "URL tidak valid"}
        
    result = await scraper_service.extract_novel_text(url)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
        
    return result
