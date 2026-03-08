from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.database.models import (
    EngineRun, ForecastResult, InventoryData,
    OptimizationResult, LLMInsight
)

class DashboardService:
    async def get_dashboard_data(self, run_id: str, db_session: AsyncSession):
        """
        Aggregate all data for dashboard display
        """
        # Get engine run
        result = await db_session.execute(
            select(EngineRun).where(EngineRun.run_id == run_id)
        )
        engine_run = result.scalar_one_or_none()
        
        if not engine_run:
            raise ValueError(f"Run {run_id} not found")
        
        # Get forecast
        result = await db_session.execute(
            select(ForecastResult).where(ForecastResult.run_id == run_id)
        )
        forecast = result.scalar_one_or_none()
        
        # Get inventory
        result = await db_session.execute(
            select(InventoryData).where(InventoryData.run_id == run_id)
        )
        inventory = result.scalar_one_or_none()
        
        # Get optimization
        result = await db_session.execute(
            select(OptimizationResult).where(OptimizationResult.run_id == run_id)
        )
        optimization = result.scalar_one_or_none()
        
        # Get LLM insight
        result = await db_session.execute(
            select(LLMInsight).where(LLMInsight.run_id == run_id)
        )
        llm_insight = result.scalar_one_or_none()
        
        return {
            "sku": engine_run.sku_name or engine_run.sku_id,
            "forecast": {
                "next_14_days": forecast.next_14_days if forecast else 0,
                "confidence": forecast.confidence if forecast else 0.0,
                "historical_data": forecast.historical_data if forecast else [],
                "forecast_data": forecast.forecast_data if forecast else []
            },
            "inventory": {
                "current_stock": inventory.current_stock if inventory else 0,
                "days_of_coverage": inventory.days_of_coverage if inventory else 0,
                "risk_level": inventory.risk_level if inventory else "unknown",
                "expiry_risk": inventory.expiry_risk if inventory else "unknown"
            },
            "optimization": {
                "recommended_order_qty": optimization.recommended_order_qty if optimization else 0,
                "order_by_days": optimization.order_by_days if optimization else 0,
                "working_capital_impact_percent": optimization.working_capital_impact_percent if optimization else 0
            },
            "llm_insight": {
                "summary": llm_insight.summary if llm_insight else "No insights available"
            }
        }
