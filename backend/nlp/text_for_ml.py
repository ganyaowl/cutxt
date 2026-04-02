"""Нормализация текста для TF-IDF / ML (одна строка)."""

from nlp.preprocessor import preprocess_uzbek_text


def normalize_text_for_ml(text: str) -> str:
    """Пробел-разделённые токены после того же пайплайна, что и словарный классификатор."""
    if not text or not str(text).strip():
        return ""
    return " ".join(preprocess_uzbek_text(str(text)))
