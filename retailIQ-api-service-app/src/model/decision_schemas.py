from pydantic import BaseModel
from typing import Optional, List

class DecisionActionRequest(BaseModel):
    run_id: str
    action: str  # approve, modify, hold
    modified_qty: Optional[int] = None

class DecisionActionResponse(BaseModel):
    status: str
    po_id: Optional[str] = None

class ProductRecommendation(BaseModel):
    sku_id: str
    sku_name: str
    run_id: str
    current_stock: int
    recommended_order_qty: int
    order_by_days: int
    days_of_coverage: int
    risk_level: str
    working_capital_impact_percent: int
    forecast_next_14_days: int
    confidence: float
    status: str  # pending, approved, modified, held

class ProductRecommendationsResponse(BaseModel):
    dataset_id: str
    total_products: int
    recommendations: List[ProductRecommendation]
