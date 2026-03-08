"""Database connection utility for PostgreSQL following reference pattern."""

import logging
from typing import Dict, Any
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import SQLAlchemyError

Base = declarative_base()

logger = logging.getLogger(__name__)


class SqlUtil:
    """Utility class to interact with PostgreSQL using SQLAlchemy following reference pattern."""
    
    def __init__(self, settings: Dict[str, Any]):
        self.settings = settings
        self.connection_string = settings.get("DATABASE_URL")
        self.schema_name = settings.get("POSTGRE_SCHEMA_NAME", "public")
        self.engine = None
        self.async_engine = None
        self.SessionLocal = None
        self.async_session_maker = None
    
    async def connect_and_init(self):
        """Initialize SQLAlchemy engine and session factory."""
        try:
            # Create PostgreSQL engine with connection pooling and schema configuration
            self.engine = create_engine(
                self.connection_string,
                echo=False,  # Set True for SQL debugging
                pool_pre_ping=True,  # Validate connections before use
                pool_recycle=3600,   # Recycle after 1 hr
                pool_size=20,        # Increase pool size for concurrent queries
                max_overflow=30,     # Allow more overflow connections
                connect_args={
                    "options": f"-csearch_path={self.schema_name} -cstatement_timeout=300000",
                },
            )
            self.SessionLocal = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self.engine
            )
            
            # Create async engine for async operations
            async_url = self.connection_string.replace("postgresql://", "postgresql+asyncpg://")
            self.async_engine = create_async_engine(
                async_url,
                echo=False,
                pool_pre_ping=True,
                pool_recycle=3600,
                pool_size=20,
                max_overflow=30,
                connect_args={
                    "server_settings": {
                        "search_path": self.schema_name,
                        "statement_timeout": "300000"
                    }
                }
            )
            self.async_session_maker = async_sessionmaker(
                bind=self.async_engine,
                class_=AsyncSession,
                expire_on_commit=False
            )
            
            # Test connection
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            logger.info(f"✅ PostgreSQL connection initialized successfully with schema: {self.schema_name}")
            
            # Initialize database schema
            await self.init_schema()
            
        except SQLAlchemyError as e:
            logger.error(f"❌ Failed to initialize PostgreSQL connection: {str(e)}")
            raise
    
    async def init_schema(self):
        """Initialize database schema by creating tables if they don't exist."""
        try:
            from src.database.models import Base
            import logging
            logger = logging.getLogger(__name__)
            
            logger.info("Initializing database schema using SQLAlchemy models...")
            
            # Use SQLAlchemy's create_all to create tables if they don't exist
            # This is safer than running raw SQL
            async with self.async_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            
            logger.info("✅ Database schema initialized successfully using SQLAlchemy")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize database schema: {str(e)}")
            # Don't raise - allow app to continue even if schema init fails
    
    def get_session(self):
        """Get a new database session."""
        if not self.SessionLocal:
            raise RuntimeError("Database session not initialized. Call connect_and_init first.")
        return self.SessionLocal()
    
    def get_async_session(self):
        """Get a new async database session."""
        if not self.async_session_maker:
            raise RuntimeError("Async database session not initialized. Call connect_and_init first.")
        return self.async_session_maker()
    
    # ----------------- QUERY HELPERS ----------------- #

    def execute_query(self, query, params=None):
        """Execute a SQL query and return results."""
        try:
            with self.get_session() as session:
                result = session.execute(text(query), params or {})
                session.commit()
                return result.fetchall()
        except SQLAlchemyError as e:
            logger.error(f"Query execution failed: {str(e)}")
            raise

    def execute_non_query(self, query, params=None):
        """Execute a non-query SQL statement (INSERT, UPDATE, DELETE)."""
        try:
            with self.get_session() as session:
                session.execute(text(query), params or {})
                session.commit()
                logger.info("Non-query executed successfully")
        except SQLAlchemyError as e:
            logger.error(f"Non-query execution failed: {str(e)}")
            session.rollback()
            raise

    def fetchone(self, query, params=None):
        """Fetch a single row"""
        try:
            with self.get_session() as session:
                result = session.execute(text(query), params or {})
                return result.fetchone()
        except SQLAlchemyError as e:
            logger.error(f"Fetchone failed: {str(e)}")
            raise

    def fetchall(self, query, params=None):
        """Fetch all rows"""
        try:
            with self.get_session() as session:
                result = session.execute(text(query), params or {})
                return result.fetchall()
        except SQLAlchemyError as e:
            logger.error(f"Fetchall failed: {str(e)}")
            raise

    def close_connection(self):
        """Close the database connection."""
        if self.async_engine:
            self.async_engine.dispose()
        if self.engine:
            self.engine.dispose()
            logger.info("✅ PostgreSQL connection closed")
