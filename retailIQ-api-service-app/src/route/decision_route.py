from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.model.decision_schemas import (
    DecisionActionRequest, 
    DecisionActionResponse,
    ProductRecommendationsResponse
)
from src.service.decision_service import DecisionService
from src.dependencies.database import get_db_session

router = APIRouter()

# Service will be injected from app.py
decision_service: DecisionService = None

def set_decision_service(service: DecisionService):
    global decision_service
    decision_service = service

@router.get("/recommendations/{dataset_id}", response_model=ProductRecommendationsResponse, tags=["decision"])
async def get_product_recommendations(
    dataset_id: str,
    db_session: AsyncSession = Depends(get_db_session)
):
    """
    Get all product recommendations for a dataset
    
    - **dataset_id**: Dataset identifier
    """
    result = await decision_service.get_product_recommendations(
        dataset_id=dataset_id,
        db_session=db_session
    )
    return result

@router.post("/action", response_model=DecisionActionResponse, tags=["decision"])
async def submit_decision(
    request: DecisionActionRequest,
    db_session: AsyncSession = Depends(get_db_session)
):
    """
    Submit a human-in-the-loop decision (approve/modify/hold)
    
    - **run_id**: Run identifier
    - **action**: Decision action (approve, modify, hold)
    - **modified_qty**: Modified quantity (only for 'modify' action)
    """
    result = await decision_service.submit_decision(
        run_id=request.run_id,
        action=request.action,
        modified_qty=request.modified_qty,
        db_session=db_session
    )
    return result
