import pandas as pd
from docx import Document
import pdfplumber

from nlp.reference_db import load_database_validated


def load_database(db_path: str):
    """Load reference SQLite with schema validation (tables + keys)."""
    return load_database_validated(db_path)


def extract_text_from_docx(file_path: str) -> str:
    """
    Extract text from a .docx file.
    """
    doc = Document(file_path)
    full_text = []
    for para in doc.paragraphs:
        full_text.append(para.text)
    return "\n".join(full_text)


def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract text from a .pdf file using pdfplumber.
    """
    full_text = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                full_text.append(page_text)
    return "\n".join(full_text)


def load_document(file_path: str) -> str:
    """
    Load text from either .docx or .pdf file.
    """
    if file_path.endswith(".docx"):
        return extract_text_from_docx(file_path)
    elif file_path.endswith(".pdf"):
        return extract_text_from_pdf(file_path)
    else:
        raise ValueError("Unsupported file format. Only .docx and .pdf are supported.")
