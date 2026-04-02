"""Validation for uploaded reference SQLite (tables + keys)."""

from __future__ import annotations

import sqlite3

import pandas as pd

REQUIRED_TABLES_COLUMNS = {"id", "name"}
REQUIRED_KEYS_COLUMNS = {"key", "table_id", "percent"}


class ReferenceDBError(ValueError):
    """Invalid reference database schema or content."""


def _list_tables(conn: sqlite3.Connection) -> set[str]:
    cur = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )
    return {row[0] for row in cur.fetchall()}


def _validate_columns(df: pd.DataFrame, required: set[str], table_label: str) -> None:
    missing = required - set(df.columns)
    if missing:
        raise ReferenceDBError(
            f"Table {table_label!r} is missing columns: {sorted(missing)}"
        )


def load_database_validated(db_path: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Load reference DB and enforce expected tables/columns.
    Raises ReferenceDBError on invalid schema.
    """
    conn = sqlite3.connect(db_path)
    try:
        tables = _list_tables(conn)
        if "tables" not in tables or "keys" not in tables:
            raise ReferenceDBError(
                "Reference database must contain SQLite tables named 'tables' and 'keys'"
            )
        tables_df = pd.read_sql_query("SELECT * FROM tables", conn)
        keys_df = pd.read_sql_query("SELECT * FROM keys", conn)
    finally:
        conn.close()

    if tables_df.empty:
        raise ReferenceDBError("Table 'tables' must not be empty")
    if keys_df.empty:
        raise ReferenceDBError("Table 'keys' must not be empty")

    _validate_columns(tables_df, REQUIRED_TABLES_COLUMNS, "tables")
    _validate_columns(keys_df, REQUIRED_KEYS_COLUMNS, "keys")

    if keys_df["key"].isna().any():
        raise ReferenceDBError("Column 'keys.key' must not contain null values")
    if keys_df["table_id"].isna().any():
        raise ReferenceDBError("Column 'keys.table_id' must not contain null values")

    table_ids = set(tables_df["id"].dropna().astype(int))
    bad_refs = keys_df["table_id"].dropna().astype(int)
    orphaned = set(bad_refs) - table_ids
    if orphaned:
        raise ReferenceDBError(
            f"keys.table_id references unknown category ids: {sorted(orphaned)[:10]}"
            + ("…" if len(orphaned) > 10 else "")
        )

    return tables_df, keys_df
