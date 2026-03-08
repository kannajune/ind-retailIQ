from pydantic import BaseModel, Field

# Request Schemas

class RetrainRequest(BaseModel):
    dataset_id: str = Field(..., description="Dataset identifier to use for retraining")
    
    class Config:
        json_schema_extra = {
            "example": {
                "dataset_id": "ds_001"
            }
        }

# Response Schemas

class RetrainResponse(BaseModel):
    status: str = Field(..., description="Retraining status")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "retraining_started"
            }
        }
