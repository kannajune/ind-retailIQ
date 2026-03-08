from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON, DECIMAL, Date, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()

# ========================================
# CORE BUSINESS TABLES
# ========================================

class SKUMaster(Base):
    __tablename__ = "sku_master"
    
    sku_id = Column(String(50), primary_key=True)
    sku_name = Column(String(200), nullable=False)
    category = Column(String(100))
    cost_price = Column(DECIMAL(10, 2), nullable=False)
    selling_price = Column(DECIMAL(10, 2), nullable=False)
    lead_time_days = Column(Integer, nullable=False, default=7)
    moq = Column(Integer, nullable=False, default=1)
    safety_stock = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class InventoryState(Base):
    __tablename__ = "inventory_state"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    sku_id = Column(String(50), ForeignKey("sku_master.sku_id"), nullable=False, unique=True)
    current_stock = Column(Integer, nullable=False, default=0)
    reserved_stock = Column(Integer, default=0)
    inbound_stock = Column(Integer, default=0)
    last_updated = Column(DateTime, default=func.now(), onupdate=func.now())

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    
    po_id = Column(String(50), primary_key=True)
    sku_id = Column(String(50), ForeignKey("sku_master.sku_id"), nullable=False)
    order_qty = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="draft")  # draft, approved, received, cancelled
    expected_delivery_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=func.now())
    approved_at = Column(DateTime, nullable=True)
    received_at = Column(DateTime, nullable=True)

# ========================================
# NEW: HISTORICAL DATA TABLES
# ========================================

class POSTransaction(Base):
    """Store all POS sales transactions - PERMANENT"""
    __tablename__ = "pos_transactions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    sku_id = Column(String(50), ForeignKey("sku_master.sku_id"), nullable=False)
    transaction_date = Column(Date, nullable=False)
    quantity_sold = Column(Integer, nullable=False)
    unit_price = Column(DECIMAL(10, 2), nullable=True)
    unit_cost = Column(DECIMAL(10, 2), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('sku_id', 'transaction_date', name='uq_sku_transaction_date'),
    )

class InventoryHistory(Base):
    """Track inventory changes over time - PERMANENT"""
    __tablename__ = "inventory_history"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    sku_id = Column(String(50), ForeignKey("sku_master.sku_id"), nullable=False)
    snapshot_date = Column(Date, nullable=False)
    current_stock = Column(Integer, nullable=False)
    inbound_stock = Column(Integer, default=0)
    reserved_stock = Column(Integer, default=0)
    change_reason = Column(String(100))  # "upload", "po_received", "manual_adjustment"
    created_at = Column(DateTime, default=func.now())

class RecommendationLog(Base):
    """History of all predictions and recommendations - PERMANENT"""
    __tablename__ = "recommendation_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(50), ForeignKey("engine_runs.run_id"), nullable=False)
    sku_id = Column(String(50), ForeignKey("sku_master.sku_id"), nullable=False)
    recommendation_date = Column(Date, nullable=False)
    
    # Prediction
    predicted_demand_14days = Column(Integer)
    forecast_confidence = Column(Float)
    
    # Inventory at time of recommendation
    stock_at_recommendation = Column(Integer)
    days_of_coverage = Column(Integer)
    risk_level = Column(String(20))
    
    # Recommendation
    recommended_order_qty = Column(Integer)
    order_by_days = Column(Integer)
    
    # Decision
    decision_action = Column(String(20))  # approve, modify, hold
    final_order_qty = Column(Integer, nullable=True)
    po_id = Column(String(50), nullable=True)
    
    # Accuracy tracking (filled later when actual sales known)
    actual_demand_14days = Column(Integer, nullable=True)
    prediction_accuracy = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=func.now())

class UploadHistory(Base):
    """Track all data uploads - PERMANENT"""
    __tablename__ = "upload_history"
    
    upload_id = Column(String(50), primary_key=True)
    upload_type = Column(String(20), nullable=False)  # "pos", "inventory", "both"
    dataset_id = Column(String(50), ForeignKey("datasets.dataset_id"), nullable=True)
    
    # File info
    pos_filename = Column(String(200), nullable=True)
    inventory_filename = Column(String(200), nullable=True)
    pos_s3_path = Column(String(500), nullable=True)
    inventory_s3_path = Column(String(500), nullable=True)
    
    # Stats
    pos_records_added = Column(Integer, default=0)
    pos_records_updated = Column(Integer, default=0)
    inventory_skus_added = Column(Integer, default=0)
    inventory_skus_updated = Column(Integer, default=0)
    
    # Metadata
    uploaded_by = Column(String(100), default="user")
    uploaded_at = Column(DateTime, default=func.now())
    processing_status = Column(String(20), default="completed")

# ========================================
# AI/ML PIPELINE TABLES
# ========================================

class Dataset(Base):
    __tablename__ = "datasets"
    
    dataset_id = Column(String(50), primary_key=True)
    s3_path = Column(String(500), nullable=False)
    total_skus = Column(Integer, nullable=False)
    total_transactions = Column(Integer, nullable=False)
    date_range = Column(String(100), nullable=False)
    festival_mode = Column(Boolean, default=False)
    promotion_active = Column(Boolean, default=False)
    cash_constraint = Column(Boolean, default=False)
    uploaded_at = Column(DateTime, default=func.now())
    status = Column(String(50), default="uploaded")

class EngineRun(Base):
    __tablename__ = "engine_runs"
    
    run_id = Column(String(50), primary_key=True)
    dataset_id = Column(String(50), ForeignKey("datasets.dataset_id"), nullable=False)
    sku_id = Column(String(50), nullable=False)
    sku_name = Column(String(200))
    status = Column(String(50), default="processing")
    forecast_status = Column(String(50), default="pending")
    risk_status = Column(String(50), default="pending")
    optimization_status = Column(String(50), default="pending")
    llm_status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime, nullable=True)

class ForecastResult(Base):
    __tablename__ = "forecast_results"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(50), ForeignKey("engine_runs.run_id"), nullable=False)
    next_14_days = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=False)
    historical_data = Column(JSON, nullable=False)
    forecast_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=func.now())

class InventoryData(Base):
    __tablename__ = "inventory_data"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(50), ForeignKey("engine_runs.run_id"), nullable=False)
    current_stock = Column(Integer, nullable=False)
    days_of_coverage = Column(Integer, nullable=False)
    risk_level = Column(String(20), nullable=False)
    expiry_risk = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=func.now())

class OptimizationResult(Base):
    __tablename__ = "optimization_results"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(50), ForeignKey("engine_runs.run_id"), nullable=False)
    recommended_order_qty = Column(Integer, nullable=False)
    order_by_days = Column(Integer, nullable=False)
    working_capital_impact_percent = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=func.now())

class LLMInsight(Base):
    __tablename__ = "llm_insights"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(50), ForeignKey("engine_runs.run_id"), nullable=False)
    summary = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())

class Decision(Base):
    __tablename__ = "decisions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(50), ForeignKey("engine_runs.run_id"), nullable=False)
    action = Column(String(20), nullable=False)  # approve, modify, hold
    modified_qty = Column(Integer, nullable=True)
    po_id = Column(String(50), nullable=True)
    decided_at = Column(DateTime, default=func.now())
    decided_by = Column(String(100), nullable=True)

class ModelTraining(Base):
    __tablename__ = "model_training"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(String(50), ForeignKey("datasets.dataset_id"), nullable=False)
    training_job_name = Column(String(200), nullable=False)
    model_accuracy = Column(Float, nullable=True)
    started_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="started")
