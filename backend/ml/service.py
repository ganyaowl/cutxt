"""Загрузка joblib-модели и предсказание."""

from __future__ import annotations

import os
from typing import Any

import joblib

from ml.result_build import build_ml_classification_result
from nlp.text_for_ml import normalize_text_for_ml

_PIPELINE: Any = None
_META: dict[str, Any] = {}
_LOAD_ERROR: str | None = None


def model_path() -> str:
    return os.environ.get("ML_MODEL_PATH", os.path.join("models", "ml_classifier.joblib"))


def load_ml_bundle() -> bool:
    """Возвращает True, если модель загружена."""
    global _PIPELINE, _META, _LOAD_ERROR
    path = model_path()
    if not os.path.isfile(path):
        _PIPELINE = None
        _META = {}
        _LOAD_ERROR = f"Файл модели не найден: {path}"
        return False
    try:
        bundle = joblib.load(path)
        if isinstance(bundle, dict) and "pipeline" in bundle:
            _PIPELINE = bundle["pipeline"]
            _META = {k: v for k, v in bundle.items() if k != "pipeline"}
        else:
            _PIPELINE = bundle
            _META = {}
        _LOAD_ERROR = None
        return True
    except Exception as e:
        _PIPELINE = None
        _META = {}
        _LOAD_ERROR = str(e)
        return False


def ml_status() -> dict[str, Any]:
    path = model_path()
    if _PIPELINE is not None:
        try:
            if hasattr(_PIPELINE, "classes_"):
                classes = list(_PIPELINE.classes_)
            else:
                clf = _PIPELINE.named_steps.get("clf")
                classes = list(clf.classes_) if clf and hasattr(clf, "classes_") else []
        except Exception:
            classes = []
        return {
            "available": True,
            "path": os.path.abspath(path),
            "model_version": _META.get("version", "unknown"),
            "calibrated": _META.get("calibrated", False),
            "labels": classes,
        }
    err = _LOAD_ERROR or "Модель не загружена"
    return {
        "available": False,
        "path": os.path.abspath(path) if os.path.isfile(path) else path,
        "error": err,
    }


def ensure_loaded() -> None:
    if _PIPELINE is None:
        load_ml_bundle()


def classify_ml_text(raw_text: str) -> dict[str, Any]:
    ensure_loaded()
    if _PIPELINE is None:
        raise RuntimeError(_LOAD_ERROR or "ML model not available")

    text = normalize_text_for_ml(raw_text)
    if not text.strip():
        raise ValueError("После нормализации текст пуст — нечего классифицировать")

    proba = _PIPELINE.predict_proba([text])[0]
    pipe = _PIPELINE
    if hasattr(pipe, "classes_"):
        classes = list(pipe.classes_)
    else:
        clf = pipe.named_steps.get("clf")
        if clf is not None and hasattr(clf, "classes_"):
            classes = list(clf.classes_)
        else:
            raise RuntimeError("Pipeline не содержит classes_ после обучения")
    class_names = [str(c) for c in classes]

    calibrated = bool(_META.get("calibrated", False))
    version = str(_META.get("version", "1"))

    return build_ml_classification_result(
        class_names=class_names,
        probabilities=[float(x) for x in proba],
        calibrated=calibrated,
        model_version=version,
    )
