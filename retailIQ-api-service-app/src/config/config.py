from pydantic_settings import BaseSettings
from typing import Optional, Dict, Any
import os
from pathlib import Path

class Settings(BaseSettings):
    # Database (PostgreSQL) - Support both DATABASE_URL and individual components
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "retailiq_db"
    db_user: str = "retailiq_user"
    db_password: str = "retailiq_password"
    postgre_schema_name: str = "public"
    secret_key: str = "retailiq_secret_key_change_in_production"
    environment: str = "development"
    
    @property
    def get_database_url(self) -> str:
        """Get database URL from environment variables or defaults."""
        # Always check environment variables first (Docker sets these)
        db_host = os.getenv("DB_HOST", self.db_host)
        db_port = os.getenv("DB_PORT", str(self.db_port))
        db_name = os.getenv("DB_NAME", self.db_name)
        db_user = os.getenv("DB_USER", self.db_user)
        db_password = os.getenv("DB_PASSWORD", self.db_password)
        
        # Check if DATABASE_URL is set in environment (takes highest priority)
        database_url_env = os.getenv("DATABASE_URL")
        if database_url_env:
            return database_url_env
        
        # Build from components
        return f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    
    # AWS Configuration
    aws_region: str = "us-east-1"
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    
    # S3 Configuration
    s3_bucket_name: str = "retailiq-data-bucket"
    s3_csv_prefix: str = "uploads/csv/"
    
    # SageMaker Configuration
    sagemaker_endpoint_name: str = "retailiq-forecast-endpoint"
    sagemaker_role_arn: Optional[str] = None
    
    # Bedrock Configuration
    bedrock_model_id: str = "us.anthropic.claude-opus-4-6-v1"
    bedrock_region: str = "us-east-1"
    
    class Config:
        # Find .env file relative to this config file's location
        env_file = str(Path(__file__).parent.parent.parent / ".env")
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields from .env file

class SettingsLoader:
    def __init__(self):
        self.settings = None
    
    async def connect_and_init(self) -> Dict[str, Any]:
        """Initialize and return settings as dictionary for compatibility."""
        self.settings = Settings()
        
        # Convert to dictionary for compatibility with reference pattern
        settings_dict = {
            "DATABASE_URL": self.settings.get_database_url,
            "POSTGRE_SCHEMA_NAME": self.settings.postgre_schema_name,
            "SECRET_KEY": self.settings.secret_key,
            "ENVIRONMENT": self.settings.environment,
            "AWS_REGION": self.settings.aws_region,
            "AWS_ACCESS_KEY_ID": self.settings.aws_access_key_id,
            "AWS_SECRET_ACCESS_KEY": self.settings.aws_secret_access_key,
            "S3_BUCKET_NAME": self.settings.s3_bucket_name,
            "S3_CSV_PREFIX": self.settings.s3_csv_prefix,
            "SAGEMAKER_ENDPOINT_NAME": self.settings.sagemaker_endpoint_name,
            "SAGEMAKER_ROLE_ARN": self.settings.sagemaker_role_arn,
            "BEDROCK_MODEL_ID": self.settings.bedrock_model_id,
            "BEDROCK_REGION": self.settings.bedrock_region,
        }
        
        return settings_dict
