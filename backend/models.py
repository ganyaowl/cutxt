from sqlalchemy import Column, Integer, String, JSON
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel

Base = declarative_base()

# SQLAlchemy Models
class Database(Base):
    __tablename__ = 'databases'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)

class Document(Base):
    __tablename__ = 'documents'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    file_path = Column(String, nullable=True)
    text_content = Column(String, nullable=True)

class Classification(Base):
    __tablename__ = 'classifications'
    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, nullable=False)
    database_id = Column(Integer, nullable=False)
    result = Column(JSON, nullable=False)

# Pydantic Models
class DocumentCreate(BaseModel):
    text: str | None = None

class ClassifyRequest(BaseModel):
    document_id: int
    database_id: int