from pydantic import BaseModel, Field
from typing import Optional

# Response Schemas

class UploadPOSDataResponse(BaseModel):
    dataset_id: str = Field(..., description="Unique identifier for the uploaded dataset")
    total_skus: int = Field(..., description="Total number of SKUs in the dataset")
    total_transactions: int = Field(..., description="Total number of transactions")
    date_range: str = Field(..., description="Date range of the data (e.g., '2025-01-01 to 2025-03-31')")
    status: str = Field(..., description="Upload status")
    
    class Config:
        json_schema_extra = {
            "example": {
                "dataset_id": "ds_001",
                "total_skus": 1248,
                "total_transactions": 92430,
                "date_range": "2025-01-01 to 2025-03-31",
                "status": "uploaded"
            }
        }
