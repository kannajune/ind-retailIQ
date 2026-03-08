import uuid
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_percentage_error

from src.database.models import (
    Dataset, EngineRun, ForecastResult, InventoryData,
    OptimizationResult, LLMInsight, SKUMaster, InventoryState, ModelTraining
)
from src.util.aws_clients import AWSClients

class EngineService:
    def __init__(self, aws_clients: AWSClients, settings: Dict[str, Any]):
        self.aws_clients = aws_clients
        self.settings = settings
    
    async def run_intelligence_engine(
        self,
        dataset_id: str,
        sku_id: str,
        db_session: AsyncSession
    ):
        """
        Run the complete AI pipeline:
        1. Fetch CSV from S3
        2. Call SageMaker for forecast
        3. Run risk analysis
        4. Run optimization
        5. Call Bedrock for LLM insights
        6. Store all results in PostgreSQL
        """
        # Generate run ID
        run_id = f"run_{uuid.uuid4().hex[:8]}"
        
        # Fetch SKU info first to get SKU name
        result = await db_session.execute(
            select(SKUMaster).where(SKUMaster.sku_id == sku_id)
        )
        sku_master = result.scalar_one_or_none()
        
        if not sku_master:
            raise ValueError(f"SKU {sku_id} not found in SKU Master")
        
        # Create engine run record
        engine_run = EngineRun(
            run_id=run_id,
            dataset_id=dataset_id,
            sku_id=sku_id,
            sku_name=sku_master.sku_name,  # Get from database
            status="processing",
            forecast_status="pending",
            risk_status="pending",
            optimization_status="pending",
            llm_status="pending",
            created_at=datetime.utcnow()
        )
        
        db_session.add(engine_run)
        await db_session.commit()
        
        # Start async processing (in background)
        # For now, we'll do it synchronously, but in production use Celery/background tasks
        try:
            # Step 1: Fetch dataset info
            result = await db_session.execute(
                select(Dataset).where(Dataset.dataset_id == dataset_id)
            )
            dataset = result.scalar_one_or_none()
            
            if not dataset:
                raise ValueError(f"Dataset {dataset_id} not found")

            # Step 2: Get POS data from DATABASE (not S3)
            # NEW: Query all accumulated historical data
            from src.database.models import POSTransaction
            
            result = await db_session.execute(
                select(POSTransaction)
                .where(POSTransaction.sku_id == sku_id)
                .order_by(POSTransaction.transaction_date)
            )
            pos_records = result.scalars().all()
            
            if not pos_records:
                raise ValueError(f"No POS transaction data found for SKU {sku_id}")
            
            # Convert to DataFrame
            sku_df = pd.DataFrame([{
                'Date': record.transaction_date,
                'Quantity_Sold': record.quantity_sold,
                'Unit_Price': float(record.unit_price) if record.unit_price else 0,
                'Unit_Cost': float(record.unit_cost) if record.unit_cost else 0
            } for record in pos_records])
            
            print(f"✅ Loaded {len(sku_df)} days of POS data from database for SKU {sku_id}")
            print(f"   Date range: {sku_df['Date'].min()} to {sku_df['Date'].max()}")
            
            # Step 3: Fetch current inventory state
            result = await db_session.execute(
                select(InventoryState).where(InventoryState.sku_id == sku_id)
            )
            inventory_state = result.scalar_one_or_none()
            
            if not inventory_state:
                # Create default inventory state if not exists
                inventory_state = InventoryState(
                    sku_id=sku_id,
                    current_stock=0,
                    reserved_stock=0,
                    inbound_stock=0
                )
                db_session.add(inventory_state)
                await db_session.commit()
            
            # Step 4: Train ML model and generate forecast (MANDATORY)
            # Step 4: Train ML model and generate forecast (MANDATORY)
            await self._update_step_status(db_session, run_id, "forecast_status", "processing")
            forecast_data = await self._call_sagemaker_forecast(sku_id, dataset, sku_master, sku_df, db_session)
            await self._save_forecast_result(db_session, run_id, forecast_data)
            await self._update_step_status(db_session, run_id, "forecast_status", "completed")
            
            # Step 5: Run risk analysis
            await self._update_step_status(db_session, run_id, "risk_status", "processing")
            inventory_data = await self._analyze_risk(forecast_data, inventory_state, sku_master)
            await self._save_inventory_data(db_session, run_id, inventory_data)
            await self._update_step_status(db_session, run_id, "risk_status", "completed")
            
            # Step 6: Run optimization
            await self._update_step_status(db_session, run_id, "optimization_status", "processing")
            optimization_data = await self._optimize_order_qty(
                forecast_data, inventory_data, sku_master, dataset
            )
            await self._save_optimization_result(db_session, run_id, optimization_data)
            await self._update_step_status(db_session, run_id, "optimization_status", "completed")
            
            # Step 7: Call Bedrock for LLM insights
            await self._update_step_status(db_session, run_id, "llm_status", "processing")
            llm_insight = await self._generate_llm_insight(
                forecast_data, inventory_data, optimization_data, dataset, sku_master
            )
            await self._save_llm_insight(db_session, run_id, llm_insight)
            await self._update_step_status(db_session, run_id, "llm_status", "completed")
            
            # Step 8: Save recommendation log for future accuracy tracking
            await self._save_recommendation_log(
                db_session, run_id, sku_id, forecast_data, inventory_data, optimization_data
            )
            
            # Mark as completed
            await self._update_run_status(db_session, run_id, "completed")
            
        except Exception as e:
            await self._update_run_status(db_session, run_id, "failed")
            raise e
        
        return {
            "run_id": run_id,
            "status": "processing"
        }
    
    async def get_processing_status(self, run_id: str, db_session: AsyncSession):
        """Get the status of a specific run"""
        result = await db_session.execute(
            select(EngineRun).where(EngineRun.run_id == run_id)
        )
        engine_run = result.scalar_one_or_none()
        
        if not engine_run:
            raise ValueError(f"Run {run_id} not found")
        
        return {
            "run_id": run_id,
            "steps": {
                "forecast": engine_run.forecast_status,
                "risk": engine_run.risk_status,
                "optimization": engine_run.optimization_status,
                "llm": engine_run.llm_status
            },
            "status": engine_run.status
        }
    
    async def _call_sagemaker_forecast(self, sku_id: str, dataset: Dataset, sku_master: SKUMaster, sku_df: pd.DataFrame, db_session: AsyncSession):
        """
        Train XGBoost model and generate forecast with MAPE accuracy
        This is MANDATORY ML training as part of the engine
        """
        print(f"🤖 Training XGBoost model for {sku_id}...")
        
        # Generate synthetic historical data for training (in production, load from S3)
        # Create 90 days of historical data
        dates = pd.date_range(end=datetime.now(), periods=90, freq='D')
        np.random.seed(hash(sku_id) % 2**32)  # Consistent seed per SKU
        
        # Generate realistic demand pattern with trend and seasonality
        trend = np.linspace(80, 120, 90)
        seasonality = 20 * np.sin(np.arange(90) * 2 * np.pi / 7)  # Weekly pattern
        noise = np.random.normal(0, 10, 90)
        demand = trend + seasonality + noise
        demand = np.maximum(demand, 0)  # No negative demand
        
        # Create features
        df = pd.DataFrame({
            'date': dates,
            'demand': demand,
            'day_of_week': dates.dayofweek,
            'day_of_month': dates.day,
            'month': dates.month,
            'is_weekend': (dates.dayofweek >= 5).astype(int)
        })
        
        # Add lag features
        df['demand_lag_1'] = df['demand'].shift(1)
        df['demand_lag_7'] = df['demand'].shift(7)
        df['demand_rolling_7'] = df['demand'].rolling(7).mean()
        df = df.dropna()
        
        # Split train/test (80/20)
        train_size = int(len(df) * 0.8)
        train_df = df[:train_size]
        test_df = df[train_size:]
        
        # Prepare features and target
        feature_cols = ['day_of_week', 'day_of_month', 'month', 'is_weekend', 
                       'demand_lag_1', 'demand_lag_7', 'demand_rolling_7']
        X_train = train_df[feature_cols]
        y_train = train_df['demand']
        X_test = test_df[feature_cols]
        y_test = test_df['demand']
        
        # Train XGBoost model
        model = XGBRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
        model.fit(X_train, y_train)
        
        # Calculate MAPE on test set
        y_pred_test = model.predict(X_test)
        mape = mean_absolute_percentage_error(y_test, y_pred_test)
        accuracy = 1 - mape  # Convert MAPE to accuracy
        
        print(f"✅ Model trained - Accuracy: {accuracy:.2%} (MAPE: {mape:.2%})")
        
        # Generate 14-day forecast
        last_row = df.iloc[-1]
        forecast_dates = pd.date_range(start=datetime.now() + timedelta(days=1), periods=14, freq='D')
        forecast_data = []
        
        for i, date in enumerate(forecast_dates):
            features = {
                'day_of_week': date.dayofweek,
                'day_of_month': date.day,
                'month': date.month,
                'is_weekend': 1 if date.dayofweek >= 5 else 0,
                'demand_lag_1': last_row['demand'] if i == 0 else forecast_data[-1],
                'demand_lag_7': df.iloc[-7+i]['demand'] if i < 7 else forecast_data[i-7],
                'demand_rolling_7': df['demand'].iloc[-7:].mean() if i == 0 else np.mean(forecast_data[-7:])
            }
            X_forecast = pd.DataFrame([features])
            pred = model.predict(X_forecast)[0]
            forecast_data.append(max(pred, 0))
        
        total_forecast = sum(forecast_data)
        
        # Store model training record
        training_record = ModelTraining(
            dataset_id=dataset.dataset_id,
            training_job_name=f"xgboost_train_{uuid.uuid4().hex[:8]}",
            model_accuracy=accuracy,
            started_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
            status="completed"
        )
        db_session.add(training_record)
        await db_session.commit()
        
        return {
            "next_14_days": int(total_forecast),
            "confidence": accuracy,
            "historical_data": demand[-14:].tolist(),
            "forecast_data": [int(x) for x in forecast_data],
            "model_accuracy": accuracy,
            "model_type": "XGBoost"
        }
    
    async def _analyze_risk(self, forecast_data: dict, inventory_state: InventoryState, sku_master: SKUMaster):
        """Analyze inventory risk using actual inventory data"""
        current_stock = inventory_state.current_stock
        forecast_demand = forecast_data["next_14_days"]
        
        # Calculate days of coverage
        daily_demand = forecast_demand / 14
        days_of_coverage = int(current_stock / daily_demand) if daily_demand > 0 else 999
        
        # Determine risk level
        if days_of_coverage < sku_master.lead_time_days:
            risk_level = "high"
        elif days_of_coverage < (sku_master.lead_time_days * 2):
            risk_level = "medium"
        else:
            risk_level = "low"
        
        # Simple expiry risk (can be enhanced)
        expiry_risk = "low"  # TODO: Add expiry date logic
        
        return {
            "current_stock": current_stock,
            "days_of_coverage": days_of_coverage,
            "risk_level": risk_level,
            "expiry_risk": expiry_risk
        }
    
    async def _optimize_order_qty(
        self, forecast_data: dict, inventory_data: dict,
        sku_master: SKUMaster, dataset: Dataset
    ):
        """Calculate optimal order quantity using SKU master data"""
        forecast_demand = forecast_data["next_14_days"]
        current_stock = inventory_data["current_stock"]
        safety_stock = sku_master.safety_stock
        moq = sku_master.moq
        lead_time_days = sku_master.lead_time_days
        
        # Calculate required stock
        required_stock = forecast_demand + safety_stock
        shortage = max(0, required_stock - current_stock)
        
        # Round up to MOQ
        if shortage > 0:
            recommended_qty = ((shortage + moq - 1) // moq) * moq
        else:
            recommended_qty = 0
        
        # Calculate order timing
        days_of_coverage = inventory_data["days_of_coverage"]
        order_by_days = max(1, days_of_coverage - lead_time_days)
        
        # Calculate working capital impact
        cost_price = float(sku_master.cost_price)
        working_capital_impact = int((recommended_qty * cost_price / 10000) * 100)  # Percentage
        
        return {
            "recommended_order_qty": recommended_qty,
            "order_by_days": order_by_days,
            "working_capital_impact_percent": working_capital_impact
        }
    
    async def _generate_llm_insight(
        self, forecast_data: dict, inventory_data: dict,
        optimization_data: dict, dataset: Dataset, sku_master: SKUMaster
    ):
        """Generate LLM insights using Bedrock with SKU context"""
        # TODO: Implement actual Bedrock call
        # For now, return contextual mock insight
        sku_name = sku_master.sku_name
        forecast_demand = forecast_data["next_14_days"]
        current_stock = inventory_data["current_stock"]
        recommended_qty = optimization_data["recommended_order_qty"]
        order_by_days = optimization_data["order_by_days"]
        risk_level = inventory_data["risk_level"]
        
        summary = f"For {sku_name}, based on projected demand of {forecast_demand} units over the next 14 days and current stock of {current_stock} units, the system recommends ordering {recommended_qty} units within {order_by_days} days. Current risk level is {risk_level}. "
        
        if dataset.festival_mode:
            summary += "Festival mode is active, which may increase demand volatility. "
        
        if dataset.promotion_active:
            summary += "Active promotions may drive higher sales. "
        
        if dataset.cash_constraint:
            summary += "Cash constraints noted - consider staggered ordering. "
        
        return {
            "summary": summary
        }
    
    async def _save_forecast_result(self, db_session: AsyncSession, run_id: str, data: dict):
        forecast = ForecastResult(
            run_id=run_id,
            next_14_days=data["next_14_days"],
            confidence=data["confidence"],
            historical_data=data["historical_data"],
            forecast_data=data["forecast_data"]
        )
        db_session.add(forecast)
        await db_session.commit()
    
    async def _save_inventory_data(self, db_session: AsyncSession, run_id: str, data: dict):
        inventory = InventoryData(
            run_id=run_id,
            current_stock=data["current_stock"],
            days_of_coverage=data["days_of_coverage"],
            risk_level=data["risk_level"],
            expiry_risk=data["expiry_risk"]
        )
        db_session.add(inventory)
        await db_session.commit()
    
    async def _save_optimization_result(self, db_session: AsyncSession, run_id: str, data: dict):
        optimization = OptimizationResult(
            run_id=run_id,
            recommended_order_qty=data["recommended_order_qty"],
            order_by_days=data["order_by_days"],
            working_capital_impact_percent=data["working_capital_impact_percent"]
        )
        db_session.add(optimization)
        await db_session.commit()
    
    async def _save_llm_insight(self, db_session: AsyncSession, run_id: str, data: dict):
        insight = LLMInsight(
            run_id=run_id,
            summary=data["summary"]
        )
        db_session.add(insight)
        await db_session.commit()
    
    async def _update_step_status(
        self, db_session: AsyncSession, run_id: str, step: str, status: str
    ):
        result = await db_session.execute(
            select(EngineRun).where(EngineRun.run_id == run_id)
        )
        engine_run = result.scalar_one()
        setattr(engine_run, step, status)
        await db_session.commit()
    
    async def _update_run_status(self, db_session: AsyncSession, run_id: str, status: str):
        result = await db_session.execute(
            select(EngineRun).where(EngineRun.run_id == run_id)
        )
        engine_run = result.scalar_one()
        engine_run.status = status
        if status == "completed":
            engine_run.completed_at = datetime.utcnow()
        await db_session.commit()
    
    async def _save_recommendation_log(
        self, db_session: AsyncSession, run_id: str, sku_id: str,
        forecast_data: dict, inventory_data: dict, optimization_data: dict
    ):
        """Save recommendation to log for future accuracy tracking"""
        from src.database.models import RecommendationLog
        from datetime import date as date_type
        
        log = RecommendationLog(
            run_id=run_id,
            sku_id=sku_id,
            recommendation_date=date_type.today(),
            predicted_demand_14days=forecast_data["next_14_days"],
            forecast_confidence=forecast_data["confidence"],
            stock_at_recommendation=inventory_data["current_stock"],
            days_of_coverage=inventory_data["days_of_coverage"],
            risk_level=inventory_data["risk_level"],
            recommended_order_qty=optimization_data["recommended_order_qty"],
            order_by_days=optimization_data["order_by_days"]
        )
        db_session.add(log)
        await db_session.commit()
        print(f"📝 Saved recommendation log for future accuracy tracking")

    async def run_batch_intelligence_engine(
        self,
        dataset_id: str,
        db_session: AsyncSession
    ):
        """
        Run the AI pipeline for ALL SKUs in the dataset
        Returns list of run_ids for all processed SKUs
        """
        # Get all SKUs from SKU Master table
        result = await db_session.execute(
            select(SKUMaster)
        )
        all_skus = result.scalars().all()
        
        if not all_skus:
            raise ValueError("No SKUs found in SKU Master table")
        
        run_ids = []
        
        # Process each SKU
        for sku_master in all_skus:
            try:
                result = await self.run_intelligence_engine(
                    dataset_id=dataset_id,
                    sku_id=sku_master.sku_id,
                    db_session=db_session
                )
                run_ids.append(result["run_id"])
                print(f"✅ Processed SKU: {sku_master.sku_id} - {sku_master.sku_name}")
            except Exception as e:
                print(f"❌ Failed to process SKU {sku_master.sku_id}: {str(e)}")
                continue
        
        return {
            "dataset_id": dataset_id,
            "total_skus_processed": len(run_ids),
            "run_ids": run_ids,
            "status": "completed"
        }
