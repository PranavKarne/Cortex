from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import fitz
import os
from dotenv import load_dotenv

from fastapi import Form
from app.api.routes.legal_routes import router as legal_router
from app.api.routes.upload_routes import router as upload_router
from app.api.routes.auth_routes import router as auth_router
from app.services.rag_service import generate_courtroom_turn
from app.services.rag_service import generate_courtroom_opening
from app.services.rag_service import generate_courtroom_summary
from app.db import Base, engine
from app.api.routes.judgment_routes import router as judgment_router 
from app.services.rag_service import analyze_judgment_with_llm



app = FastAPI(title="CORTEX API")

load_dotenv()

Base.metadata.create_all(bind=engine)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=()"
        return response


app.add_middleware(SecurityHeadersMiddleware)



def get_allowed_origins():
    origins_env = os.getenv("CORS_ORIGINS", "")
    defaults = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173"
    ]

    if not origins_env.strip():
        return defaults

    normalized = []
    for origin in origins_env.split(","):
        value = origin.strip()
        if not value:
            continue
        if "://" not in value:
            value = f"http://{value}"
        normalized.append(value)

    return list(dict.fromkeys(normalized + defaults))

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(legal_router)
app.include_router(upload_router)
app.include_router(auth_router)
app.include_router(judgment_router)

@app.get("/")
def root():
    return {"message": "CORTEX backend running"}

from app.services.rag_service import analyze_contract_with_llm


@app.post("/analyze-contract")
async def analyze_contract(
    file: UploadFile = File(...),
):

    pdf_bytes = await file.read()

    doc = fitz.open(
        stream=pdf_bytes,
        filetype="pdf"
    )
    

    text = ""

    for page in doc:
        text += page.get_text()

    print(text)

    analysis = analyze_contract_with_llm(text)

    return analysis



@app.post("/start-courtroom-session")
async def start_courtroom_session(
    file: UploadFile = File(...),
    role: str = Form(...),
):
    try:
        pdf_bytes = await file.read()

        doc = fitz.open(
            stream=pdf_bytes,
            filetype="pdf"
        )

        text = ""

        for page in doc:
            text += page.get_text()

        opening_payload = generate_courtroom_opening(text, role)

        opening_payload["role"] = role

        return opening_payload
    
    except Exception as e:
        print(f"Error in start_courtroom_session: {e}")
        return {
            "caseTitle": "Case Analysis",
            "openingArgument": {
                "speaker": "Judge",
                "message": "Courtroom session started. Please proceed with your argument."
            },
            "judgeContext": {
                "focusPoints": [
                    "Presentation of evidence",
                    "Legal precedents",
                    "Credibility of witnesses"
                ]
            },
            "role": role,
            "error": str(e)
        }

@app.post("/courtroom-turn")
async def courtroom_turn(
    request: dict,
):
    try:
        result = generate_courtroom_turn(
            role=request["role"],
            user_message=request["userMessage"],
            history=request["history"],
            case_context=request["caseContext"]
        )

        return result
    
    except Exception as e:
        print(f"Error in courtroom_turn: {e}")
        return {
            "aiResponse": {
                "speaker": "AI Opponent",
                "message": "I acknowledge your argument. The court will consider this point."
            },
            "judgeFeedback": {
                "logic": "The argument has been noted for the record.",
                "evidenceUsage": "The argument has been noted for the record.",
                "legalStrength": "The argument has been noted for the record.",
                "overallFeedback": "The argument has been noted for the record.",
                "roundWinner": "tie",
                "score": 5
            },
            "error": str(e)
        }


@app.post("/courtroom-summary")
async def courtroom_summary(
    request: dict,
):
    try:
        result = generate_courtroom_summary(
            role=request["role"],
            history=request["history"],
            case_context=request.get("caseContext", "")
        )

        return result

    except Exception as e:
        print(f"Error in courtroom_summary: {e}")
        return {
            "winner": "tie",
            "score": 0,
            "summary": "Final summary unavailable. The session has been recorded.",
            "userStrengths": [],
            "userWeaknesses": [],
            "opponentStrengths": [],
            "opponentWeaknesses": [],
            "actionableAdvice": [],
            "error": str(e)
        }
