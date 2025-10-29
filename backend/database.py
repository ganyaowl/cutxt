from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from models import Base

# Setup database engine
ENGINE = create_engine("sqlite:////data/api.db")

# Create all tables
Base.metadata.create_all(ENGINE)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)


def get_db():
    """Dependency for getting database sessions"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
