from typing import Any

import pandas as pd

from nlp.preprocessor import preprocess_uzbek_text

_SCORE_EPS = 1e-9


def classify_text(
    text: str, tables_df: pd.DataFrame, keys_df: pd.DataFrame
) -> dict[str, Any]:
    """
    Heuristic keyword scoring (not probabilities).

    - Raw score per category: sum of (percent * weight) for matching tokens.
    - relative_score_share: winner_raw / sum_all_raw — internal normalization only.
    - margin_* / runner_up_*: meaningful only when at least two categories have raw > 0.
    """
    tokens = preprocess_uzbek_text(text)

    category_map = dict(zip(tables_df["id"], tables_df["name"]))
    category_scores = {int(cat_id): 0.0 for cat_id in category_map.keys()}

    keys_lower = keys_df["key"].astype(str).str.lower()
    has_weight = "weight" in keys_df.columns

    for token in tokens:
        mask = keys_lower == token.lower()
        for _, key_row in keys_df[mask].iterrows():
            cat_id = int(key_row["table_id"])
            base = float(key_row["percent"])
            if has_weight:
                w = key_row["weight"]
                mult = 1.0 if w is None or pd.isna(w) else float(w)
                score_add = base * mult
            else:
                score_add = base
            if cat_id in category_scores:
                category_scores[cat_id] += score_add

    total = sum(category_scores.values())

    predicted_category = "Unknown"
    predicted_cat_id = None
    relative_score_share = 0.0
    score_shares: dict[int, float] = {cid: 0.0 for cid in category_scores}
    score_shares_by_name: dict[str, float] = {
        str(category_map.get(cid, cid)): 0.0 for cid in category_scores
    }

    margin_raw: float | None = None
    margin_share: float | None = None
    runner_up_category_id: int | None = None
    runner_up_category: str | None = None
    runner_up_raw: float | None = None
    runner_up_share: float | None = None
    only_one_scoring_class = False

    if total > 0:
        predicted_cat_id = max(category_scores, key=category_scores.get)
        predicted_category = str(category_map.get(predicted_cat_id, "Unknown"))
        relative_score_share = category_scores[predicted_cat_id] / total

        score_shares = {
            cid: category_scores[cid] / total for cid in category_scores.keys()
        }
        score_shares_by_name = {
            str(category_map.get(cid, cid)): score_shares[cid]
            for cid in category_scores.keys()
        }

        positive = [
            (cid, category_scores[cid])
            for cid in category_scores
            if category_scores[cid] > _SCORE_EPS
        ]
        positive.sort(key=lambda x: (-x[1], x[0]))

        if len(positive) == 1:
            only_one_scoring_class = True
        elif len(positive) >= 2:
            best_id, best_v = positive[0]
            run_id, run_v = positive[1]
            runner_up_category_id = run_id
            runner_up_category = str(category_map.get(run_id, "Unknown"))
            runner_up_raw = run_v
            runner_up_share = score_shares[run_id]
            margin_raw = best_v - run_v
            margin_share = score_shares[best_id] - score_shares[run_id]

    scores_by_name = {
        str(category_map.get(cid, cid)): score for cid, score in category_scores.items()
    }

    return {
        "predicted_category": predicted_category,
        "predicted_category_id": predicted_cat_id,
        "relative_score_share": relative_score_share,
        "confidence": relative_score_share,
        "margin_raw": margin_raw,
        "margin_share": margin_share,
        "runner_up_category_id": runner_up_category_id,
        "runner_up_category": runner_up_category,
        "runner_up_raw": runner_up_raw,
        "runner_up_share": runner_up_share,
        "only_one_scoring_class": only_one_scoring_class,
        "all_scores": category_scores,
        "all_scores_by_name": scores_by_name,
        "score_shares": score_shares,
        "score_shares_by_name": score_shares_by_name,
    }
