import os

class Settings:
    PROJECT_NAME: str = "BidLedger - British Auction RFQ Engine"
    API_V1_STR: str = "/api"
    
    # Database Settings (Dual PostgreSQL with local SQLite automatic fallback)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./bidledger.db"
    )
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "bidledger")
    
    # Neo4j Settings
    NEO4J_URI: str = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER: str = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "bidledger_secret")
    
    # Redis & Celery Settings
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
    
    # Default British Auction Constraints
    DEFAULT_TRIGGER_WINDOW_MINS: int = 10
    DEFAULT_EXTENSION_DURATION_MINS: int = 5

settings = Settings()
