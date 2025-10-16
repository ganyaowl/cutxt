import sqlite3
import pandas as pd
from docx import Document
import pdfplumber  # For PDF text extraction; install with pip install pdfplumber

import os
import win32com.client as win32  # For .doc files; requires Windows and Microsoft Word


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
    return '\n'.join(full_text)

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
    return '\n'.join(full_text)

def convert_doc_to_docx(input_path: str) -> str:
    """
    Converts a .doc file to .docx using Microsoft Word (requires Word installed).
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"File not found: {input_path}")

    if not input_path.lower().endswith(".doc"):
        raise ValueError("Input file must have a .doc extension")

    # Convert to absolute paths
    abs_input_path = os.path.abspath(input_path)
    output_path = os.path.splitext(abs_input_path)[0] + ".docx"
    
    word = win32.Dispatch("Word.Application")
    word.Visible = False

    try:
        doc = word.Documents.Open(abs_input_path)
        doc.SaveAs(output_path, FileFormat=16)  # 16 is for .docx
        doc.Close()
        print(f"Converted successfully: {output_path}")
    except Exception as e:
        print(f"Conversion failed: {e}")
        raise  # Re-raise the exception to handle it in the calling function
    finally:
        word.Quit()

    return output_path

def load_document(file_path: str) -> str:
    """
    Load text from either .docx or .pdf file.
    """
    if file_path.endswith('.docx'):
        return extract_text_from_docx(file_path)
    elif file_path.endswith('.doc'):
        return extract_text_from_docx(convert_doc_to_docx(file_path))
    elif file_path.endswith('.pdf'):
        return extract_text_from_pdf(file_path)
    else:
        raise ValueError("Unsupported file format. Only .docx and .pdf are supported.")