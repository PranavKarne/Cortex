import os
import json

from openai import OpenAI
from dotenv import load_dotenv

from app.services.chat_history_service import save_chat

from app.services.retrieval_service import (
    retrieve_similar_chunks
)

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)


def generate_legal_answer(
    query,
    source_file
):

    retrieved_chunks = retrieve_similar_chunks(
        query,
        source_file
    )

    context = "\n\n".join(
        [chunk["text"] for chunk in retrieved_chunks]
    )

    prompt = f"""
You are an expert AI legal assistant specialized in Indian law.

Answer clearly, professionally, and ONLY from the provided legal context.

Rules:
- Do not hallucinate
- Do not invent laws or sections
- Keep answers concise and structured
- Use bullet points when appropriate
- Mention section names if available
- Avoid repeating information
- If answer unavailable, say:
"I could not find sufficient legal support in the retrieved documents."

LEGAL CONTEXT:
{context}

USER QUESTION:
{query}

ANSWER:
"""

    response = client.chat.completions.create(
        model="poolside/laguna-xs.2:free",

        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0.2
    )

    answer = response.choices[0].message.content.strip()

    sources = []

    seen_sources = set()

    for chunk in retrieved_chunks:

        metadata = chunk.get("metadata", {})

        source_file_name = metadata.get(
            "source_file",
            "Unknown"
        )

        chunk_number = metadata.get(
            "chunk_number",
            "Unknown"
        )

        source_key = (
            source_file_name,
            chunk_number
        )

        if source_key not in seen_sources:

            seen_sources.add(source_key)

            sources.append({
                "file": source_file_name,
                "chunk": chunk_number
            })

    chat_data = {
        "query": query,
        "answer": answer,
        "sources": sources
    }

    save_chat(chat_data)

    return {
        "query": query,
        "answer": answer,
        "sources": sources
    }


def analyze_case_risk(
    case_text,
    source_file
):

    retrieved_chunks = retrieve_similar_chunks(
        case_text,
        source_file,
        top_k=5
    )

    context = "\n\n".join(
        [chunk["text"] for chunk in retrieved_chunks]
    )

    prompt = f"""
You are an expert AI legal risk assessor.

Analyze the uploaded case carefully.

Return STRICT JSON only.

Rules:
- Return ONLY valid JSON
- No markdown
- No explanations
- Use ONLY retrieved legal context
- Do not hallucinate

Return format:

{{
    "risk_score": number,
    "risk_level": "Low|Medium|High",
    "case_strength": "string",
    "analysis_summary": "string",

    "key_risk_factors": [
        {{
            "title":"string",
            "description":"string"
        }}
    ],

    "evidence_strength": {{
        "witnesses":"Low/Medium/High",
        "documents":"Low/Medium/High"
    }},

    "similar_precedents": [
        {{
            "case":"string",
            "citation":"string",
            "similarity":number
        }}
    ],

    "recommendations": "string"
}}

RETRIEVED_PRECEDENTS:
{context}

CASE_TEXT:
{case_text}
"""

    response = client.chat.completions.create(
        model="poolside/laguna-xs.2:free",

        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0.2
    )

    content = response.choices[0].message.content.strip()

    try:

        return json.loads(content)

    except Exception:

        print("JSON PARSE ERROR:")
        print(content)

        return {
            "risk_score": 0,
            "risk_level": "Unknown",
            "case_strength": "Unknown",
            "analysis_summary":
            "Model returned invalid JSON.",

            "key_risk_factors": [],

            "evidence_strength": {},

            "similar_precedents": [],

            "recommendations":
            "Analysis failed."
        }
def analyze_judgment_with_llm(
    case_text,
    source_file=None
):

    retrieved_chunks = retrieve_similar_chunks(
        case_text,
        "judgment_prediction",
        top_k=5
    )

    context = "\n\n".join(
        [chunk["text"] for chunk in retrieved_chunks]
    )
    prompt = f"""
You are an expert AI legal judgment prediction system.

Analyze the following legal case using the retrieved legal precedents.

Return STRICT JSON only.

Rules:
- Return ONLY valid JSON
- No markdown
- No explanations
- Output must be parseable using json.loads()
- Use retrieved precedents while generating prediction
- Do not invent unsupported legal reasoning

Return format:

{{
  "caseType": "string",
  "predictedOutcome": "string",
  "confidence": number,
  "riskLevel": "Low/Medium/High",

  "reasoning": [
    "reason 1",
    "reason 2"
  ],

  "precedents": [
    {{
      "case": "string",
      "similarity": number,
      "outcome": "string"
    }}
  ],

  "factors": [
    {{
      "name": "string",
      "score": number
    }}
  ]
}}

SIMILAR LEGAL PRECEDENTS:
{context}

CASE:
{case_text}
"""

    response = client.chat.completions.create(
        model="poolside/laguna-xs.2:free",

        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0.2
    )

    content = response.choices[0].message.content.strip()

    try:

        return json.loads(content)

    except Exception:

        print("JSON PARSE ERROR:")
        print(content)

        return {
            "caseType": "Unknown",
            "predictedOutcome": "Prediction Failed",
            "confidence": 0,
            "riskLevel": "Unknown",
            "reasoning": [
                "Model returned invalid JSON."
            ],
            "precedents": [],
            "factors": []
        }


