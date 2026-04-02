"""Формирование ответа API в том же духе, что и словарный classify_text."""

from __future__ import annotations

from typing import Any

_SCORE_EPS = 1e-9

ML_DATABASE_SENTINEL = -1


def build_ml_classification_result(
    *,
    class_names: list[str],
    probabilities: list[float],
    calibrated: bool,
    model_version: str,
) -> dict[str, Any]:
    """probabilities — тот же порядок, что class_names."""
    if len(class_names) != len(probabilities):
        raise ValueError("class_names and probabilities length mismatch")
    n = len(class_names)
    if n == 0:
        return {
            "predicted_category": "Unknown",
            "predicted_category_id": None,
            "relative_score_share": 0.0,
            "confidence": 0.0,
            "margin_raw": None,
            "margin_share": None,
            "runner_up_category_id": None,
            "runner_up_category": None,
            "runner_up_raw": None,
            "runner_up_share": None,
            "only_one_scoring_class": True,
            "all_scores": {},
            "all_scores_by_name": {},
            "score_shares": {},
            "score_shares_by_name": {},
            "classification_kind": "ml",
            "calibrated": calibrated,
            "model_version": model_version,
        }

    pairs = sorted(
        zip(class_names, probabilities, strict=True),
        key=lambda x: (-x[1], x[0]),
    )
    best_name, best_p = pairs[0]
    second_p = pairs[1][1] if n > 1 else 0.0

    scores_by_name = dict(zip(class_names, probabilities, strict=True))
    total = sum(probabilities)
    share_top = best_p / total if total > 0 else 0.0

    margin_raw = best_p - second_p if n > 1 else None
    margin_share = (best_p - second_p) if n > 1 else None

    positive = [(i, class_names[i], probabilities[i]) for i in range(n) if probabilities[i] > _SCORE_EPS]
    positive.sort(key=lambda x: (-x[2], x[1]))
    only_one = len(positive) <= 1

    runner_up_category = None
    runner_up_raw = None
    runner_up_share = None
    if len(positive) >= 2:
        _, run_name, run_p = positive[1]
        runner_up_category = run_name
        runner_up_raw = run_p
        runner_up_share = run_p

    score_shares_by_name = {
        class_names[i]: (probabilities[i] / total if total > 0 else 0.0)
        for i in range(n)
    }
    score_shares = {i: score_shares_by_name[class_names[i]] for i in range(n)}
    all_scores = {i: probabilities[i] for i in range(n)}

    pred_idx = class_names.index(best_name)

    return {
        "predicted_category": best_name,
        "predicted_category_id": pred_idx,
        "relative_score_share": share_top,
        "confidence": share_top,
        "margin_raw": margin_raw,
        "margin_share": margin_share,
        "runner_up_category_id": None,
        "runner_up_category": runner_up_category,
        "runner_up_raw": runner_up_raw,
        "runner_up_share": runner_up_share,
        "only_one_scoring_class": only_one,
        "all_scores": all_scores,
        "all_scores_by_name": scores_by_name,
        "score_shares": score_shares,
        "score_shares_by_name": score_shares_by_name,
        "classification_kind": "ml",
        "calibrated": calibrated,
        "model_version": model_version,
    }
