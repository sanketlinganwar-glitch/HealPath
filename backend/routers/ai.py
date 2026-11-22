import os
import json
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from backend.db import get_db
from backend.models import Department, Token
from backend.schemas import (
    AISuggestRequest,
    AISuggestResponse,
    AITriageRequest,
    AITriageResponse,
    ChatRequest,
    ChatResponse,
    ConversationResetRequest,
    ConversationResetResponse,
    SuggestedAction
)
from backend.services.queue import get_token_position_and_wait
from backend.services.ai_service import (
    triage_symptoms_with_gemini,
    chat_turn_with_gemini,
    conversation_store,
    get_gemini_client,
    HEALTHCARE_DISCLAIMER
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["ai"])

DEFAULT_DISCLAIMER = "This is a guidance suggestion, not a medical diagnosis. In case of emergency, proceed immediately to the Emergency Desk."


# --- Backward Compatible Department Suggestion ---
@router.post("/ai/suggest-department", response_model=AISuggestResponse)
def suggest_department(payload: AISuggestRequest, db: Session = Depends(get_db)):
    """Suggest appropriate medical department using AI based on reported symptoms."""
    departments = db.query(Department).all()
    dept_map = {d.name.lower(): d for d in departments}
    dept_list_str = ", ".join([f"{d.id}: {d.name}" for d in departments])

    # Rule-based fast check / fallback
    symptoms_lower = payload.symptoms.lower()
    fallback_dept = db.query(Department).filter(Department.name == "General Medicine").first()
    fallback_id = fallback_dept.id if fallback_dept else 1
    fallback_name = fallback_dept.name if fallback_dept else "General Medicine"

    # Default fallback response
    fallback_res = {
        "department_id": fallback_id,
        "department_name": fallback_name,
        "reason": "Based on your symptoms, General Medicine is the best department for initial evaluation.",
        "disclaimer": DEFAULT_DISCLAIMER,
        "fallback": True
    }

    # Keyword rules for guaranteed accuracy
    if any(k in symptoms_lower for k in ["heart", "chest pain", "palpitation", "bp", "cardiac"]):
        cardio = dept_map.get("cardiology")
        if cardio:
            fallback_res = {
                "department_id": cardio.id,
                "department_name": cardio.name,
                "reason": "Chest pain, heart palpitations, or cardiovascular concerns are best handled by Cardiology.",
                "disclaimer": DEFAULT_DISCLAIMER,
                "fallback": False
            }
    elif any(k in symptoms_lower for k in ["bone", "joint", "fracture", "knee", "spine", "arthritis", "sprain", "हड्डी", "सांधे"]):
        ortho = dept_map.get("orthopedics")
        if ortho:
            fallback_res = {
                "department_id": ortho.id,
                "department_name": ortho.name,
                "reason": "Joint, bone, sprain, or spine concerns should be evaluated by an Orthopedic specialist.",
                "disclaimer": DEFAULT_DISCLAIMER,
                "fallback": False
            }
    elif any(k in symptoms_lower for k in ["child", "baby", "infant", "pediatric", "vaccination", "kid", "बाळ", "बच्चा"]):
        peds = dept_map.get("pediatrics")
        if peds:
            fallback_res = {
                "department_id": peds.id,
                "department_name": peds.name,
                "reason": "Infants, toddlers, and children under 16 should be evaluated by Pediatrics.",
                "disclaimer": DEFAULT_DISCLAIMER,
                "fallback": False
            }
    elif any(k in symptoms_lower for k in ["ear", "nose", "throat", "sinus", "tonsil", "hearing", "कान", "नाक", "गला"]):
        ent = dept_map.get("ent")
        if ent:
            fallback_res = {
                "department_id": ent.id,
                "department_name": ent.name,
                "reason": "Ear pain, nasal issues, or throat discomfort should be evaluated by ENT.",
                "disclaimer": DEFAULT_DISCLAIMER,
                "fallback": False
            }

    client = get_gemini_client()
    if not client:
        return fallback_res

    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    prompt = (
        f"You are an AI triage assistant for an Indian multi-specialty hospital.\n"
        f"Hospital departments available: {dept_list_str}\n"
        f"Patient symptoms: '{payload.symptoms}'\n\n"
        f"Select the most appropriate department ID and department name from the list.\n"
        f"Provide a brief 1-sentence reason.\n"
        f"Return ONLY a valid JSON object in this exact shape:\n"
        f'{{"department_id": 2, "department_name": "Cardiology", "reason": "Reason here"}}\n'
    )

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
        )
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:].strip()
        data = json.loads(text.strip())

        matched_dept = db.query(Department).filter(Department.id == data.get("department_id")).first()
        if matched_dept:
            return {
                "department_id": matched_dept.id,
                "department_name": matched_dept.name,
                "reason": data.get("reason", f"Evaluated for {matched_dept.name}"),
                "disclaimer": DEFAULT_DISCLAIMER,
                "fallback": False
            }
    except Exception as e:
        logger.warning(f"Gemini triage failed, using fallback: {e}")

    return fallback_res


