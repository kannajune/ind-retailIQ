from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.model.llm_schemas import LLMQueryRequest, LLMQueryResponse
from src.service.llm_service import LLMService
from src.dependencies.database import get_db_session

router = APIRouter()

# Service will be injected from app.py
llm_service: LLMService = None

def set_llm_service(service: LLMService):
    global llm_service
    llm_service = service

@router.post("/query", response_model=LLMQueryResponse, tags=["llm"])
async def query_llm(
    request: LLMQueryRequest,
    db_session: AsyncSession = Depends(get_db_session)
):
    """
    Ask the LLM a question about a specific run
    
    - **run_id**: Run identifier for context
    - **question**: User's question to the LLM
    """
    result = await llm_service.query_llm(
        run_id=request.run_id,
        question=request.question,
        db_session=db_session
    )
    return result
