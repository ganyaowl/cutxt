"""
Обучение ML-классификатора: CSV с колонками text, label (UTF-8).

Пример:
  cd backend && python -m ml.train --data data/train_sample.csv --out models/ml_classifier.joblib
"""

from __future__ import annotations

import argparse
import os

import joblib
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from nlp.text_for_ml import normalize_text_for_ml


def train_from_csv(csv_path: str) -> tuple[Pipeline, dict]:
    df = pd.read_csv(csv_path, encoding="utf-8")
    if "text" not in df.columns or "label" not in df.columns:
        raise ValueError("CSV must contain columns: text, label")

    df = df.dropna(subset=["text", "label"])
    texts = [normalize_text_for_ml(str(t)) for t in df["text"]]
    labels = [str(y).strip() for y in df["label"]]
    # убрать пустые после нормализации
    pairs = [(t, y) for t, y in zip(texts, labels, strict=True) if t.strip()]
    if len(pairs) < 2:
        raise ValueError("Нужно минимум 2 непустых документа после нормализации")
    texts, labels = zip(*pairs, strict=True)
    texts, labels = list(texts), list(labels)

    n_samples = len(texts)
    n_classes = len(set(labels))
    if n_classes < 2:
        raise ValueError("Нужно минимум 2 разных класса (label)")

    tfidf = TfidfVectorizer(
        ngram_range=(1, 2),
        min_df=1,
        max_df=0.95,
        sublinear_tf=True,
    )
    base_lr = LogisticRegression(
        max_iter=2000,
        class_weight="balanced",
        solver="lbfgs",
    )

    min_per_class = min(sum(1 for y in labels if y == c) for c in set(labels))
    calibrated = n_samples >= 12 and min_per_class >= 2
    if calibrated:
        cv = min(5, max(2, n_samples // 4))
        clf = CalibratedClassifierCV(base_lr, method="sigmoid", cv=cv)
    else:
        clf = base_lr

    pipe = Pipeline([("tfidf", tfidf), ("clf", clf)])
    pipe.fit(texts, labels)

    meta = {
        "version": "1.0",
        "calibrated": calibrated,
        "train_samples": n_samples,
        "num_labels": n_classes,
    }
    return pipe, meta


def main() -> None:
    ap = argparse.ArgumentParser(description="Train CuTxT ML classifier (TF-IDF + LR)")
    ap.add_argument("--data", required=True, help="Path to CSV (text,label)")
    ap.add_argument("--out", required=True, help="Output .joblib path")
    args = ap.parse_args()

    pipe, meta = train_from_csv(args.data)
    out_dir = os.path.dirname(os.path.abspath(args.out))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    bundle = {"pipeline": pipe, **meta}
    joblib.dump(bundle, args.out)
    print(f"Saved {args.out}  ({meta})")


if __name__ == "__main__":
    main()
