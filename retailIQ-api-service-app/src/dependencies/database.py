from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.connection import SqlUtil

# Global sql_util instance - will be set from app.py
_sql_util: SqlUtil = None

def set_sql_util(sql_util: SqlUtil):
    """Set the global sql_util instance"""
    global _sql_util
    _sql_util = sql_util

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get database session"""
    if _sql_util is None:
        raise RuntimeError("SqlUtil not initialized. Call set_sql_util() first.")
    
    async with _sql_util.async_session_maker() as session:
        yield session
