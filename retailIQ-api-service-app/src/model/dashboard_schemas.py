from pydantic import BaseModel, Field
from typing import List, Any

# Response Schemas

class ForecastData(BaseModel):
    next_14_days: int = Field(..., description="Forecasted demand for next 14 days")
    confidence: float = Field(..., description="Confidence score (0-1)")
    historical_data: List[Any] = Field(..., description="Historical data points")
    forecast_data: List[Any] = Field(..., description="Forecasted data points")
    
    class Config:
        json_schema_extra = {
            "example": {
                "next_14_days": 420,
                "confidence": 0.88,
                "historical_data": [],
                "forecast_data": []
            }
        }

class InventoryData(BaseModel):
    current_stock: int = Field(..., description="Current stock level")
    days_of_coverage: int = Field(..., description="Days of inventory coverage")
    risk_level: str = Field(..., description="Risk level (low|medium|high)")
    expiry_risk: str = Field(..., description="Expiry risk level (low|medium|high)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "current_stock": 120,
                "days_of_coverage": 4,
                "risk_level": "high",
                "expiry_risk": "low"
            }
        }

class OptimizationData(BaseModel):
    recommended_order_qty: int = Field(..., description="Recommended order quantity")
    order_by_days: int = Field(..., description="Days until order should be placed")
    working_capital_impact_percent: int = Field(..., description="Working capital impact percentage")
    
    class Config:
        json_schema_extra = {
            "example": {
                "recommended_order_qty": 350,
                "order_by_days": 2,
                "working_capital_impact_percent": 12
            }
        }

class LLMInsight(BaseModel):
    summary: str = Field(..., description="AI-generated insight summary")
    
    class Config:
        json_schema_extra = {
            "example": {
                "summary": "Based on projected demand increase..."
            }
        }

class DashboardResponse(BaseModel):
    sku: str = Field(..., description="SKU name or identifier")
    forecast: ForecastData = Field(..., description="Forecast information")
    inventory: InventoryData = Field(..., description="Inventory information")
    optimization: OptimizationData = Field(..., description="Optimization recommendations")
    llm_insight: LLMInsight = Field(..., description="LLM-generated insights")
    
    class Config:
        json_schema_extra = {
            "example": {
                "sku": "Sunflower Oil 1L",
                "forecast": {
                    "next_14_days": 420,
                    "confidence": 0.88,
                    "historical_data": [],
                    "forecast_data": []
                },
                "inventory": {
                    "current_stock": 120,
                    "days_of_coverage": 4,
                    "risk_level": "high",
                    "expiry_risk": "low"
                },
                "optimization": {
                    "recommended_order_qty": 350,
                    "order_by_days": 2,
                    "working_capital_impact_percent": 12
                },
                "llm_insight": {
                    "summary": "Based on projected demand increase..."
                }
            }
        }
