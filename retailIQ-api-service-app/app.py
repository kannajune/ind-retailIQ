# app.py
from fastapi import FastAPI, Request, Depends
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import (
    http_exception_handler,
    request_validation_exception_handler,
)
from starlette.middleware.gzip import GZipMiddleware
from fastapi.security.api_key import APIKeyHeader
import uvicorn
from contextlib import asynccontextmanager
from starlette.middleware import Middleware

from src.util.cors_middleware import DynamicCORSMiddleware
from src.util.auth_middleware import AuthMiddleware
from src.util.timeout_middleware import TimeoutMiddleware
from src.util.rate_limit_middleware import RateLimitMiddleware
from src.database.connection import SqlUtil
from src.util.auth_util import TokenHandler
from src.util.aws_clients import AWSClients
from src.config.config import SettingsLoader
from src.dependencies.database import set_sql_util

# Import services
from src.service.ingestion_service import IngestionService
from src.service.engine_service import EngineService
from src.service.dashboard_service import DashboardService
from src.service.llm_service import LLMService
from src.service.decision_service import DecisionService
from src.service.summary_service import SummaryService
from src.service.learning_service import LearningService

# Import routes
from src.route import ingestion_route, engine_route, dashboard_route
from src.route import llm_route, decision_route, summary_route, learning_route, auth_route

import logging

environment = "development"
port = 8000

secret_key = "retailiq_secret_key_change_in_production"
token_handler = TokenHandler(secret_key)

# Global instances
sql_util_obj = None
aws_clients = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global sql_util_obj, aws_clients
    
    settings_loader = SettingsLoader()
    settings = await settings_loader.connect_and_init()
    
    api_key_header = APIKeyHeader(name="Authorization")
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    logger.info("Starting up RetailIQ Demand Planner System")

    # Initialize database connection
    sql_util_obj = SqlUtil(settings)
    await sql_util_obj.connect_and_init()
    
    # Set sql_util for dependency injection
    set_sql_util(sql_util_obj)
    
    # Initialize AWS clients
    aws_clients = AWSClients(settings)
    
    # Initialize services
    ingestion_service = IngestionService(aws_clients, settings)
    engine_service = EngineService(aws_clients, settings)
    dashboard_service = DashboardService()
    llm_service = LLMService(aws_clients, settings)
    decision_service = DecisionService()
    summary_service = SummaryService()
    learning_service = LearningService(aws_clients, settings)
    
    # Set services in routes
    ingestion_route.set_ingestion_service(ingestion_service)
    engine_route.set_engine_service(engine_service)
    dashboard_route.set_dashboard_service(dashboard_service)
    llm_route.set_llm_service(llm_service)
    decision_route.set_decision_service(decision_service)
    summary_route.set_summary_service(summary_service)
    learning_route.set_learning_service(learning_service)
    
    # Set sql_util for dependency injection
    app.state.sql_util = sql_util_obj
    
    # Include auth router (public - no auth required)
    app.include_router(
        auth_route.router,
        prefix="/api/v1/auth",
        tags=["authentication"]
    )
    
    # Include routers (require auth)
    app.include_router(
        ingestion_route.router,
        prefix="/api/v1/ingestion",
        tags=["ingestion"]
    )
    
    app.include_router(
        engine_route.router,
        prefix="/api/v1/engine",
        tags=["engine"]
    )
    
    app.include_router(
        dashboard_route.router,
        prefix="/api/v1/dashboard",
        tags=["dashboard"]
    )
    
    app.include_router(
        llm_route.router,
        prefix="/api/v1/llm",
        tags=["llm"]
    )
    
    app.include_router(
        decision_route.router,
        prefix="/api/v1/decision",
        tags=["decision"]
    )
    
    app.include_router(
        summary_route.router,
        prefix="/api/v1/summary",
        tags=["summary"]
    )
    
    app.include_router(
        learning_route.router,
        prefix="/api/v1/learning",
        tags=["learning"]
    )

    yield

my_pre_ordered_middlewares = [
    Middleware(DynamicCORSMiddleware),
    Middleware(RateLimitMiddleware),  # Rate limiting before auth
    Middleware(AuthMiddleware, secret_key=secret_key, token_handler=token_handler),
    Middleware(TimeoutMiddleware, timeout_seconds=120),
]

app = FastAPI(
    title="RetailIQ Demand Planner System",
    description="Agentic demand planning application for retail intelligence",
    version="1.0.0",
    lifespan=lifespan, 
    middleware=my_pre_ordered_middlewares
)

# Add GZip compression for responses > 1KB
app.add_middleware(GZipMiddleware, minimum_size=1000)

@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(
    request: Request, exception: StarletteHTTPException
):
    return await http_exception_handler(request, exception)

@app.exception_handler(RequestValidationError)
async def custom_request_exception_handler(
    request: Request, exception: RequestValidationError
):
    return await request_validation_exception_handler(request, exception)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "retailiq-api-service"}

# Dependency to get database session
async def get_db():
    async with sql_util_obj.async_session_maker() as session:
        yield session

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
