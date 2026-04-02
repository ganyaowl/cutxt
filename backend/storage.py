"""Safe filenames and bounded upload reads."""

from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

DEFAULT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024


def max_upload_bytes() -> int:
    raw = os.environ.get("MAX_UPLOAD_BYTES")
    if raw is None or not raw.strip():
        return DEFAULT_MAX_UPLOAD_BYTES
    try:
        return max(1, int(raw))
    except ValueError:
        return DEFAULT_MAX_UPLOAD_BYTES


def safe_stored_name(original_filename: str | None, allowed_suffixes: tuple[str, ...]) -> str:
    if not original_filename:
        raise HTTPException(status_code=400, detail="No file provided")
    suffix = Path(original_filename).suffix.lower()
    if suffix not in allowed_suffixes:
        raise HTTPException(
            status_code=400,
            detail=f"File extension must be one of: {', '.join(allowed_suffixes)}",
        )
    return f"{uuid.uuid4().hex}{suffix}"


async def save_upload_file(upload: UploadFile, dest_path: str, limit: int) -> None:
    written = 0
    try:
        with open(dest_path, "wb") as out:
            while True:
                chunk = await upload.read(1024 * 1024)
                if not chunk:
                    break
                written += len(chunk)
                if written > limit:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large (max {limit} bytes)",
                    )
                out.write(chunk)
    except HTTPException:
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise
