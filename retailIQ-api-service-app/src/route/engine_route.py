from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.model.engine_schemas import (
    RunEngineRequest,
    RunEngineResponse,
    ProcessingStatusResponse
)
from src.service.engine_service import EngineService
from src.dependencies.database import get_db_session

router = APIRouter()

# Service will be injected from app.py
engine_service: EngineService = None

def set_engine_service(service: EngineService):
    global engine_service
    engine_service = service

@router.post("/run", response_model=RunEngineResponse, tags=["engine"])
async def run_intelligence_engine(
    request: RunEngineRequest,
    db_session: AsyncSession = Depends(get_db_session)
):
    """
    Trigger the full AI intelligence pipeline
    
    - **dataset_id**: Identifier of the uploaded dataset
    - **sku_id**: SKU to process through the pipeline
    """
    result = await engine_service.run_intelligence_engine(
        dataset_id=request.dataset_id,
        sku_id=request.sku_id,
        db_session=db_session
    )
    return result

@router.post("/run-batch", tags=["engine"])
async def run_batch_intelligence_engine(
    request: dict,
    db_session: AsyncSession = Depends(get_db_session)
):
    """
    Trigger the AI pipeline for ALL SKUs in a dataset
    
    - **dataset_id**: Identifier of the uploaded dataset
    """
    dataset_id = request.get("dataset_id")
    result = await engine_service.run_batch_intelligence_engine(
        dataset_id=dataset_id,
        db_session=db_session
    )
    return result

@router.get("/status/{run_id}", response_model=ProcessingStatusResponse, tags=["engine"])
async def get_processing_status(
    run_id: str,
    db_session: AsyncSession = Depends(get_db_session)
):
    """
    Get the processing status of a specific run
    
    - **run_id**: Unique identifier of the engine run
    """
    result = await engine_service.get_processing_status(run_id, db_session)
    return result
