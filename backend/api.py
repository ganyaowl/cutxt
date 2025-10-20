from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import FileResponse
from starlette.responses import StreamingResponse
import io
import os
import shutil
from sqlalchemy import create_engine, Column, Integer, String, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from nlp.classifier import classify_text
from nlp.loader import load_database, load_document

# Setup directories
os.makedirs('databases', exist_ok=True)
os.makedirs('documents', exist_ok=True)

# Setup metadata database
ENGINE = create_engine('sqlite:///api.db')
Base = declarative_base()

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

Base.metadata.create_all(ENGINE)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI()

# Database endpoints

@app.post("/database")
async def create_database(
    name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    file_path = f"databases/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    db_entry = Database(name=name, file_path=file_path)
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return {"id": db_entry.id, "name": name}

@app.get("/database")
def get_databases(db: Session = Depends(get_db)):
    databases = db.query(Database).all()
    return [{"id": d.id, "name": d.name} for d in databases]

@app.get("/database/{id}")
def get_database(id: int, db: Session = Depends(get_db)):
    db_entry = db.query(Database).filter(Database.id == id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Database not found")
    return FileResponse(db_entry.file_path, filename=os.path.basename(db_entry.file_path))

@app.delete("/database/{id}")
def delete_database(id: int, db: Session = Depends(get_db)):
    db_entry = db.query(Database).filter(Database.id == id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Database not found")
    if os.path.exists(db_entry.file_path):
        os.remove(db_entry.file_path)
    db.delete(db_entry)
    db.commit()
    return {"detail": "Database deleted"}

# Document endpoints

class DocumentCreate(BaseModel):
    text: str | None = None

@app.post("/document")
async def create_document(
    name: str = Form(...),
    file: UploadFile = File(None),
    text: str = Form(None),
    db: Session = Depends(get_db)
):
    if not file and not text:
        raise HTTPException(status_code=400, detail="Either file or text must be provided")
    if file and text:
        raise HTTPException(status_code=400, detail="Provide either file or text, not both")
    
    file_path = None
    text_content = None
    
    if file:
        if not file.filename.lower().endswith(('.pdf', '.doc', '.docx')):
            raise HTTPException(status_code=400, detail="File must be PDF, DOC, or DOCX")
        file_path = f"documents/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    else:
        text_content = text
    
    doc_entry = Document(name=name, file_path=file_path, text_content=text_content)
    db.add(doc_entry)
    db.commit()
    db.refresh(doc_entry)
    return {"id": doc_entry.id, "name": name}

@app.get("/document")
def get_documents(db: Session = Depends(get_db)):
    documents = db.query(Document).all()
    return [{"id": d.id, "name": d.name} for d in documents]

@app.get("/document/{id}")
def get_document(id: int, db: Session = Depends(get_db)):
    doc_entry = db.query(Document).filter(Document.id == id).first()
    if not doc_entry:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if doc_entry.file_path:
        return FileResponse(doc_entry.file_path, filename=os.path.basename(doc_entry.file_path))
    else:
        filename = f"{doc_entry.name}.txt"
        return StreamingResponse(
            io.StringIO(doc_entry.text_content),
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

@app.delete("/document/{id}")
def delete_document(id: int, db: Session = Depends(get_db)):
    doc_entry = db.query(Document).filter(Document.id == id).first()
    if not doc_entry:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc_entry.file_path and os.path.exists(doc_entry.file_path):
        os.remove(doc_entry.file_path)
    db.delete(doc_entry)
    db.commit()
    return {"detail": "Document deleted"}

# Classification endpoints

class ClassifyRequest(BaseModel):
    document_id: int
    database_id: int

@app.post("/classify")
def create_classification(request: ClassifyRequest, db: Session = Depends(get_db)):
    existing = db.query(Classification).filter(
        Classification.document_id == request.document_id,
        Classification.database_id == request.database_id
    ).first()
    
    if existing:
        return {
            "classification_id": existing.id,
            "document_id": existing.document_id,
            "database_id": existing.database_id,
            "classification_result": existing.result
        }
    
    doc_entry = db.query(Document).filter(Document.id == request.document_id).first()
    if not doc_entry:
        raise HTTPException(status_code=404, detail="Document not found")
    
    db_entry = db.query(Database).filter(Database.id == request.database_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Database not found")
    
    tables_df, keys_df = load_database(db_entry.file_path)
    
    if doc_entry.file_path:
        text = load_document(doc_entry.file_path)
    else:
        text = doc_entry.text_content
    
    result = classify_text(text, tables_df, keys_df)
    
    classif = Classification(
        document_id=request.document_id,
        database_id=request.database_id,
        result=result
    )
    db.add(classif)
    db.commit()
    db.refresh(classif)
    
    return {
        "classification_id": classif.id,
        "document_id": classif.document_id,
        "database_id": classif.database_id,
        "classification_result": classif.result
    }

@app.get("/classify")
def get_classifications(db: Session = Depends(get_db)):
    classifications = db.query(Classification).all()
    return [
        {
            "classification_id": c.id,
            "document_id": c.document_id,
            "database_id": c.database_id,
            "classification_result": c.result
        } for c in classifications
    ]

@app.get("/classify/{id}")
def get_classification(id: int, db: Session = Depends(get_db)):
    classif = db.query(Classification).filter(Classification.id == id).first()
    if not classif:
        raise HTTPException(status_code=404, detail="Classification not found")
    return {
        "classification_id": classif.id,
        "document_id": classif.document_id,
        "database_id": classif.database_id,
        "classification_result": classif.result
    }

@app.delete("/classify/{id}")
def delete_classification(id: int, db: Session = Depends(get_db)):
    classif = db.query(Classification).filter(Classification.id == id).first()
    if not classif:
        raise HTTPException(status_code=404, detail="Classification not found")
    db.delete(classif)
    db.commit()
    return {"detail": "Classification deleted"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)