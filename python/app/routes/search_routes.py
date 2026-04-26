from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..services.web_search import web_search_engine

router = APIRouter(prefix="/search", tags=["Search"])

class SearchRequest(BaseModel):
    query: str
    user_id: str = "0"

@router.post("/")
async def execute_search(req: SearchRequest):
    if not req.query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    try:
        response = web_search_engine.search(req.query)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
