from pydantic import BaseModel, Field
from typing import Optional

# Response Schemas

class CostPricingIntelligence(BaseModel):
    gross_margin_percent: float = Field(..., description="Gross margin percentage")
    cost_to_serve_estimate: float = Field(..., description="Estimated cost to serve")
    profitability_per_sku: float = Field(..., description="Profitability per SKU")
    working_capital_impact: float = Field(..., description="Working capital impact")
    margin_sensitivity: str = Field(..., description="Margin sensitivity if reorder delayed")

class DemandIntelligence(BaseModel):
    demand_trend_14_30_days: str = Field(..., description="Demand trend forecast (14-30 days)")
    seasonality_pattern: str = Field(..., description="Detected seasonality pattern")
    yoy_demand_comparison: float = Field(..., description="Year-over-year demand comparison (%)")
    demand_spike_detection: bool = Field(..., description="Whether demand spike is detected")

class InventoryIntelligence(BaseModel):
    inventory_depletion_trend: str = Field(..., description="Inventory depletion trend")
    days_of_coverage_trend: float = Field(..., description="Days of coverage trend")
    overstock_understock_flag: str = Field(..., description="Overstock/Understock status")
    yoy_inventory_turnover: float = Field(..., description="Year-over-year inventory turnover comparison")

class KPISummaryResponse(BaseModel):
    cost_pricing_intelligence: CostPricingIntelligence
    demand_intelligence: DemandIntelligence
    inventory_intelligence: InventoryIntelligence
    model_accuracy: float = Field(..., description="ML Model accuracy (MAPE)")
    last_retrained: str = Field(..., description="Last retraining timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "cost_pricing_intelligence": {
                    "gross_margin_percent": 28.5,
                    "cost_to_serve_estimate": 1250.0,
                    "profitability_per_sku": 3400.0,
                    "working_capital_impact": 48000.0,
                    "margin_sensitivity": "High - 15% margin loss if delayed by 3 days"
                },
                "demand_intelligence": {
                    "demand_trend_14_30_days": "Upward trend with 12% growth expected",
                    "seasonality_pattern": "Weekly peak on weekends",
                    "yoy_demand_comparison": 18.5,
                    "demand_spike_detection": True
                },
                "inventory_intelligence": {
                    "inventory_depletion_trend": "Fast depletion - 4 days coverage remaining",
                    "days_of_coverage_trend": 4.2,
                    "overstock_understock_flag": "Understock",
                    "yoy_inventory_turnover": 22.3
                },
                "model_accuracy": 0.92,
                "last_retrained": "2026-02-27T10:30:00Z"
            }
        }

