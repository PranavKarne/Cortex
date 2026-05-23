from fastapi import APIRouter, UploadFile, File
import os
import shutil

from app.services.document_parser import extract_text_from_pdf
from app.services.rag_service import analyze_judgment_with_llm

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

os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/predict-judgment")
async def predict_judgment(
    file: UploadFile = File(...)
):

    file_path = os.path.join(
        UPLOAD_DIR,
        file.filename
    )

    with open(file_path, "wb") as buffer:

        shutil.copyfileobj(
            file.file,
            buffer
        )

    case_text = extract_text_from_pdf(
        file_path
    )

    prediction = analyze_judgment_with_llm(
        case_text,
        
    )

    return prediction