def analyze_contract_with_llm(contract_text):

    prompt = f"""
You are an expert legal contract analysis AI.

Analyze the uploaded contract and return STRICT JSON only.

Return format:

{{
  "summary": {{
    "clausesDetected": number,
    "criticalRisks": number,
    "complianceScore": number,
    "status": "string"
  }},
  "points": [
    "point 1",
    "point 2"
  ],
  "clauses": [
    {{
      "type": "string",
      "title": "string",
      "risk": "High/Medium/Low",
      "section": "string",
      "status": "string",
      "description": "string"
    }}
  ]
}}

CONTRACT:
{contract_text}
"""

    response = client.chat.completions.create(
        model="poolside/laguna-xs.2:free",

        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0.2
    )

    content = response.choices[0].message.content.strip()

    try:

        return json.loads(content)

    except Exception:

        return {
            "summary": {
                "clausesDetected": 0,
                "criticalRisks": 0,
                "complianceScore": 0,
                "status": "Parsing Failed"
            },

            "points": [
                "Model returned invalid JSON output."
            ],

            "clauses": []
        }


def generate_courtroom_opening(
    case_text,
    role,
    source_file
):

    retrieved_chunks = retrieve_similar_chunks(
        case_text,
        source_file,
        top_k=5
    )

    context = "\n\n".join(
        [chunk["text"] for chunk in retrieved_chunks]
    )

    opponent_role = (
        "Prosecutor"
        if role.lower() == "defense"
        else "Defense Counsel"
    )

    prompt = f"""
You are an AI courtroom simulation system.

Generate courtroom opening.

CASE:
{case_text}

PRECEDENTS:
{context}
"""

    response = client.chat.completions.create(
        model="poolside/laguna-xs.2:free",

        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0.3
    )

    content = response.choices[0].message.content.strip()

    try:

        return json.loads(content)

    except Exception:

        return {
            "caseTitle": "Unknown Case",

            "judgeOpening": {
                "speaker": "Judge",
                "message": "Court is now in session."
            },

            "openingArgument": {
                "speaker": opponent_role,
                "message": "Unable to generate opening."
            },

            "judgeContext": {
                "focusPoints": []
            }
        }


def generate_courtroom_turn(
    role,
    user_message,
    history,
    case_context
):

    opponent_role = (
        "Prosecutor"
        if role.lower() == "defense"
        else "Defense Counsel"
    )

    prompt = f"""
Continue courtroom debate.

CASE:
{case_context}

HISTORY:
{history}

USER:
{user_message}
"""

    response = client.chat.completions.create(
        model="poolside/laguna-xs.2:free",

        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0.4
    )

    content = response.choices[0].message.content.strip()

    try:

        return json.loads(content)

    except Exception:

        return {
            "aiResponse": {
                "speaker": opponent_role,
                "message": "Unable to generate rebuttal."
            },

            "judgeFeedback": {
                "logic": "Evaluation failed.",
                "evidenceUsage": "Evaluation failed.",
                "legalStrength": "Evaluation failed.",
                "overallFeedback": "Evaluation failed.",
                "roundWinner": "tie",
                "score": 0
            }
        }


def generate_courtroom_summary(
    role,
    history,
    case_context
):

    opponent_role = (
        "Prosecutor"
        if role.lower() == "defense"
        else "Defense Counsel"
    )

    prompt = f"""
Generate courtroom summary.

CASE:
{case_context}

HISTORY:
{history}
"""

    response = client.chat.completions.create(
        model="poolside/laguna-xs.2:free",

        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0.3
    )

    content = response.choices[0].message.content.strip()

    try:

        return json.loads(content)

    except Exception:

        return {
            "winner": "tie",
            "score": 0,
            "summary": "Unable to generate final summary.",
            "userStrengths": [],
            "userWeaknesses": [],
            "opponentStrengths": [],
            "opponentWeaknesses": [],
            "actionableAdvice": []
        }
        