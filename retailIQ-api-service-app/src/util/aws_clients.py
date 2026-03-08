import boto3
import aioboto3
from typing import Dict, Any

class AWSClients:
    """
    AWS client manager for S3, SageMaker, and Bedrock
    """
    
    def __init__(self, settings: Dict[str, Any]):
        self.settings = settings
        aws_access_key_id = settings.get("AWS_ACCESS_KEY_ID")
        aws_secret_access_key = settings.get("AWS_SECRET_ACCESS_KEY")
        aws_region = settings.get("AWS_REGION", "us-east-1")
        bedrock_region = settings.get("BEDROCK_REGION", "us-east-1")
        
        # Build session kwargs - only include credentials if explicitly provided
        session_kwargs = {"region_name": aws_region}
        if aws_access_key_id and aws_secret_access_key:
            session_kwargs["aws_access_key_id"] = aws_access_key_id
            session_kwargs["aws_secret_access_key"] = aws_secret_access_key
        
        self.session = aioboto3.Session(**session_kwargs)
        
        # Sync clients for non-async operations
        # Only pass credentials if explicitly provided, otherwise use IAM role
        client_kwargs = {"region_name": aws_region}
        if aws_access_key_id and aws_secret_access_key:
            client_kwargs["aws_access_key_id"] = aws_access_key_id
            client_kwargs["aws_secret_access_key"] = aws_secret_access_key
        
        self.s3_client = boto3.client('s3', **client_kwargs)
        self.sagemaker_runtime = boto3.client('sagemaker-runtime', **client_kwargs)
        
        # Bedrock with its own region
        bedrock_kwargs = {"region_name": bedrock_region}
        if aws_access_key_id and aws_secret_access_key:
            bedrock_kwargs["aws_access_key_id"] = aws_access_key_id
            bedrock_kwargs["aws_secret_access_key"] = aws_secret_access_key
        
        self.bedrock_runtime = boto3.client('bedrock-runtime', **bedrock_kwargs)
    
    async def get_s3_client(self):
        """Get async S3 client"""
        return self.session.client('s3')
    
    async def get_sagemaker_client(self):
        """Get async SageMaker client"""
        return self.session.client('sagemaker-runtime')
    
    async def get_bedrock_client(self):
        """Get async Bedrock client"""
        bedrock_region = self.settings.get("BEDROCK_REGION", "us-east-1")
        return self.session.client('bedrock-runtime', region_name=bedrock_region)
    
    def get_sync_s3_client(self):
        """Get sync S3 client"""
        return self.s3_client
    
    def get_sync_sagemaker_client(self):
        """Get sync SageMaker client"""
        return self.sagemaker_runtime
    
    def get_sync_bedrock_client(self):
        """Get sync Bedrock client"""
        return self.bedrock_runtime
