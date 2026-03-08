import uuid
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.database.models import (
    Decision, EngineRun, PurchaseOrder, OptimizationResult, 
    SKUMaster, ForecastResult, InventoryData, Dataset
)

class DecisionService:
    async def get_product_recommendations(
        self,
        dataset_id: str,
        db_session: AsyncSession = None
    ):
        """
        Get all product recommendations for a dataset
        """
        # Get all engine runs for this dataset
        result = await db_session.execute(
            select(EngineRun).where(EngineRun.dataset_id == dataset_id)
        )
        engine_runs = result.scalars().all()

        recommendations = []

        for run in engine_runs:
            # Get optimization result
            opt_result = await db_session.execute(
                select(OptimizationResult).where(OptimizationResult.run_id == run.run_id)
            )
            optimization = opt_result.scalar_one_or_none()

            # Get inventory data
            inv_result = await db_session.execute(
                select(InventoryData).where(InventoryData.run_id == run.run_id)
            )
            inventory = inv_result.scalar_one_or_none()

            # Get forecast result
            forecast_result = await db_session.execute(
                select(ForecastResult).where(ForecastResult.run_id == run.run_id)
            )
            forecast = forecast_result.scalar_one_or_none()

            # Get decision status if exists
            decision_result = await db_session.execute(
                select(Decision).where(Decision.run_id == run.run_id)
            )
            decision = decision_result.scalar_one_or_none()

            if optimization and inventory and forecast:
                recommendations.append({
                    "sku_id": run.sku_id,
                    "sku_name": run.sku_name or run.sku_id,
                    "run_id": run.run_id,
                    "current_stock": inventory.current_stock,
                    "recommended_order_qty": optimization.recommended_order_qty,
                    "order_by_days": optimization.order_by_days,
                    "days_of_coverage": inventory.days_of_coverage,
                    "risk_level": inventory.risk_level,
                    "working_capital_impact_percent": optimization.working_capital_impact_percent,
                    "forecast_next_14_days": forecast.next_14_days,
                    "confidence": forecast.confidence,
                    "status": decision.action if decision else "pending"
                })

        return {
            "dataset_id": dataset_id,
            "total_products": len(recommendations),
            "recommendations": recommendations
        }

    async def submit_decision(
        self,
        run_id: str,
        action: str,
        modified_qty: int = None,
        db_session: AsyncSession = None
    ):
        """
        Handle human-in-the-loop decision and create purchase order
        """
        # Verify run exists
        result = await db_session.execute(
            select(EngineRun).where(EngineRun.run_id == run_id)
        )
        engine_run = result.scalar_one_or_none()

        if not engine_run:
            raise ValueError(f"Run {run_id} not found")

        # Get optimization result for order quantity
        result = await db_session.execute(
            select(OptimizationResult).where(OptimizationResult.run_id == run_id)
        )
        optimization = result.scalar_one_or_none()

        # Get SKU master for lead time
        result = await db_session.execute(
            select(SKUMaster).where(SKUMaster.sku_id == engine_run.sku_id)
        )
        sku_master = result.scalar_one_or_none()

        # Determine order quantity
        if action == "modify" and modified_qty:
            order_qty = modified_qty
        elif optimization:
            order_qty = optimization.recommended_order_qty
        else:
            order_qty = 0

        # Generate PO ID and create purchase order if approved or modified
        po_id = None
        if action in ["approve", "modify"] and order_qty > 0:
            po_id = f"PO_{uuid.uuid4().hex[:6].upper()}"

            # Calculate expected delivery date
            lead_time_days = sku_master.lead_time_days if sku_master else 7
            expected_delivery = datetime.utcnow().date() + timedelta(days=lead_time_days)

            # Create purchase order
            purchase_order = PurchaseOrder(
                po_id=po_id,
                sku_id=engine_run.sku_id,
                order_qty=order_qty,
                status="approved",
                expected_delivery_date=expected_delivery,
                approved_at=datetime.utcnow()
            )

            db_session.add(purchase_order)

        # Save decision
        decision = Decision(
            run_id=run_id,
            action=action,
            modified_qty=modified_qty,
            po_id=po_id,
            decided_at=datetime.utcnow(),
            decided_by="user"  # TODO: Get from auth context
        )

        db_session.add(decision)
        await db_session.commit()
        
        # Update recommendation log with decision
        from src.database.models import RecommendationLog
        result = await db_session.execute(
            select(RecommendationLog).where(RecommendationLog.run_id == run_id)
        )
        rec_log = result.scalar_one_or_none()
        if rec_log:
            rec_log.decision_action = action
            rec_log.final_order_qty = modified_qty if action == "modify" else order_qty
            rec_log.po_id = po_id
            await db_session.commit()

        return {
            "status": action + "d",  # approved, modified, held
            "po_id": po_id
        }
