import sqlite3
import pandas as pd
from docx import Document
import pdfplumber  # For PDF text extraction; install with pip install pdfplumber


def load_database(db_path: str):
    """
    Load the SQLite database and return DataFrames for tables and keys.
    Assumes database has 'tables' and 'keys' tables as per the structure.
    """
    conn = sqlite3.connect(db_path)
    tables_df = pd.read_sql_query("SELECT * FROM tables", conn)
    keys_df = pd.read_sql_query("SELECT * FROM keys", conn)
    conn.close()
    return tables_df, keys_df


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
