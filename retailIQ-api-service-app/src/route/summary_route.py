from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.model.summary_schemas import KPISummaryResponse
from src.service.summary_service import SummaryService
from src.dependencies.database import get_db_session

router = APIRouter()

# Service will be injected from app.py
summary_service: SummaryService = None

def set_summary_service(service: SummaryService):
    global summary_service
    summary_service = service

@router.get("/{run_id}", response_model=KPISummaryResponse, tags=["summary"])
async def get_kpi_summary(
    run_id: str,
    db_session: AsyncSession = Depends(get_db_session)
):
    """
    Get KPI summary after decision is made
    
    - **run_id**: Unique identifier of the engine run
    """
    result = await summary_service.get_kpi_summary(run_id, db_session)
    return result
