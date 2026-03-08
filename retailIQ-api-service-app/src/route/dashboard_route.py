from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.model.dashboard_schemas import DashboardResponse
from src.service.dashboard_service import DashboardService
from src.dependencies.database import get_db_session

router = APIRouter()

# Service will be injected from app.py
dashboard_service: DashboardService = None

def set_dashboard_service(service: DashboardService):
    global dashboard_service
    dashboard_service = service

@router.get("/{run_id}", response_model=DashboardResponse, tags=["dashboard"])
async def get_dashboard_data(
    run_id: str,
    db_session: AsyncSession = Depends(get_db_session)
):
    """
    Get comprehensive dashboard data for a specific run
    
    Returns forecast, inventory, optimization, and LLM insights
    
    - **run_id**: Unique identifier of the engine run
    """
    result = await dashboard_service.get_dashboard_data(run_id, db_session)
    return result
