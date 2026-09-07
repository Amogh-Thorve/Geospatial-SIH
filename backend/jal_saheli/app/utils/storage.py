"""
app/utils/storage.py
Local-disk photo storage abstraction.

Phase 3: local backend only.
Phase 7+: swap in S3/GCS by implementing the same interface.
"""
from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path

from fastapi import UploadFile

logger = logging.getLogger("jal_saheli.storage")

# Allowed MIME types for uploaded photos
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic"}


def _get_storage_dir(base_dir: str, cadre_id: str) -> Path:
    # Sanitize cadre_id to prevent path traversal
    safe_cadre_id = "".join(c for c in cadre_id if c.isalnum() or c in ("-", "_"))
    if not safe_cadre_id:
        safe_cadre_id = "default"

    base = Path(base_dir).resolve()
    p = (base / safe_cadre_id).resolve()

    if not p.is_relative_to(base):
        raise ValueError("Invalid storage directory path: path traversal detected")

    p.mkdir(parents=True, exist_ok=True)
    return p


def check_image_magic_bytes(content: bytes) -> bool:
    """
    Inspect initial byte slice to verify actual image signature.
    Prevents disguised executables or scripts uploaded with image extensions.
    """
    if len(content) < 12:
        return False

    # JPEG: FF D8 FF
    if content.startswith(b"\xff\xd8\xff"):
        return True

    # PNG: 89 50 4E 47 0D 0A 1A 0A
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return True

    # WebP: RIFF .... WEBP
    if content.startswith(b"RIFF") and content[8:12] == b"WEBP":
        return True

    # HEIC / ISO Base Media File Format: ....ftyp
    if content[4:8] == b"ftyp":
        brand = content[8:12].lower()
        if brand in (b"heic", b"heix", b"mif1", b"msf1"):
            return True

    return False


def validate_photo_headers(file: UploadFile) -> None:
    """
    Validate photo file type header and filename extension.
    Raises ValueError with a user-friendly message on failure.
    """
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise ValueError(
            f"Unsupported file type '{file.content_type}'. "
            f"Allowed: JPEG, PNG, WebP, HEIC."
        )
    ext = Path(file.filename or "").suffix.lower()
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported extension '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")


def validate_photo_content(content: bytes, max_bytes: int) -> None:
    """
    Validate binary content for size and magic byte signatures.
    Raises ValueError if the payload is invalid, empty, or disguised.
    """
    if not content:
        raise ValueError("Photo payload cannot be empty.")

    if len(content) > max_bytes:
        raise ValueError(
            f"Photo exceeds maximum size of {max_bytes // 1_048_576} MB "
            f"(received {len(content) // 1024} KB)."
        )

    if not check_image_magic_bytes(content):
        raise ValueError(
            "File content does not match a valid image signature (JPEG, PNG, WebP, HEIC). "
            "Disguised or corrupted files are rejected."
        )


def validate_photo(file: UploadFile, max_bytes: int) -> None:
    """Compatibility wrapper for validate_photo_headers."""
    validate_photo_headers(file)


async def save_photo(
    file: UploadFile,
    cadre_id: str,
    submission_id: str,
    base_dir: str,
    max_bytes: int,
) -> tuple[str, str]:
    """
    Save uploaded photo to local disk.
    Performs header, extension, size, and magic-byte signature validation.

    Returns:
        (photo_url, filename) where photo_url is a relative path
        that can be served via a static files mount.

    Raises:
        ValueError: if file exceeds max size or fails validation.
    """
    validate_photo_headers(file)

    storage_dir = _get_storage_dir(base_dir, cadre_id)

    # Sanitize submission_id and extension
    safe_sub_id = "".join(c for c in submission_id if c.isalnum() or c in ("-", "_"))
    ext = Path(file.filename or "photo.jpg").suffix.lower() or ".jpg"
    if ext not in ALLOWED_EXTENSIONS:
        ext = ".jpg"

    filename = f"{safe_sub_id}{ext}"
    dest = (storage_dir / filename).resolve()

    if not dest.is_relative_to(Path(base_dir).resolve()):
        raise ValueError("Invalid target path: path traversal detected")

    content = await file.read()
    validate_photo_content(content, max_bytes)

    dest.write_bytes(content)
    logger.info("Photo saved", extra={"path": str(dest), "size_kb": len(content) // 1024})

    # Return a URL path relative to the uploads root
    photo_url = f"/uploads/{cadre_id}/{filename}"
    return photo_url, filename


def delete_photo(photo_url: str, base_dir: str) -> None:
    """Delete a stored photo. Silent if file does not exist."""
    try:
        # Strip leading /uploads/
        rel = photo_url.lstrip("/").removeprefix("uploads/")
        base = Path(base_dir).resolve()
        dest = (base / rel).resolve()
        if dest.is_relative_to(base) and dest.exists():
            dest.unlink()
            logger.info("Photo deleted", extra={"path": str(dest)})
    except Exception as exc:
        logger.warning("Failed to delete photo", extra={"url": photo_url, "error": str(exc)})

