from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.model.learning_schemas import RetrainRequest, RetrainResponse
from src.service.learning_service import LearningService
from src.dependencies.database import get_db_session

router = APIRouter()

# Service will be injected from app.py
learning_service: LearningService = None

def set_learning_service(service: LearningService):
    global learning_service
    learning_service = service

@router.post("/retrain", response_model=RetrainResponse, tags=["learning"])
async def trigger_retraining(
    request: RetrainRequest,
    db_session: AsyncSession = Depends(get_db_session)
):
    """
    Trigger model retraining with a specific dataset
    
    - **dataset_id**: Dataset identifier to use for retraining
    """
    result = await learning_service.trigger_retraining(request.dataset_id, db_session)
    return result
