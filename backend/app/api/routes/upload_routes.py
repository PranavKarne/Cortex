import os
import re
import shutil

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    HTTPException
)

from app.services.document_parser import process_pdf

from app.services.chunking_service import chunk_text

from app.services.embedding_service import (
    store_embeddings,
    clear_embeddings
)

router = APIRouter()

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.dirname(os.path.abspath(__file__))
        )
    )
)

UPLOAD_DIR = os.path.join(
    BASE_DIR,
    "data",
    "uploads"
)

MAX_UPLOAD_BYTES = 25 * 1024 * 1024

ALLOWED_EXTENSIONS = {".pdf"}

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/octet-stream"
}

os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload-document")
async def upload_document(
    file: UploadFile = File(...)
):

    if (
        file.content_type
        and file.content_type not in ALLOWED_CONTENT_TYPES
    ):

        raise HTTPException(
            status_code=400,
            detail="Unsupported file type"
        )

    original_name = os.path.basename(
        file.filename or ""
    )

    safe_name = re.sub(
        r"[^A-Za-z0-9._-]",
        "_",
        original_name
    )

    ext = os.path.splitext(
        safe_name
    )[1].lower()

    if ext not in ALLOWED_EXTENSIONS:

        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed"
        )

    if not safe_name:

        raise HTTPException(
            status_code=400,
            detail="Invalid filename"
        )

    file_path = os.path.join(
        UPLOAD_DIR,
        safe_name
    )

    with open(file_path, "wb") as buffer:

        shutil.copyfileobj(
            file.file,
            buffer
        )

    if os.path.getsize(file_path) > MAX_UPLOAD_BYTES:

        os.remove(file_path)

        raise HTTPException(
            status_code=413,
            detail="File too large"
        )

    extracted_text = process_pdf(file_path)

    chunks = chunk_text(
        extracted_text,
        safe_name
    )

    # IMPORTANT FIX
    clear_embeddings()

    store_embeddings(chunks)

    return {
        "message":
        "Document uploaded and processed successfully",

        "filename": safe_name,

        "chunks_created": len(chunks)
    }
    
    