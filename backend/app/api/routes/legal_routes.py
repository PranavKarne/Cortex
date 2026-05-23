from fastapi import APIRouter

from pydantic import BaseModel

from app.services.chat_history_service import (
    get_chat_history
)

from app.services.rag_service import (
    generate_legal_answer,
    analyze_case_risk
)

from app.services.document_parser import (
    extract_text_from_pdf
)

import os

router = APIRouter()


class LegalQuery(BaseModel):

    query: str

    source_file : str


@router.post("/legal-query")
def legal_query(
    payload: LegalQuery,
):

    answer = generate_legal_answer(
        payload.query,
        payload.source_file
    )

    return answer


@router.get("/chat-history")
def chat_history():

    return get_chat_history()


class CaseRiskRequest(BaseModel):

    filename: str


@router.post("/case-risk")
def case_risk(
    payload: CaseRiskRequest,
):

    BASE_DIR = os.path.dirname(
        os.path.dirname(
            os.path.dirname(
                os.path.dirname(
                    os.path.abspath(__file__)
                )
            )
        )
    )

    upload_dir = os.path.join(
        BASE_DIR,
        "data",
        "uploads"
    )

    file_path = os.path.join(
        upload_dir,
        payload.filename
    )

    if not os.path.exists(file_path):

        return {
            "error": "Uploaded file not found"
        }

    try:

        case_text = extract_text_from_pdf(
            file_path
        )

        analysis = analyze_case_risk(
            case_text,
            payload.filename
        )

        return analysis

    except Exception as e:

        print(f"Error in case_risk: {e}")

        return {
            "error": str(e)
        }
        
        