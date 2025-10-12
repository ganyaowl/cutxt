from nlp.classifier import classify_text
from nlp.loader import load_database, load_document


if __name__ == "__main__":
    import sys
    # Example: python -m main db_path document_path
    if len(sys.argv) != 3:
        print("Usage: python -m main <db_path> <doc_path>")
        sys.exit(1)
    
    db_path = sys.argv[1]
    doc_path = sys.argv[2]
    
    tables_df, keys_df = load_database(db_path)
    text = load_document(doc_path)
    result = classify_text(text, tables_df, keys_df)
    
    print(f"Predicted Category: {result['predicted_category']}")
    print(f"Confidence: {result['confidence']:.2f}")
    print("Scores per category:", result['all_scores'])