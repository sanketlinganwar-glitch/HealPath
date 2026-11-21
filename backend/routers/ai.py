import os
import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from backend.db import get_db
from backend.models import Department, Token
from backend.schemas import (
    AISuggestRequest,
    AISuggestResponse,
    ChatRequest,
    ChatResponse,
    SuggestedAction
)
from backend.services.queue import get_token_position_and_wait

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["ai"])

DEFAULT_DISCLAIMER = "This is a guidance suggestion, not a medical diagnosis. In case of emergency, proceed immediately to the Emergency Desk."

def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        from google import genai
        return genai.Client(api_key=api_key)
    except Exception as e:
        logger.warning(f"Could not initialize Gemini Client: {e}")
        return None

# --- Department Suggestion ---
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


# --- Multilingual Hospital Chatbot 2.0 ---
@router.post("/chat", response_model=ChatResponse)
def hospital_chat(payload: ChatRequest, db: Session = Depends(get_db)):
    """
    AI Health Assistant 2.0: Multilingual hospital assistant supporting English, Hindi (hi), and Marathi (mr).
    Handles symptom triage, follow-up questions, queue tracking, appointment booking guidance,
    and emergency safety warnings with medical disclaimers.
    """
    lang = payload.language or "en"
    msg_lower = payload.message.lower().strip()

    # Retrieve real token context if provided
    token_context = ""
    token_obj = None
    if payload.token_id:
        token_obj = db.query(Token).filter(Token.id == payload.token_id).first()
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

    # 1. Emergency detection
    emergency_keywords = [
        "emergency", "heart attack", "chest pain", "severe bleeding", "unconscious",
        "choking", "accident", "stroke", "paralysis", "breathing difficulty",
        "आपातकाल", "छाती में दर्द", "सांस लेने में तकलीफ", "बेहोश", "तातडी", "हृदयविकार", "श्वास घेण्यास त्रास"
    ]
    if any(k in msg_lower for k in emergency_keywords):
        if lang == "hi":
            reply = "⚠️ यह एक आपातकालीन स्थिति लग रही है! कृपया तुरंत आपातकालीन डेस्क (Emergency Desk) पर जाएं या 112 पर कॉल करें। सॉफ्टवेयर टोकन या कतार में प्रतीक्षा न करें।"
        elif lang == "mr":
            reply = "⚠️ ही गंभीर आपत्कालीन परिस्थिती वाटत आहे! कृपया ताबडतोब आपत्कालीन कक्षात (Emergency Desk) जा किंवा 112 वर कॉल करा. रांगेत प्रतीक्षा करू नका."
        else:
            reply = "⚠️ This sounds like a potential medical emergency! Please proceed immediately to the hospital Emergency Desk or dial 112 for urgent evaluation. Do not delay care waiting for an online queue token."

        return {
            "reply": reply,
            "intent": "emergency",
            "suggested_actions": [
                {"label": "🚨 Emergency Desk", "action": "goto_emergency"},
                {"label": "📞 Call 112 / Ambulance", "action": "call_112"}
            ]
        }

    # 2. Appointment Booking queries
    appointment_keywords = ["appointment", "book appointment", "schedule", "अपॉइंटमेंट", "तारीख", "वेळ", "भेट"]
    if any(k in msg_lower for k in appointment_keywords) and not payload.token_id:
        if lang == "hi":
            reply = "आप हमारे ऑनलाइन बुकिंग सिस्टम के माध्यम से विभाग, डॉक्टर और समय स्लॉट चुनकर आसानी से अपॉइंटमेंट बुक कर सकते हैं।"
        elif lang == "mr":
            reply = "आपण आमच्या ऑनलाइन बुकिंग पोर्टलद्वारे विभाग, डॉक्टर आणि वेळेचा स्लॉट निवडून अपॉइंटमेंट बुक करू शकता."
        else:
            reply = "You can easily schedule a consultation with our specialist doctors by selecting your preferred department, doctor, date, and time slot."

        return {
            "reply": reply,
            "intent": "department_help",
            "suggested_actions": [
                {"label": "📅 Book Appointment", "action": "book_appointment"},
                {"label": "👨‍⚕️ View Doctors", "action": "view_doctors"}
            ]
        }

    # 3. Try Gemini API for conversational AI
    client = get_gemini_client()
    if client:
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        system_instruction = (
            f"You are the friendly, professional hospital AI assistant for HealPath.\n"
            f"STRICT RULES:\n"
            f"1. You must respond strictly in language: '{lang}' (en = English, hi = Hindi / Hinglish friendly, mr = Marathi).\n"
            f"2. Keep responses brief (1-3 sentences), warm, and reassuring.\n"
            f"3. NEVER diagnose illnesses or prescribe medication or dosages. Direct patient to relevant hospital departments.\n"
            f"4. If symptoms are vague (e.g. fever, headache, pain), ask 1 relevant clarifying follow-up question (e.g., duration, severity).\n"
            f"5. If token context is available, use it directly to answer queue questions.\n"
            f"6. Always adhere to medical safety: remind that this is guidance, not medical diagnosis.\n"
            f"Context: {token_context if token_context else 'No specific token selected'}\n"
        )

        try:
            response = client.models.generate_content(
                model=model_name,
                contents=f"{system_instruction}\n\nUser: {payload.message}",
            )
            ai_reply = response.text.strip()
            
            intent = "general"
            if "token" in msg_lower or "wait" in msg_lower or "queue" in msg_lower or "नंबर" in msg_lower:
                intent = "queue_status"
            elif "doctor" in msg_lower or "department" in msg_lower or "विभाग" in msg_lower or "डॉक्टर" in msg_lower:
                intent = "department_help"

            actions = [
                {"label": "📅 Book Appointment", "action": "book_appointment"},
                {"label": "🎫 Track Token", "action": "track_token"},
                {"label": "👨‍⚕️ Doctors Roster", "action": "view_doctors"},
            ]
            return {
                "reply": ai_reply,
                "intent": intent,
                "suggested_actions": actions
            }
        except Exception as e:
            logger.warning(f"Gemini chat failed, using fallback: {e}")

    # 4. Robust Rule-Based Fallback Engine
    if "status" in msg_lower or "wait" in msg_lower or "turn" in msg_lower or "queue" in msg_lower or "नंबर" in msg_lower or "वेळ" in msg_lower:
        intent = "queue_status"
        if token_obj:
            pos, ahead, est_wait = get_token_position_and_wait(db, token_obj)
            if token_obj.status == "in_progress":
                if lang == "hi":
                    reply = f"आपका टोकन {token_obj.token_number} वर्तमान में डॉ. {token_obj.doctor.name if token_obj.doctor else 'डॉक्टर'} के पास चल रहा है ({token_obj.doctor.room if token_obj.doctor else 'कक्षा'})।"
                elif lang == "mr":
                    reply = f"आपला टोकन {token_obj.token_number} सध्या डॉ. {token_obj.doctor.name if token_obj.doctor else 'डॉक्टर'} यांच्याकडे सुरू आहे ({token_obj.doctor.room if token_obj.doctor else 'कक्ष'})."
                else:
                    reply = f"Your token {token_obj.token_number} is currently in progress with {token_obj.doctor.name if token_obj.doctor else 'Doctor'} at {token_obj.doctor.room if token_obj.doctor else 'Room'}."
            elif token_obj.status == "waiting":
                if lang == "hi":
                    reply = f"टोकन {token_obj.token_number}: आपके आगे {ahead} लोग हैं। अनुमानित प्रतीक्षा समय लगभग {est_wait} मिनट है।"
                elif lang == "mr":
                    reply = f"टोकन {token_obj.token_number}: तुमच्या पुढे {ahead} रुग्ण आहेत. अंदाजे प्रतीक्षा वेळ सुमारे {est_wait} मिनिटे आहे."
                else:
                    reply = f"Token {token_obj.token_number}: You have {ahead} patient(s) ahead. Estimated wait is ~{est_wait} minutes."
            else:
                reply = f"Your token {token_obj.token_number} status is '{token_obj.status}'."
        else:
            if lang == "hi":
                reply = "आप अपने टोकन को ट्रैक करने के लिए अपना 10 अंकों का मोबाइल नंबर या टोकन आईडी दर्ज कर सकते हैं।"
            elif lang == "mr":
                reply = "आपला टोकन ट्रॅक करण्यासाठी कृपया आपला १० अंकी मोबाईल नंबर किंवा टोकन आयडी प्रविष्ट करा."
            else:
                reply = "You can track your live turn and estimated wait time by entering your 10-digit mobile number or Token ID on the patient tracking page."

        actions = [
            {"label": "🎫 Track My Token", "action": "track_token"},
            {"label": "📺 Display Board", "action": "view_display"},
        ]
    elif "doctor" in msg_lower or "department" in msg_lower or "विभाग" in msg_lower or "डॉक्टर" in msg_lower:
        intent = "department_help"
        if lang == "hi":
            reply = "हमारे अस्पताल में जनरल मेडिसिन, कार्डियोलॉजी, ऑर्थोपेडिक्स, पीडियाट्रिक्स और ईएनटी विभाग उपलब्ध हैं। आप कौन से लक्षण महसूस कर रहे हैं?"
        elif lang == "mr":
            reply = "आमच्या रुग्णालयात जनरल मेडिसिन, कार्डिओलॉजी, ऑर्थोपेडिक्स, पेडियाट्रिक्स आणि ईएनटी विभाग उपलब्ध आहेत. आपल्याला कोणते लक्षण जाणवत आहेत?"
        else:
            reply = "We offer General Medicine, Cardiology, Orthopedics, Pediatrics, and ENT departments. What symptoms are you experiencing?"

        actions = [
            {"label": "👨‍⚕️ View Doctors", "action": "view_doctors"},
            {"label": "💡 Get Department Advice", "action": "ai_triage"},
        ]
    else:
        intent = "general"
        if lang == "hi":
            reply = "नमस्ते! मैं हीलपाथ (HealPath) डिजिटल सहायक हूँ। मैं टोकन स्थिति, अपॉइंटमेंट बुकिंग और विभाग चयन में आपकी सहायता कर सकता हूँ।"
        elif lang == "mr":
            reply = "नमस्कार! मी हीलपाथ (HealPath) डिजिटल सहाय्यक आहे. मी टोकन स्थिती, अपॉइंटमेंट बुकिंग आणि विभाग निवड याबाबत मदत करू शकतो."
        else:
            reply = "Hello! I am the HealPath hospital assistant. I can help you book appointments, track queue tokens, or find the right medical department."

        actions = [
            {"label": "📅 Book Appointment", "action": "book_appointment"},
            {"label": "🎫 Track Token", "action": "track_token"},
            {"label": "💡 AI Symptom Triage", "action": "ai_triage"},
        ]

    return {
        "reply": reply,
        "intent": intent,
        "suggested_actions": actions
    }
