import json
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.database.models import (
    EngineRun, ForecastResult, InventoryData,
    OptimizationResult
)
from src.util.aws_clients import AWSClients

class LLMService:
    def __init__(self, aws_clients: AWSClients, settings: Dict[str, Any]):
        self.aws_clients = aws_clients
        self.settings = settings
        self.model_id = settings.get("BEDROCK_MODEL_ID", "us.anthropic.claude-opus-4-6-v1")
    
    async def query_llm(self, run_id: str, question: str, db_session: AsyncSession):
        """
        Query LLM with context from the run using AWS Bedrock
        """
        # Get context from database
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
        
        # Build detailed context for the AI
        context = f"""You are an AI analyst for a retail demand planning system. You have access to the following data for SKU: {engine_run.sku_name or engine_run.sku_id}

FORECAST DATA:
- Next 14 days demand: {forecast.next_14_days if forecast else 0} units
- Forecast confidence: {forecast.confidence if forecast else 0:.2%}
- Historical data points: {len(forecast.historical_data) if forecast and forecast.historical_data else 0}

INVENTORY DATA:
- Current stock: {inventory.current_stock if inventory else 0} units
- Days of coverage: {inventory.days_of_coverage if inventory else 0} days
- Risk level: {inventory.risk_level if inventory else 'unknown'}
- Expiry risk: {inventory.expiry_risk if inventory else 'unknown'}

OPTIMIZATION RECOMMENDATION:
- Recommended order quantity: {optimization.recommended_order_qty if optimization else 0} units
- Order by: {optimization.order_by_days if optimization else 0} days
- Working capital impact: {optimization.working_capital_impact_percent if optimization else 0}%

Answer the user's question based on this data. Be specific, data-driven, and concise. If the question is about the recommendation, explain the reasoning behind it."""

        # Call Bedrock API
        try:
            bedrock_client = self.aws_clients.get_sync_bedrock_client()
            
            # Prepare the request for Claude
            request_body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1000,
                "temperature": 0.7,
                "messages": [
                    {
                        "role": "user",
                        "content": f"{context}\n\nUser Question: {question}"
                    }
                ]
            }
            
            # Invoke Bedrock
            response = bedrock_client.invoke_model(
                modelId=self.model_id,
                body=json.dumps(request_body)
            )
            
            # Parse response
            response_body = json.loads(response['body'].read())
            answer = response_body['content'][0]['text']
            
            return {
                "answer": answer
            }
            
        except Exception as e:
            # If Bedrock fails, return a helpful error message
            error_msg = str(e)
            if "credentials" in error_msg.lower() or "access" in error_msg.lower():
                return {
                    "answer": "I'm having trouble connecting to the AI service. Please check AWS credentials and Bedrock access permissions."
                }
            elif "model" in error_msg.lower():
                return {
                    "answer": f"The AI model ({self.model_id}) is not available. Please check the model ID and region configuration."
                }
            else:
                return {
                    "answer": f"I encountered an error: {error_msg}. Please try again or contact support."
                }
