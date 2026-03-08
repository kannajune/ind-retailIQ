from pydantic import BaseModel, Field
from typing import Dict

# Request Schemas

class RunEngineRequest(BaseModel):
    dataset_id: str = Field(..., description="Dataset identifier")
    sku_id: str = Field(..., description="SKU identifier to process")
    
    class Config:
        json_schema_extra = {
            "example": {
                "dataset_id": "ds_001",
                "sku_id": "SKU_101"
            }
        }

# Response Schemas

class RunEngineResponse(BaseModel):
    run_id: str = Field(..., description="Unique identifier for this engine run")
    status: str = Field(..., description="Processing status")
    
    class Config:
        json_schema_extra = {
            "example": {
                "run_id": "run_001",
                "status": "processing"
            }
        }

class ProcessingSteps(BaseModel):
    forecast: str = Field(..., description="Forecast step status")
    risk: str = Field(..., description="Risk analysis step status")
    optimization: str = Field(..., description="Optimization step status")
    llm: str = Field(..., description="LLM insight step status")
    
    class Config:
        json_schema_extra = {
            "example": {
                "forecast": "completed",
                "risk": "completed",
                "optimization": "completed",
                "llm": "completed"
            }
        }

class ProcessingStatusResponse(BaseModel):
    run_id: str = Field(..., description="Run identifier")
    steps: ProcessingSteps = Field(..., description="Status of each processing step")
    status: str = Field(..., description="Overall processing status")
    
    class Config:
        json_schema_extra = {
            "example": {
                "run_id": "run_001",
                "steps": {
                    "forecast": "completed",
                    "risk": "completed",
                    "optimization": "completed",
                    "llm": "completed"
                },
                "status": "completed"
            }
        }
