from fastapi import APIRouter, UploadFile, File, Form, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.model.ingestion_schemas import UploadPOSDataResponse
from src.service.ingestion_service import IngestionService
from src.dependencies.database import get_db_session

router = APIRouter()

# These will be injected from app.py
ingestion_service: IngestionService = None

def set_ingestion_service(service: IngestionService):
    global ingestion_service
    ingestion_service = service

@router.post("/upload", response_model=UploadPOSDataResponse, tags=["ingestion"])
async def upload_pos_data(
    pos_file: UploadFile = File(..., description="CSV file containing POS/Sales data"),
    inventory_file: UploadFile = File(..., description="CSV file containing Inventory data"),
    festival_mode: bool = Form(..., description="Festival mode flag"),
    promotion_active: bool = Form(..., description="Promotion active flag"),
    cash_constraint: bool = Form(..., description="Cash constraint flag"),
    db_session: AsyncSession = Depends(get_db_session)
):
    """
    Upload POS and Inventory data with business context
    
    - **pos_file**: CSV with POS transaction data (Date, Channel, Store_Id, Customer_Id, Order_Id, Department, Category, SKU_Id, SKU_Description, Quantity, Unit_of_Measure, Unit_Cost, Unit_Price, Promo_Flag, Delivery_Charges)
    - **inventory_file**: CSV with Inventory data (Date, Department, Category, Warehouse, SKU_Id, SKU_Description, On_Order, On_Hand_Quantity, Unit_of_Measure, Average_Landed_Cost)
    - **festival_mode**: Whether festival mode is active
    - **promotion_active**: Whether promotions are running
    - **cash_constraint**: Whether there are cash constraints
    """
    result = await ingestion_service.upload_pos_data(
        pos_file=pos_file,
        inventory_file=inventory_file,
        festival_mode=festival_mode,
        promotion_active=promotion_active,
        cash_constraint=cash_constraint,
        db_session=db_session
    )
    return result

@router.get("/skus/{dataset_id}", tags=["ingestion"])
async def get_dataset_skus(
    dataset_id: str,
    db_session: AsyncSession = Depends(get_db_session)
):
    """
    Get list of SKUs from an uploaded dataset
    """
    skus = await ingestion_service.get_dataset_skus(dataset_id, db_session)
    return {"dataset_id": dataset_id, "skus": skus, "total": len(skus)}
