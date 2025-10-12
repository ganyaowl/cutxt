from typing import Tuple, Dict, Any
import numpy as np
import pandas as pd

from nlp.preprocessor import preprocess_uzbek_text

def classify_text(text: str, tables_df: pd.DataFrame, keys_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Rule-based classification for Uzbek text using keyword matching with weights.
    - Tokenize the text.
    - For each token, find matching keys in the database.
    - Sum weights/percentages per category (table_id).
    - Assign the category with the highest score.
    Assumes 'keys' table has 'key' (str), 'weight' (int/float), 'percent' (float), 'table_id' (int).
    'tables' has 'id' (int), 'name' (str), 'category_type' (int).
    """
    tokens = preprocess_uzbek_text(text)
    
    # Prepare category mapping: table_id -> name
    category_map = dict(zip(tables_df['id'], tables_df['name']))
    
    # Initialize scores per category
    category_scores = {cat_id: 0.0 for cat_id in category_map.keys()}
    
    # Find matches and accumulate scores (using 'percent' as score weight)
    for token in tokens:
        matching_keys = keys_df[keys_df['key'].str.lower() == token.lower()]
        for _, key_row in matching_keys.iterrows():
            cat_id = key_row['table_id']
            score_add = key_row['percent']  # Use percent as relevance score
            if cat_id in category_scores:
                category_scores[cat_id] += score_add
    
    # Find the category with max score
    if not any(category_scores.values()):  # No matches
        predicted_category = "Unknown"
        confidence = 0.0
    else:
        predicted_cat_id = max(category_scores, key=category_scores.get)
        predicted_category = category_map.get(predicted_cat_id, "Unknown")
        confidence = category_scores[predicted_cat_id]
    
    return {
        "predicted_category": predicted_category,
        "confidence": confidence,
        "all_scores": category_scores
    }