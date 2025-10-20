import re


def preprocess_uzbek_text(text: str) -> list[str]:
    """
    Basic preprocessing for Uzbek text:
    - Convert to lowercase
    - Remove punctuation and numbers
    - Tokenize into words (simple split, as NLTK lacks Uzbek support)
    No lemmatization or stopwords, as Uzbek resources are limited.
    """
    # Lowercase
    text = text.lower()
    # Remove punctuation and numbers
    text = re.sub(r"[^\w\s]", " ", text)  # Keep letters and spaces
    text = re.sub(r"\d+", "", text)  # Remove numbers
    # Simple tokenization
    tokens = text.split()
    # Remove empty tokens
    tokens = [token.strip() for token in tokens if token.strip()]
    return tokens
