from pydantic import BaseModel, Field

# Request Schemas

class LLMQueryRequest(BaseModel):
    run_id: str = Field(..., description="Run identifier for context")
    question: str = Field(..., description="User's question to the LLM")
    
    class Config:
        json_schema_extra = {
            "example": {
                "run_id": "run_001",
                "question": "Why 350 units?"
            }
        }

# Response Schemas

class LLMQueryResponse(BaseModel):
    answer: str = Field(..., description="LLM's answer to the question")
    
    class Config:
        json_schema_extra = {
            "example": {
                "answer": "350 units recommended due to projected demand spike..."
            }
        }
