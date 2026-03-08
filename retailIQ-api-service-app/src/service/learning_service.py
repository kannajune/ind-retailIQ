import uuid
from datetime import datetime
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.database.models import Dataset, ModelTraining
from src.util.aws_clients import AWSClients

class LearningService:
    def __init__(self, aws_clients: AWSClients, settings: Dict[str, Any]):
        self.aws_clients = aws_clients
        self.settings = settings
    
    async def trigger_retraining(self, dataset_id: str, db_session: AsyncSession):
        """
        Trigger model retraining on SageMaker
        """
        # Verify dataset exists
        result = await db_session.execute(
            select(Dataset).where(Dataset.dataset_id == dataset_id)
        )
        dataset = result.scalar_one_or_none()
        
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")
        
        # Generate training job name
        training_job_name = f"retailiq-retrain-{uuid.uuid4().hex[:8]}"
        
        # Create training record
        training = ModelTraining(
            dataset_id=dataset_id,
            training_job_name=training_job_name,
            started_at=datetime.utcnow(),
            status="started"
        )
        
        db_session.add(training)
        await db_session.commit()
        
        # TODO: Trigger actual SageMaker training job
        # For now, just return status
        
        return {
            "status": "retraining_started"
        }
