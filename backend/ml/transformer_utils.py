"""Shared helpers for transformer training and inference."""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass

TRANSFORMER_MODEL_NAME = "distilbert-base-multilingual-cased"
TRANSFORMER_MODEL_VERSION = "transformer-1.0"
TRANSFORMER_BACKEND = "transformers"
TRANSFORMER_MAX_LENGTH = 256
RARE_LABEL_THRESHOLD = 10
RARE_LABEL_POLICY = "merge_to_other"
OTHER_LABEL = "Other"

_WHITESPACE_RE = re.compile(r"\s+")


@dataclass(frozen=True)
class PreparedTransformerData:
    texts: list[str]
    labels: list[str]
    label_names: list[str]
    label_mapping: dict[str, str]
    original_label_counts: dict[str, int]
    merged_label_counts: dict[str, int]


def normalize_text_for_transformer(text: str) -> str:
    """Keep text mostly raw; only trim and collapse whitespace."""
    if not text or not str(text).strip():
        return ""
    return _WHITESPACE_RE.sub(" ", str(text).strip())


def merge_rare_labels(
    labels: list[str],
    *,
    rare_label_threshold: int = RARE_LABEL_THRESHOLD,
    other_label: str = OTHER_LABEL,
) -> tuple[list[str], dict[str, str], dict[str, int], dict[str, int]]:
    """Map rare labels to a shared fallback class."""
    if rare_label_threshold < 1:
        raise ValueError("rare_label_threshold must be >= 1")

    original_counts = Counter(labels)
    mapping = {
        label: (other_label if count < rare_label_threshold else label)
        for label, count in original_counts.items()
    }
    merged_labels = [mapping[label] for label in labels]
    merged_counts = Counter(merged_labels)
    return merged_labels, mapping, dict(original_counts), dict(merged_counts)


def ordered_label_names(labels: list[str], *, other_label: str = OTHER_LABEL) -> list[str]:
    """Deterministic label order with the fallback bucket at the end."""
    return sorted(set(labels), key=lambda value: (value == other_label, value.casefold(), value))