# --- Stage 5: Advanced Structured AI Symptom Triage ---
@router.post("/ai/triage", response_model=AITriageResponse)
def triage_symptoms(payload: AITriageRequest, db: Session = Depends(get_db)):
    """
    Stage 5 AI Symptom Triage Engine powered by Google Gemini 2.5 Flash.
    Provides structured hospital department recommendations, urgency classification,
    and medical safety disclaimers with automatic deterministic offline fallback.
    """
    departments = db.query(Department).all()
    result = triage_symptoms_with_gemini(
        main_symptom=payload.main_symptom,
        duration=payload.duration,
        severity=payload.severity,
        age_group=payload.age_group,
        associated_symptoms=payload.associated_symptoms,
        preexisting_conditions=payload.preexisting_conditions,
        language=payload.language or "en",
        departments=departments
    )
    return result


# --- Stage 5: Conversation Session Reset ---
@router.post("/ai/conversation/reset", response_model=ConversationResetResponse)
def reset_conversation(payload: ConversationResetRequest):
    """
    Resets a multi-turn conversation session, clearing context history for user privacy.
    """
    cleared = conversation_store.reset(payload.conversation_id)
    return {
        "success": True,
        "message": "Conversation session reset successfully." if cleared else "Session already inactive or not found.",
        "conversation_id": payload.conversation_id
    }


# --- Stage 5: Multilingual Hospital Chatbot 2.5 ---
@router.post("/chat", response_model=ChatResponse)
def hospital_chat(payload: ChatRequest, request: Request, db: Session = Depends(get_db)):
    """
    AI Health Assistant 2.5: Multilingual hospital assistant supporting English, Hindi (hi), and Marathi (mr).
    Handles symptom triage, follow-up questions, queue tracking, appointment booking guidance,
    and emergency safety warnings with medical disclaimers and multi-turn context retention.
    """
    client_ip = request.client.host if request.client else None

    # Retrieve real token context if provided
    token_context = None
    token_id_to_use = payload.token_id
    if not token_id_to_use:
        import re
        from backend.models import Patient
        tok_match = re.search(r'\b([A-Za-z]{1,4}-\d{1,4})\b', payload.message)
        if tok_match:
            found_token = db.query(Token).filter(Token.token_number == tok_match.group(1).upper()).first()
            if found_token:
                token_id_to_use = found_token.id
        else:
            phone_match = re.search(r'\b\d{10}\b', payload.message)
            if phone_match:
                pat = db.query(Patient).filter(Patient.phone == phone_match.group(0)).first()
                if pat:
                    found_token = db.query(Token).filter(
                        Token.patient_id == pat.id,
                        Token.status.in_(["waiting", "in_progress"])
                    ).order_by(Token.id.desc()).first()
                    if found_token:
                        token_id_to_use = found_token.id

    if token_id_to_use:
        token_obj = db.query(Token).filter(Token.id == token_id_to_use).first()
        if token_obj:
            pos, ahead, est_wait = get_token_position_and_wait(db, token_obj)
            room_str = token_obj.doctor.room if token_obj.doctor else "Consultation room"
            token_context = (
                f"Token Number: {token_obj.token_number}, "
                f"Department: {token_obj.department.name}, "
                f"Status: {token_obj.status}, "
                f"Position in queue: {pos or 'N/A'}, "
                f"People ahead: {ahead if ahead is not None else 'N/A'}, "
                f"Estimated wait time: {est_wait if est_wait is not None else 0} minutes, "
                f"Doctor Room: {room_str}."
            )

    departments = db.query(Department).all()
    result = chat_turn_with_gemini(
        message=payload.message,
        conversation_id=payload.conversation_id,
        language=payload.language or "en",
        token_context=token_context,
        client_ip=client_ip,
        departments=departments,
        db=db,
        token_id=token_id_to_use
    )
    return result
