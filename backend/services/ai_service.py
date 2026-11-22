"""
HACKBYTE (HealPath / QueueCare) - AI Service & Triage Engine
Powered by Google Gemini 2.5 Flash with Deterministic Offline Fallback.

Integrated for Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal, Maharashtra 445001.

Healthcare Safety Mandates:
1. Navigation and hospital support assistant ONLY — NOT a doctor or diagnostic system.
2. STRICTLY PROHIBITED from prescribing medications, pharmaceutical dosages, or claiming definitive medical diagnoses.
3. Red-flag emergency detection takes absolute precedence; AI urgency scores can never downgrade emergency warnings.
4. Deterministic offline fallback activates automatically when API keys are absent or network is degraded.
"""

import os
import json
import time
import uuid
import re
import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from backend.models import Department, Doctor, Patient, Token
from backend.services.queue_prediction import queue_prediction_service
from backend.services.queue import get_token_position_and_wait

logger = logging.getLogger(__name__)

# Base disclaimer for all AI health responses
HEALTHCARE_DISCLAIMER = (
    "HealPath AI is an automated hospital navigation and symptom assessment tool, NOT a doctor. "
    "It does not provide definitive medical diagnoses, prescriptions, or treatments. "
    "If you or someone nearby is experiencing a medical emergency, proceed immediately to the "
    "Sanjeevan Hospital Emergency Desk (24/7) or dial 112."
)

OFFLINE_DISCLAIMER = (
    "[Offline Hospital Protocol]: Generated using Sanjeevan Multispecialty Hospital's deterministic "
    "triage rules because cloud AI services are currently offline. This is preliminary guidance for "
    "department selection, not a clinical diagnosis. Proceed to Emergency Desk for acute symptoms."
)

# Emergency Red-Flag Keywords across English, Hindi, and Marathi
RED_FLAG_CONDITIONS = {
    "cardiac": [
        "chest pain", "crushing chest pain", "heart attack", "radiating pain to left arm",
        "chest tightness", "severe palpitations", "छाती में दर्द", "हार्ट अटैक", "हृदयविकार", "छातीत तीव्र वेदना",
        "छातीत दुखणे", "छातीवर दबाव", "हार्टअटॅक", "छातीत धडधडणे"
    ],
    "respiratory": [
        "shortness of breath", "severe dyspnea", "gasping for air", "choking", "turning blue",
        "cyanosis", "unable to breathe", "सांस लेने में तकलीफ", "दम घुटना", "श्वास घेण्यास त्रास", "श्वास कोंडणे",
        "श्वास लागत आहे", "दम लागणे", "श्वास घेता येत नाही", "सांस फूलना"
    ],
    "neurological": [
        "stroke", "facial drooping", "slurred speech", "sudden paralysis", "loss of consciousness",
        "unconscious", "passed out", "seizure", "convulsions", "बेहोश", "दौरा", "पक्षाघात", "अचानक अर्धांगवायू",
        "बेशुद्ध", "चक्कर येऊन पडणे", "शुद्ध हरपणे", "हात पाय थरथरणे"
    ],
    "trauma_bleeding": [
        "severe bleeding", "uncontrolled bleeding", "head injury", "arterial bleed", "major accident",
        "deep wound", "रक्तस्राव", "गंभीर जखम", "रक्त वाहणे", "रक्ताची उलटी", "रक्त उलटी", "खूप रक्त येणे", "अपघात"
    ],
    "poison_burns": [
        "poisoning", "chemical ingestion", "snake bite", "severe burns", "विषबाधा", "साप चावणे", "भाजणे",
        "साप चावला", "कीटकनाशक", "विष पिणे", "जळणे"
    ]
}

# --- Multi-Turn Conversation Storage & Isolation ---
class ConversationSession:
    def __init__(self, conversation_id: str, client_ip: Optional[str] = None):
        self.conversation_id = conversation_id
        self.client_ip = client_ip
        self.created_at = datetime.now()
        self.last_active = datetime.now()
        self.messages: List[Dict[str, str]] = []  # [{"role": "user"|"model", "text": "..."}]
        self.request_timestamps: List[float] = []
        self.token_id: Optional[int] = None

    def is_rate_limited(self, max_requests: int = 20, window_seconds: int = 60) -> bool:
        now = time.time()
        self.request_timestamps = [t for t in self.request_timestamps if now - t < window_seconds]
        if len(self.request_timestamps) >= max_requests:
            return True
        self.request_timestamps.append(now)
        return False

    def add_message(self, role: str, text: str):
        self.messages.append({"role": role, "text": text})
        self.last_active = datetime.now()
        # Retain latest 10 messages for context efficiency
        if len(self.messages) > 10:
            self.messages = self.messages[-10:]


class ConversationStore:
    def __init__(self, ttl_minutes: int = 60):
        self._sessions: Dict[str, ConversationSession] = {}
        self._ttl_minutes = ttl_minutes

    def get_or_create(self, conv_id: Optional[str] = None, client_ip: Optional[str] = None) -> ConversationSession:
        self._cleanup_expired()
        if conv_id and conv_id in self._sessions:
            session = self._sessions[conv_id]
            session.last_active = datetime.now()
            return session
        
        new_id = str(uuid.uuid4())
        session = ConversationSession(conversation_id=new_id, client_ip=client_ip)
        self._sessions[new_id] = session
        return session

    def reset(self, conv_id: str) -> bool:
        if conv_id in self._sessions:
            del self._sessions[conv_id]
            return True
        return False

    def _cleanup_expired(self):
        cutoff = datetime.now() - timedelta(minutes=self._ttl_minutes)
        expired = [cid for cid, s in self._sessions.items() if s.last_active < cutoff]
        for cid in expired:
            del self._sessions[cid]


conversation_store = ConversationStore(ttl_minutes=60)


def get_gemini_client():
    """Initializes Google Gen AI client if key is available."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or not api_key.strip():
        return None
    try:
        from google import genai
        # Initialize with 15 second request timeout to guard against hung connections
        return genai.Client(api_key=api_key.strip(), http_options={"timeout": 15000})
    except Exception as e:
        logger.warning(f"Could not initialize Gemini Client: {e}")
        return None


def detect_emergency_red_flags(text: str) -> Tuple[bool, List[str], str]:
    """
    Scans input text for critical medical red flags.
    Returns: (is_emergency, list_of_warning_indicators, emergency_category)
    """
    clean_text = text.lower().strip()
    warnings = []
    category = ""

    for cat, keywords in RED_FLAG_CONDITIONS.items():
        for kw in keywords:
            if kw in clean_text:
                warnings.append(f"Critical symptom detected: '{kw}' ({cat.replace('_', ' ').title()})")
                category = cat
                break

    return (len(warnings) > 0, warnings, category)


def get_offline_triage_fallback(
    main_symptom: str,
    duration: Optional[str] = None,
    severity: Optional[str] = "moderate",
    age_group: Optional[str] = "adult",
    associated_symptoms: Optional[List[str]] = None,
    preexisting_conditions: Optional[List[str]] = None,
    language: str = "en",
    dept_map: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Deterministic rule-based clinical symptom triage when Gemini API is offline or unconfigured.
    Evaluates symptoms against Sanjeevan Hospital standard OPD triage rules.
    """
    symptoms_combined = main_symptom.lower()
    if associated_symptoms:
        symptoms_combined += " " + " ".join([s.lower() for s in associated_symptoms])

    is_emergency, red_flags, _ = detect_emergency_red_flags(symptoms_combined)

    # 1. Immediate Emergency Triage
    if is_emergency or severity == "severe" and any(k in symptoms_combined for k in ["chest", "breathing", "head", "bleed"]):
        dept_name = "General Medicine & Critical Care"
        dept_id = 1
        if dept_map and "general medicine" in dept_map:
            dept_id = dept_map["general medicine"].id
            dept_name = dept_map["general medicine"].name

        if language == "hi":
            reason = "गंभीर या आपातकालीन लक्षण पाए गए हैं। तुरंत आपातकालीन जांच की आवश्यकता है।"
            next_step = "संजीवन अस्पताल के आपातकालीन डेस्क (Emergency Desk) पर तुरंत जाएं या 112 पर कॉल करें।"
            follow_ups = ["क्या मरीज अभी होश में है?", "क्या सांस लेने में तीव्र कठिनाई हो रही है?"]
        elif language == "mr":
            reason = "गंभीर किंवा आपत्कालीन लक्षणे आढळली आहेत. त्वरित वैद्यकीय तपासणी आवश्यक आहे."
            next_step = "संजीवन रुग्णालयाच्या आपत्कालीन कक्षात (Emergency Desk) ताबडतोब जा किंवा 112 वर संपर्क करा."
            follow_ups = ["रुग्ण सध्या शुद्धीवर आहे का?", "श्वास घेण्यास तीव्र अडचण येत आहे का?"]
        else:
            reason = "Red-flag medical indicators detected requiring immediate emergency stabilization."
            next_step = "Proceed immediately to Sanjeevan Hospital Emergency ICU Desk (Ground Floor) or call 112."
            follow_ups = ["Is the patient conscious and responsive?", "Are symptoms worsening rapidly?"]

        return {
            "symptom_summary": f"{main_symptom} (Severity: {severity or 'severe'}, Duration: {duration or 'recent'})",
            "recommended_department_id": dept_id,
            "recommended_department_name": dept_name,
            "urgency_category": "EMERGENCY",
            "reason": reason,
            "suggested_next_step": next_step,
            "follow_up_questions": follow_ups,
            "emergency_warning_indicators": red_flags or ["Severe acute distress reported"],
            "disclaimer": OFFLINE_DISCLAIMER,
            "is_offline_fallback": True
        }

    # 2. Cardiology Mapping
    cardio_keys = ["chest", "heart", "palpitation", "high bp", "hypertension", "angina", "हृदय", "छाती", "धडधड"]
    if any(k in symptoms_combined for k in cardio_keys):
        dept_id = 2
        dept_name = "Cardiology"
        if dept_map and "cardiology" in dept_map:
            dept_id = dept_map["cardiology"].id
            dept_name = dept_map["cardiology"].name
        urgency = "URGENT" if severity == "severe" else "MODERATE"
        return {
            "symptom_summary": f"Cardiovascular concern: {main_symptom}",
            "recommended_department_id": dept_id,
            "recommended_department_name": dept_name,
            "urgency_category": urgency,
            "reason": "Cardiovascular concerns require specialized evaluation by a Cardiologist including ECG and BP check.",
            "suggested_next_step": f"Book an appointment with {dept_name} or take an OPD token for evaluation.",
            "follow_up_questions": ["Do you experience shortness of breath while climbing stairs?", "Is there a history of hypertension?"],
            "emergency_warning_indicators": [],
            "disclaimer": OFFLINE_DISCLAIMER,
            "is_offline_fallback": True
        }

    # 3. Orthopedics Mapping
    ortho_keys = ["bone", "joint", "fracture", "knee", "spine", "arthritis", "sprain", "back pain", "हड्डी", "सांधे", "पाठदुखी"]
    if any(k in symptoms_combined for k in ortho_keys):
        dept_id = 3
        dept_name = "Orthopedics"
        if dept_map and "orthopedics" in dept_map:
            dept_id = dept_map["orthopedics"].id
            dept_name = dept_map["orthopedics"].name
        urgency = "URGENT" if any(k in symptoms_combined for k in ["fracture", "accident", "broken"]) else "ROUTINE"
        return {
            "symptom_summary": f"Musculoskeletal / Bone concern: {main_symptom}",
            "recommended_department_id": dept_id,
            "recommended_department_name": dept_name,
            "urgency_category": urgency,
            "reason": "Bone, joint, spine, or ligament symptoms are evaluated by Orthopedics with digital X-Ray diagnostics.",
            "suggested_next_step": f"Generate a token for {dept_name} or schedule an orthopedic consultation slot.",
            "follow_up_questions": ["Is there visible swelling or inability to bear weight?", "Did an injury or fall occur?"],
            "emergency_warning_indicators": [],
            "disclaimer": OFFLINE_DISCLAIMER,
            "is_offline_fallback": True
        }

    # 4. Pediatrics Mapping (or Age-Group Check)
    peds_keys = ["child", "baby", "infant", "vaccine", "pediatric", "toddler", "बाळ", "लहान मूल", "बच्चा"]
    if age_group in ["infant", "child"] or any(k in symptoms_combined for k in peds_keys):
        dept_id = 4
        dept_name = "Pediatrics"
        if dept_map and "pediatrics" in dept_map:
            dept_id = dept_map["pediatrics"].id
            dept_name = dept_map["pediatrics"].name
        urgency = "URGENT" if severity == "severe" or any(k in symptoms_combined for k in ["high fever", "vomiting"]) else "MODERATE"
        return {
            "symptom_summary": f"Pediatric health inquiry: {main_symptom} (Age Group: {age_group})",
            "recommended_department_id": dept_id,
            "recommended_department_name": dept_name,
            "urgency_category": urgency,
            "reason": "Infants, toddlers, and pediatric patients require specialized developmental care.",
            "suggested_next_step": f"Consult the Children's Center / {dept_name} OPD suite.",
            "follow_up_questions": ["Is the child taking fluids normally?", "How high is the body temperature?"],
            "emergency_warning_indicators": [],
            "disclaimer": OFFLINE_DISCLAIMER,
            "is_offline_fallback": True
        }

    # 5. ENT Mapping
    ent_keys = ["ear", "nose", "throat", "sinus", "tonsil", "hearing", "कान", "नाक", "घसा", "गला"]
    if any(k in symptoms_combined for k in ent_keys):
        dept_id = 5
        dept_name = "ENT"
        if dept_map and "ent" in dept_map:
            dept_id = dept_map["ent"].id
            dept_name = dept_map["ent"].name
        return {
            "symptom_summary": f"Ear, Nose, or Throat concern: {main_symptom}",
            "recommended_department_id": dept_id,
            "recommended_department_name": dept_name,
            "urgency_category": "ROUTINE",
            "reason": "Auditory, nasal passage, and throat infections are diagnosed by ENT specialists.",
            "suggested_next_step": f"Book an appointment with the {dept_name} clinic.",
            "follow_up_questions": ["Is there ear discharge or hearing reduction?", "Do you have difficulty swallowing?"],
            "emergency_warning_indicators": [],
            "disclaimer": OFFLINE_DISCLAIMER,
            "is_offline_fallback": True
        }

    # 6. Default: General Medicine
    dept_id = 1
    dept_name = "General Medicine"
    if dept_map and "general medicine" in dept_map:
        dept_id = dept_map["general medicine"].id
        dept_name = dept_map["general medicine"].name

    urgency = "MODERATE" if severity == "severe" else "ROUTINE"
    return {
        "symptom_summary": f"General clinical assessment: {main_symptom} ({duration or 'recent onset'})",
        "recommended_department_id": dept_id,
        "recommended_department_name": dept_name,
        "urgency_category": urgency,
        "reason": "General Medicine provides comprehensive initial clinical evaluation and diagnostic lab investigations.",
        "suggested_next_step": "Obtain an OPD token for General Medicine or schedule a consultation slot.",
        "follow_up_questions": ["How long have these symptoms been present?", "Are you taking any ongoing medications?"],
        "emergency_warning_indicators": [],
        "disclaimer": OFFLINE_DISCLAIMER,
        "is_offline_fallback": True
    }


def triage_symptoms_with_gemini(
    main_symptom: str,
    duration: Optional[str] = None,
    severity: Optional[str] = "moderate",
    age_group: Optional[str] = "adult",
    associated_symptoms: Optional[List[str]] = None,
    preexisting_conditions: Optional[List[str]] = None,
    language: str = "en",
    departments: Optional[List[Any]] = None
) -> Dict[str, Any]:
    """
    Structured Clinical Symptom Triage powered by Gemini 2.5 Flash,
    with automatic fallbacks and emergency red-flag guarding.
    """
    dept_map = {d.name.lower(): d for d in (departments or [])}
    dept_list_str = ", ".join([f"ID {d.id}: {d.name}" for d in (departments or [])])

    # Red-flag safety check first
    is_emergency, red_flags, _ = detect_emergency_red_flags(
        f"{main_symptom} {' '.join(associated_symptoms or [])}"
    )

    client = get_gemini_client()
    if not client:
        return get_offline_triage_fallback(
            main_symptom=main_symptom,
            duration=duration,
            severity=severity,
            age_group=age_group,
            associated_symptoms=associated_symptoms,
            preexisting_conditions=preexisting_conditions,
            language=language,
            dept_map=dept_map
        )

    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    prompt = (
        f"You are the senior clinical triage assistant for Sanjeevan Multispecialty Hospital & Research Institute, "
        f"Yavatmal, Maharashtra 445001.\n"
        f"Available hospital departments: {dept_list_str}\n\n"
        f"PATIENT REPORT:\n"
        f"- Primary Symptom: {main_symptom}\n"
        f"- Duration: {duration or 'Unspecified'}\n"
        f"- Severity: {severity}\n"
        f"- Age Group: {age_group}\n"
        f"- Associated Symptoms: {', '.join(associated_symptoms or ['None reported'])}\n"
        f"- Preexisting Conditions: {', '.join(preexisting_conditions or ['None reported'])}\n"
        f"- Preferred Language: {language} (en=English, hi=Hindi, mr=Marathi)\n\n"
        f"STRICT HEALTHCARE SAFETY CONSTRAINTS:\n"
        f"1. You are a hospital routing and triage assistant, NOT a doctor. NEVER claim a definitive diagnosis.\n"
        f"2. NEVER prescribe drugs, pharmaceutical brand names, or dosages.\n"
        f"3. Classify urgency as exactly one of: 'ROUTINE', 'MODERATE', 'URGENT', 'EMERGENCY'.\n"
        f"4. If symptoms indicate cardiac distress, severe breathing failure, stroke, major bleeding, or trauma, urgency MUST be 'EMERGENCY'.\n"
        f"5. All natural language fields (reason, suggested_next_step, follow_up_questions) should be localized to '{language}'.\n\n"
        f"Return ONLY a valid JSON object matching this schema:\n"
        f'{{\n'
        f'  "symptom_summary": "Brief summary",\n'
        f'  "recommended_department_id": 1,\n'
        f'  "recommended_department_name": "Department Name",\n'
        f'  "urgency_category": "ROUTINE" | "MODERATE" | "URGENT" | "EMERGENCY",\n'
        f'  "reason": "1-2 sentence reason for department recommendation",\n'
        f'  "suggested_next_step": "Recommended action at hospital",\n'
        f'  "follow_up_questions": ["Question 1", "Question 2"],\n'
        f'  "emergency_warning_indicators": []\n'
        f'}}'
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
        
        parsed = json.loads(text.strip())

        # Validate department ID against real hospital departments
        dept_id = parsed.get("recommended_department_id")
        dept_name = parsed.get("recommended_department_name", "General Medicine")
        if departments:
            matched = next((d for d in departments if d.id == dept_id), None)
            if not matched:
                matched = next((d for d in departments if d.name.lower() in dept_name.lower()), departments[0])
            dept_id = matched.id
            dept_name = matched.name

        # Ensure emergency warning overrides if red flags were clinically detected
        urgency = parsed.get("urgency_category", "MODERATE").upper()
        if is_emergency:
            urgency = "EMERGENCY"
            parsed["emergency_warning_indicators"] = list(set(parsed.get("emergency_warning_indicators", []) + red_flags))

        return {
            "symptom_summary": parsed.get("symptom_summary", f"{main_symptom}"),
            "recommended_department_id": dept_id,
            "recommended_department_name": dept_name,
            "urgency_category": urgency if urgency in ["ROUTINE", "MODERATE", "URGENT", "EMERGENCY"] else "MODERATE",
            "reason": parsed.get("reason", f"Evaluated for {dept_name}"),
            "suggested_next_step": parsed.get("suggested_next_step", "Please proceed to OPD registration."),
            "follow_up_questions": parsed.get("follow_up_questions", []),
            "emergency_warning_indicators": parsed.get("emergency_warning_indicators", []),
            "disclaimer": HEALTHCARE_DISCLAIMER,
            "is_offline_fallback": False
        }
    except Exception as e:
        logger.warning(f"Gemini symptom triage failed ({e}); invoking offline triage protocol.")
        return get_offline_triage_fallback(
            main_symptom=main_symptom,
            duration=duration,
            severity=severity,
            age_group=age_group,
            associated_symptoms=associated_symptoms,
            preexisting_conditions=preexisting_conditions,
            language=language,
            dept_map=dept_map
        )


def build_spoken_text(text: str) -> str:
    """Strips markdown, links, and emojis for clean, natural speech synthesis."""
    if not text:
        return ""
    clean = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    clean = re.sub(r'[*_#`~]', '', clean)
    clean = re.sub(r'[\U00010000-\U0010ffff]', '', clean, flags=re.UNICODE)
    clean = re.sub(r'[\u2600-\u27bf]', '', clean)
    clean = clean.replace("⚠️", "").replace("🚨", "").replace("📞", "").replace("📅", "").replace("🎫", "").replace("👨‍⚕️", "").replace("⏳", "")
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean


def classify_voice_intent(message: str) -> str:
    """
    Classifies patient query into structured hospital intents
    supporting English, Hindi, and Marathi.
    """
    msg_lower = message.lower().strip()

    is_emergency, _, _ = detect_emergency_red_flags(msg_lower)
    if is_emergency:
        return "emergency"

    # 1. Patient Registration / New Token (Checked before contact so phone number in registration doesn't misclassify)
    if any(k in msg_lower for k in [
        "register", "registration", "new patient", "make token", "generate token", "create token", "walk in", "token please",
        "नाव नोंदणी", "नोंदणी", "नवीन टोकन", "टोकन काढा", "नाव नोंदवा", "टोकन द्या",
        "पंजीकरण", "नया टोकन", "रजिस्ट्रेशन", "नाम लिखाना", "टोकन चाहिए"
    ]):
        return "patient_registration"

    # 2. Hospital Timings & OPD Hours (Checked before contact so 'hospital' doesn't conflict)
    if any(k in msg_lower for k in [
        "timing", "timings", "hours", "open", "close", "opd time", "when open", "schedule",
        "वेळ", "ओपीडी वेळ", "दवाखाना कधी", "वेळापत्रक", "रुग्णालयाची वेळ", "सुरू कधी",
        "समय", "ओपीडी समय", "कब खुलता है", "टाइमिंग", "अस्पताल का समय"
    ]):
        return "hospital_timings"

    # 3. Hospital Location & Contact
    has_contact_word = any(k in msg_lower for k in [
        "address", "location", "contact", "where is", "how to reach", "helpline", "emergency number",
        "पत्ता", "संपर्क", "कुठे आहे", "कसा पोहोचायचा", "आपत्कालीन नंबर", "दवाखाना कुठे",
        "कहाँ है", "संपर्क नंबर", "आपातकालीन नंबर", "अस्पताल का पता", "फोन नंबर", "phone number"
    ]) or bool(re.search(r'(?<!अस्)पता\b', msg_lower)) or ("फोन" in msg_lower and "नंबर" in msg_lower)
    if has_contact_word:
        return "hospital_contact"

    # Doctor Availability & Specialists on Duty
    if any(k in msg_lower for k in [
        "doctor available", "which doctor", "doctor list", "doctor timing", "specialist", "doctors on duty",
        "डॉक्टर उपस्थित", "कोणते डॉक्टर", "डॉक्टर कधी", "डॉक्टर उपलब्ध", "तज्ज्ञ डॉक्टर",
        "डॉक्टर हैं क्या", "कौन से डॉक्टर", "डॉक्टर की सूची", "डॉक्टर उपलब्ध हैं"
    ]):
        return "doctor_availability"

    # Department Information
    if any(k in msg_lower for k in [
        "department", "departments", "speciality", "specialities", "wards",
        "विभाग", "कोणते विभाग", "विशेषज्ञता",
        "विभाग कौन से", "अस्पताल के विभाग"
    ]):
        return "department_info"

    # Token Status / Queue Position / Waiting Time
    if any(k in msg_lower for k in [
        "token", "queue", "wait", "position", "turn", "how many ahead", "how many waiting", "people ahead",
        "माझा नंबर", "किती रुग्ण", "किती वेळ", "कधी नंबर येईल", "रांग", "प्रतीक्षा", "टोकन नंबर",
        "मेरा नंबर", "कितने मरीज", "कितना समय", "कब नंबर आएगा", "कतार", "टोकन की स्थिति"
    ]):
        if any(k in msg_lower for k in ["register", "new token", "make token", "generate token", "नवीन टोकन", "नोंदणी", "नया टोकन", "पंजीकरण"]):
            return "patient_registration"
        return "queue_status"

    # Patient Registration / New Token
    if any(k in msg_lower for k in [
        "register", "registration", "new patient", "make token", "generate token", "create token", "walk in", "token please",
        "नाव नोंदणी", "नोंदणी", "नवीन टोकन", "टोकन काढा", "नाव नोंदवा", "टोकन द्या",
        "पंजीकरण", "नया टोकन", "रजिस्ट्रेशन", "नाम लिखाना", "टोकन चाहिए"
    ]):
        return "patient_registration"

    # Appointment Booking
    if any(k in msg_lower for k in [
        "appointment", "book appointment", "book slot", "schedule", "doctor visit",
        "अपॉइंटमेंट", "तारीख बुक", "भेट", "वेळ हवी", "अपॉइंटमेंट बुक",
        "अपॉइंटमेंट लेनी", "तारीख लेनी"
    ]):
        return "appointment_booking"

    # General FAQ & Diagnostic Facilities
    if any(k in msg_lower for k in [
        "ayushman", "mediclaim", "cashless", "insurance", "xray", "x-ray", "sonography", "lab", "pharmacy", "medical store",
        "आयुष्मान", "कॅशलेस", "विमा", "सोनोग्राफी", "लॅब", "औषधे", "एक्स-रे", "रक्त तपासणी", "सुविधा",
        "आयुष्मान कार्ड", "कैशलेस", "बीमा", "सोनोग्राफी", "दवा की दुकान", "खून की जांच", "सुविधाएं"
    ]):
        return "general_faq"

    return "general"


def get_deterministic_operational_reply(
    intent: str,
    message: str,
    language: str = "en",
    db: Optional[Session] = None,
    token_context: Optional[str] = None,
    token_id: Optional[int] = None
) -> Optional[Dict[str, Any]]:
    """
    Constructs deterministic, verified hospital operational answers for Sanjeevan Hospital, Yavatmal.
    Guarantees that operational data (token status, waiting time, doctor schedules, hospital timings)
    is mathematically accurate and never hallucinated.
    """
    msg_clean = message.strip()
    msg_lower = msg_clean.lower()

    # 1. Hospital Location & Contact
    if intent == "hospital_contact":
        if language == "mr":
            reply = (
                "संजीवन मल्टीस्पेशालिटी हॉस्पिटल, महादेव मंदिर रोड, रतनलाल प्लॉट्स, यवतमाळ - 445001 (४४५००१). "
                "आपत्कालीन कक्ष २४ तास सुरू आहे. आपत्कालीन दूरध्वनी: +91 95526 25262 (+९१ ९५५२६ २५२६२), रिसेप्शन: 07232-244222."
            )
        elif language == "hi":
            reply = (
                "संजीवन मल्टीस्पेशलिटी अस्पताल, महादेव मंदिर रोड, रतनलाल प्लॉट्स, यवतमाल - 445001 (४४५००१)। "
                "आपातकालीन सेवा २४ घंटे चालू है। आपातकालीन फोन: +91 95526 25262 (+९१ ९५५२६ २५२६२), रिसेप्शन: 07232-244222।"
            )
        else:
            reply = (
                "Sanjeevan Multispecialty Hospital & Research Institute is located at Mahadev Mandir Road, "
                "Ratanlal Plots, Yavatmal, Maharashtra 445001. 24/7 Emergency Hotline: +91 95526 25262, "
                "Reception: 07232-244222."
            )
        return {
            "reply": reply,
            "intent": "hospital_contact",
            "suggested_actions": [
                {"label": "🚨 Call Emergency (+91 95526 25262)", "action": "call_emergency"},
                {"label": "🗺️ Open Hospital Map", "action": "open_map"},
                {"label": "📅 Book Appointment", "action": "book_appointment"}
            ],
            "structured_data": {
                "type": "hospital_contact",
                "name": "Sanjeevan Multispecialty Hospital & Research Institute",
                "address": "Mahadev Mandir Road, Ratanlal Plots, Yavatmal, Maharashtra 445001",
                "emergency_phone": "+91 95526 25262",
                "reception_phone": "07232-244222"
            },
            "spoken_text": build_spoken_text(reply)
        }

    # 2. Hospital Timings & OPD Hours
    if intent == "hospital_timings":
        if language == "mr":
            reply = (
                "संजीवन रुग्णालयाची ओपीडी वेळ: सकाळी 08:30 ते दुपारी 01:30 आणि संध्याकाळी 04:30 ते रात्री 08:30 (सोमवार ते शनिवार). "
                "आपत्कालीन कक्ष (Casualty), अतिदक्षता विभाग (ICU) आणि ॲम्ब्युलन्स २४ तास अविरत सुरू असतात."
            )
        elif language == "hi":
            reply = (
                "संजीवन अस्पताल की ओपीडी का समय: सुबह 08:30 से दोपहर 01:30 और शाम 04:30 से रात 08:30 बजे तक (सोमवार से शनिवार)। "
                "इमरजेंसी (Casualty), आईसीयू और एम्बुलेंस सेवाएं २४ घंटे चालू हैं।"
            )
        else:
            reply = (
                "Sanjeevan Hospital OPD consultation timings are 08:30 AM to 01:30 PM and 04:30 PM to 08:30 PM (Monday to Saturday). "
                "Emergency Casualty, ICU, and Ambulance services operate 24 hours a day, 7 days a week."
            )
        return {
            "reply": reply,
            "intent": "hospital_timings",
            "suggested_actions": [
                {"label": "📅 Book Appointment", "action": "book_appointment"},
                {"label": "🎫 Take Digital Token", "action": "register"}
            ],
            "structured_data": {
                "type": "hospital_timings",
                "opd_morning": "08:30 AM - 01:30 PM",
                "opd_evening": "04:30 PM - 08:30 PM",
                "emergency": "24 Hours Open (Ground Floor)"
            },
            "spoken_text": build_spoken_text(reply)
        }

    # 3. Doctor Availability
    if intent == "doctor_availability":
        doc_list = []
        if db:
            docs = db.query(Doctor).all()
            for d in docs:
                dept_name = d.department.name if d.department else "General"
                doc_list.append({
                    "id": d.id,
                    "name": d.name,
                    "department": dept_name,
                    "room": d.room,
                    "status": d.status
                })
        
        if doc_list:
            top_docs = [f"{d['name']} ({d['department']} - Room {d['room']})" for d in doc_list[:5]]
            if language == "mr":
                reply = "संजीवन रुग्णालयात उपस्थित तज्ज्ञ डॉक्टर्स: " + ", ".join([f"{d['name']} ({d['department']}, रूम {d['room']})" for d in doc_list[:4]]) + ". आपण ऑनलाइन किंवा ओपीडी काऊंटरवर अपॉइंटमेंट घेऊ शकता."
            elif language == "hi":
                reply = "संजीवन अस्पताल के विशेषज्ञ डॉक्टर: " + ", ".join([f"{d['name']} ({d['department']}, कमरा {d['room']})" for d in doc_list[:4]]) + "। आप तुरंत अपॉइंटमेंट बुक कर सकते हैं।"
            else:
                reply = "Specialist doctors at Sanjeevan Hospital: " + ", ".join(top_docs[:4]) + ". You can book an appointment or visit the OPD desk."
        else:
            if language == "mr":
                reply = "संजीवन रुग्णालयात जनरल मेडिसिन, कार्डिओलॉजी, ऑर्थोपेडिक्स, पेडियाट्रिक्स आणि ईएनटी विभागांचे विशेषज्ञ डॉक्टर्स उपलब्ध आहेत."
            elif language == "hi":
                reply = "संजीवन अस्पताल में जनरल मेडिसिन, कार्डियोलॉजी, ऑर्थोपेडिक्स, पीडियाट्रिक्स और ईएनटी के विशेषज्ञ डॉक्टर उपलब्ध हैं।"
            else:
                reply = "Sanjeevan Hospital has specialists available in General Medicine, Cardiology, Orthopedics, Pediatrics, and ENT."

        return {
            "reply": reply,
            "intent": "doctor_availability",
            "suggested_actions": [
                {"label": "📅 Book Consultation", "action": "book_appointment"},
                {"label": "👨‍⚕️ View Doctor Roster", "action": "view_doctors"}
            ],
            "structured_data": {
                "type": "doctor_availability",
                "doctors": doc_list
            },
            "spoken_text": build_spoken_text(reply)
        }

    # 4. Department Information
    if intent == "department_info":
        dept_names = ["General Medicine", "Cardiology", "Orthopedics", "Pediatrics", "ENT"]
        if db:
            all_depts = db.query(Department).all()
            if all_depts:
                dept_names = [d.name for d in all_depts]

        if language == "mr":
            reply = f"संजीवन रुग्णालयातील प्रमुख विभाग: {', '.join(dept_names)}. सर्व विभागांत तज्ज्ञ डॉक्टर्स आणि सुसज्ज तपासणी कक्ष उपलब्ध आहेत."
        elif language == "hi":
            reply = f"संजीवन अस्पताल के मुख्य विभाग: {', '.join(dept_names)}। सभी विभागों में योग्य विशेषज्ञ डॉक्टर और जांच सुविधाएं उपलब्ध हैं।"
        else:
            reply = f"Sanjeevan Hospital clinical departments include: {', '.join(dept_names)}, equipped with advanced diagnostic and inpatient care."

        return {
            "reply": reply,
            "intent": "department_info",
            "suggested_actions": [
                {"label": "💡 AI Symptom Triage", "action": "ai_triage"},
                {"label": "📅 Book Appointment", "action": "book_appointment"}
            ],
            "structured_data": {"type": "department_info", "departments": dept_names},
            "spoken_text": build_spoken_text(reply)
        }

    # 5. Token Status / Queue Position / Waiting Time
    if intent in ["queue_status", "queue_position", "waiting_time"]:
        token_obj = None
        if token_id and db:
            token_obj = db.query(Token).filter(Token.id == token_id).first()
        elif db:
            tok_match = re.search(r'\b([A-Za-z]{1,4}-\d{1,4})\b', message)
            if tok_match:
                token_obj = db.query(Token).filter(Token.token_number == tok_match.group(1).upper()).first()
            else:
                phone_match = re.search(r'\b\d{10}\b', message)
                if phone_match:
                    p = db.query(Patient).filter(Patient.phone == phone_match.group(0)).first()
                    if p:
                        token_obj = db.query(Token).filter(Token.patient_id == p.id, Token.status.in_(["waiting", "in_progress"])).order_by(Token.id.desc()).first()

        if token_obj and db:
            pred = queue_prediction_service.predict_token_waiting_time(db, token_obj)
            est_wait = pred.get("est_wait_min", 0)
            wait_range = pred.get("wait_time_range_min", [est_wait, est_wait + 5])
            ahead = pred.get("people_ahead", 0)
            room = token_obj.doctor.room if token_obj.doctor else "Consultation Cabin"

            if language == "mr":
                st_mr = "तपासणी सुरू आहे" if token_obj.status == "in_progress" else "रांगेत प्रतीक्षेत" if token_obj.status == "waiting" else "पूर्ण झाली"
                reply = (
                    f"टोकन क्रमांक {token_obj.token_number} ({token_obj.department.name}). स्थिती: {st_mr}. "
                    f"तुमच्यापुढे {ahead} रुग्ण आहेत. अंदाजे प्रतीक्षा वेळ: ~{est_wait} मिनिटे ({wait_range[0]}–{wait_range[1]} मिनिटे). "
                    f"डॉक्टर कक्ष: {room}."
                )
            elif language == "hi":
                st_hi = "परामर्श चालू है" if token_obj.status == "in_progress" else "कतार में प्रतीक्षारत" if token_obj.status == "waiting" else "पूर्ण"
                reply = (
                    f"टोकन नंबर {token_obj.token_number} ({token_obj.department.name})। स्थिति: {st_hi}। "
                    f"आपके आगे {ahead} मरीज हैं। अनुमानित प्रतीक्षा समय: ~{est_wait} मिनट ({wait_range[0]}–{wait_range[1]} मिनट)। "
                    f"डॉक्टर कमरा: {room}।"
                )
            else:
                reply = (
                    f"Token {token_obj.token_number} ({token_obj.department.name}). Status: {token_obj.status}. "
                    f"There are {ahead} patient(s) ahead of you. Estimated wait: ~{est_wait} mins ({wait_range[0]}–{wait_range[1]} mins). "
                    f"Doctor Cabin: {room}."
                )

            return {
                "reply": reply,
                "intent": "queue_status",
                "suggested_actions": [
                    {"label": "🎫 View Token Card", "action": "track_token"},
                    {"label": "📺 Lobby TV Display", "action": "view_display"}
                ],
                "structured_data": {
                    "type": "token_status",
                    "token_id": token_obj.id,
                    "token_number": token_obj.token_number,
                    "department": token_obj.department.name,
                    "status": token_obj.status,
                    "people_ahead": ahead,
                    "est_wait_min": est_wait,
                    "wait_time_range_min": wait_range,
                    "room": room
                },
                "spoken_text": build_spoken_text(reply)
            }
        elif token_context:
            if language == "mr":
                reply = f"थेट टोकन माहिती: {token_context}"
            elif language == "hi":
                reply = f"लाइव टोकन जानकारी: {token_context}"
            else:
                reply = f"Live Token Information: {token_context}"

            return {
                "reply": reply,
                "intent": "queue_status",
                "suggested_actions": [
                    {"label": "🎫 Track Token", "action": "track_token"},
                    {"label": "📺 Display Board", "action": "view_display"}
                ],
                "structured_data": {"type": "token_context", "context": token_context},
                "spoken_text": build_spoken_text(reply)
            }
        else:
            if language == "mr":
                reply = "आपल्या टोकनची थेट रांग स्थिती आणि प्रतीक्षा वेळ जाणून घेण्यासाठी कृपया आपला १० अंकी मोबाईल नंबर किंवा टोकन नंबर सांगा (उदा. GM-001)."
            elif language == "hi":
                reply = "अपने टोकन की लाइव स्थिति और प्रतीक्षा समय जानने के लिए कृपया अपना १० अंकों का मोबाइल नंबर या टोकन नंबर बताएं (उदा. GM-001)।"
            else:
                reply = "To check your live queue turn and estimated wait time, please state or enter your 10-digit mobile number or Token ID (e.g. GM-001)."

            return {
                "reply": reply,
                "intent": "queue_status",
                "suggested_actions": [
                    {"label": "🔍 Track by Phone", "action": "track_token"},
                    {"label": "📺 Display Board", "action": "view_display"}
                ],
                "structured_data": {"type": "token_prompt"},
                "spoken_text": build_spoken_text(reply)
            }

    # 6. Patient Registration Intent
    if intent == "patient_registration":
        cand_name = None
        cand_age = None
        cand_phone = None
        cand_dept_id = 1
        cand_dept_name = "General Medicine"

        age_match = re.search(r'(?:age|वय|उम्र|आयु)\s*[:=]?\s*(\d{1,3})', msg_lower)
        if not age_match:
            age_match = re.search(r'\b(\d{1,3})\s*(?:years|वर्षे|साल)\b', msg_lower)
        if age_match:
            try:
                cand_age = int(age_match.group(1))
            except ValueError:
                pass

        phone_match = re.search(r'\b\d{10}\b', message)
        if phone_match:
            cand_phone = phone_match.group(0)

        if any(k in msg_lower for k in ["cardio", "heart", "हृदय", "छाती"]):
            cand_dept_id = 2
            cand_dept_name = "Cardiology"
        elif any(k in msg_lower for k in ["ortho", "bone", "joint", "हड्डी", "सांधे"]):
            cand_dept_id = 3
            cand_dept_name = "Orthopedics"
        elif any(k in msg_lower for k in ["pediatric", "child", "baby", "लहान मूल", "बाळ", "बच्चा"]):
            cand_dept_id = 4
            cand_dept_name = "Pediatrics"
        elif any(k in msg_lower for k in ["ent", "ear", "nose", "throat", "कान", "नाक", "घसा"]):
            cand_dept_id = 5
            cand_dept_name = "ENT"

        name_match = re.search(r'(?:my name is|name is|i am|नाव आहे|नाव|नाम है|नाम)\s+([A-Za-z\u0900-\u097F\s]{2,30})', message, re.IGNORECASE)
        if name_match:
            cand_name = name_match.group(1).strip().title()

        ready = bool(cand_name and cand_age and cand_phone)
        priority = "senior" if (cand_age and cand_age >= 60) else "normal"

        if ready:
            if language == "mr":
                reply = (
                    f"कृपया नोंदणी माहितीची खात्री करा: नाव: {cand_name}, वय: {cand_age}, "
                    f"विभाग: {cand_dept_name}, मोबाईल: {cand_phone}. माहिती बरोबर असल्यास 'हो' म्हणा किंवा टोकन कन्फर्म करा."
                )
            elif language == "hi":
                reply = (
                    f"कृपया पंजीकरण विवरण की पुष्टि करें: नाम: {cand_name}, आयु: {cand_age}, "
                    f"विभाग: {cand_dept_name}, मोबाइल: {cand_phone}। यदि यह सही है तो 'हाँ' कहें या टोकन कन्फर्म करें।"
                )
            else:
                reply = (
                    f"Please confirm your registration: Name: {cand_name}, Age: {cand_age}, "
                    f"Department: {cand_dept_name}, Phone: {cand_phone}. If correct, confirm to generate token."
                )
        else:
            if language == "mr":
                reply = "नवीन डिजिटल टोकन नोंदणीसाठी कृपया तुमचे पूर्ण नाव, वय आणि विभाग सांगा (उदा. रमेश पाटील, वय ४०, जनरल मेडिसिन)."
            elif language == "hi":
                reply = "नया डिजिटल टोकन बनाने के लिए कृपया अपना पूरा नाम, आयु और विभाग बताएं (उदा. रमेश पाटिल, उम्र ४०, जनरल मेडिसिन)।"
            else:
                reply = "To register for a digital OPD token, please tell me your Full Name, Age, Department, and Mobile Number."

        return {
            "reply": reply,
            "intent": "patient_registration",
            "suggested_actions": [
                {"label": "📝 Confirm & Create Token", "action": "voice_register"},
                {"label": "📅 Book Appointment Instead", "action": "book_appointment"}
            ],
            "structured_data": {
                "type": "patient_registration_draft",
                "name": cand_name,
                "age": cand_age,
                "department_id": cand_dept_id,
                "department_name": cand_dept_name,
                "phone": cand_phone,
                "priority": priority,
                "ready_to_confirm": ready
            },
            "spoken_text": build_spoken_text(reply)
        }

    # 7. Appointment Booking Intent
    if intent == "appointment_booking":
        if language == "mr":
            reply = "संजीवन रुग्णालयात तज्ज्ञ डॉक्टरांची अपॉइंटमेंट घेण्यासाठी आपण विभाग, डॉक्टर आणि सोयीस्कर तारीख-वेळ निवडू शकता."
        elif language == "hi":
            reply = "संजीवन अस्पताल में विशेषज्ञ डॉक्टर से परामर्श के लिए आप विभाग, डॉक्टर और पसंदीदा समय स्लॉट चुन सकते हैं।"
        else:
            reply = "You can schedule a consultation at Sanjeevan Hospital by choosing your specialty department, doctor, and preferred time slot."

        return {
            "reply": reply,
            "intent": "appointment_booking",
            "suggested_actions": [
                {"label": "📅 Book Appointment", "action": "book_appointment"},
                {"label": "👨‍⚕️ View Doctors", "action": "view_doctors"}
            ],
            "structured_data": {"type": "appointment_booking"},
            "spoken_text": build_spoken_text(reply)
        }

    # 8. General FAQ / Diagnostic Facilities
    if intent == "general_faq":
        if language == "mr":
            reply = (
                "संजीवन रुग्णालयात कॅशलेस मेडिक्लेम, महात्मा ज्योतिराव फुले जन आरोग्य योजना (MJPJAY), "
                "२४ तास डिजिटल एक्स-रे, २डी इको, सोनोग्राफी, पॅथॉलॉजी लॅब आणि मेडिकल स्टोअर उपलब्ध आहे."
            )
        elif language == "hi":
            reply = (
                "संजीवन अस्पताल में कैशलेस मेडिक्लेम, आयुष्मान भारत / एमजीपीजेएवाई योजना, "
                "२४ घंटे डिजिटल एक्स-रे, सोनोग्राफी, पूरी तरह से ऑटोमेटेड लैब और दवा की दुकान उपलब्ध है।"
            )
        else:
            reply = (
                "Sanjeevan Hospital provides Cashless Mediclaim assistance, government health schemes (MJPJAY / Ayushman Bharat), "
                "24/7 Digital X-Ray, 2D Echo, Ultrasound Sonography, Automated Pathology Lab, and In-house Pharmacy."
            )

        return {
            "reply": reply,
            "intent": "general_faq",
            "suggested_actions": [
                {"label": "📅 Book Appointment", "action": "book_appointment"},
                {"label": "🎫 Take Token", "action": "register"}
            ],
            "structured_data": {"type": "hospital_faq"},
            "spoken_text": build_spoken_text(reply)
        }

    return None


def chat_turn_with_gemini(
    message: str,
    conversation_id: Optional[str] = None,
    language: str = "en",
    token_context: Optional[str] = None,
    client_ip: Optional[str] = None,
    departments: Optional[List[Any]] = None,
    db: Optional[Session] = None,
    token_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Handles a conversational turn with Google Gemini 2.5 Flash, maintaining multi-turn context,
    conversation isolation, rate limiting, and hospital action suggestions.
    """
    session = conversation_store.get_or_create(conv_id=conversation_id, client_ip=client_ip)
    if token_id:
        session.token_id = token_id

    # 1. Rate Limiting Check (20 req / min per session)
    if session.is_rate_limited(max_requests=20, window_seconds=60):
        reply = "You are sending messages too quickly. Please pause a moment before asking another question."
        return {
            "reply": reply,
            "intent": "general",
            "suggested_actions": [{"label": "⏳ Wait a moment", "action": "wait"}],
            "conversation_id": session.conversation_id,
            "urgency": "ROUTINE",
            "is_offline_fallback": True,
            "spoken_text": reply
        }

    clean_msg = message.strip()
    msg_lower = clean_msg.lower()

    # 2. Emergency Red-Flag Intercept
    is_emergency, red_flags, _ = detect_emergency_red_flags(msg_lower)
    if is_emergency:
        if language == "hi":
            reply = "⚠️ यह एक आपातकालीन स्थिति लग रही है! कृपया तुरंत संजीवन अस्पताल के इमरजेंसी वार्ड या 112 पर कॉल करें। सॉफ्टवेयर कतार में प्रतीक्षा न करें।"
        elif language == "mr":
            reply = "⚠️ ही आपत्कालीन परिस्थिती वाटत आहे! कृपया ताबडतोब संजीवन रुग्णालयाच्या आपत्कालीन कक्षात जा किंवा 112 वर संपर्क साधा. रांगेत प्रतीक्षा करू नका."
        else:
            reply = "⚠️ This sounds like a medical emergency! Please proceed immediately to Sanjeevan Hospital Emergency ICU (Ground Floor) or dial 112. Do not delay care waiting for an online token."

        session.add_message("user", clean_msg)
        session.add_message("model", reply)
        return {
            "reply": reply,
            "intent": "emergency",
            "suggested_actions": [
                {"label": "🚨 Emergency Desk (+91 95526 25262)", "action": "goto_emergency"},
                {"label": "📞 Call 112 / Ambulance", "action": "call_112"}
            ],
            "conversation_id": session.conversation_id,
            "urgency": "EMERGENCY",
            "is_offline_fallback": False,
            "spoken_text": build_spoken_text(reply)
        }

    # 2.5 Structured Operational Intent Evaluation (Deterministic & Live Data)
    op_intent = classify_voice_intent(clean_msg)
    if op_intent != "general":
        op_reply = get_deterministic_operational_reply(
            intent=op_intent,
            message=clean_msg,
            language=language,
            db=db,
            token_context=token_context,
            token_id=session.token_id or token_id
        )
        if op_reply:
            session.add_message("user", clean_msg)
            session.add_message("model", op_reply["reply"])
            op_reply["conversation_id"] = session.conversation_id
            op_reply["urgency"] = "ROUTINE"
            op_reply["is_offline_fallback"] = False
            return op_reply

    # 3. Gemini Generative Turn
    client = get_gemini_client()
    if client:
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        
        # Build conversational history
        history_prompts = []
        for m in session.messages[-6:]:
            role_prefix = "User: " if m["role"] == "user" else "Assistant: "
            history_prompts.append(f"{role_prefix}{m['text']}")
        history_str = "\n".join(history_prompts)

        system_instruction = (
            f"You are the AI Health & Navigation Assistant for Sanjeevan Multispecialty Hospital & Research Institute, "
            f"Yavatmal 445001 (+91 95526 25262).\n"
            f"STRICT RULES:\n"
            f"1. You must respond strictly in language: '{language}' (en = English, hi = Hindi, mr = Marathi).\n"
            f"2. Keep responses brief (1-3 sentences), warm, clear, and informative.\n"
            f"3. NEVER diagnose or prescribe medications or dosages. Guide patients to hospital services and departments.\n"
            f"4. If symptoms are described, suggest the appropriate hospital department (General Medicine, Cardiology, Orthopedics, Pediatrics, ENT).\n"
            f"5. Remind that this is guidance, not a medical diagnosis.\n"
            f"Context: {token_context or 'No live token selected'}\n"
        )

        full_prompt = f"{system_instruction}\n\nConversation History:\n{history_str}\n\nUser: {clean_msg}\nAssistant:"

        try:
            response = client.models.generate_content(
                model=model_name,
                contents=full_prompt,
            )
            ai_reply = response.text.strip()
            session.add_message("user", clean_msg)
            session.add_message("model", ai_reply)

            # Determine intent & suggestions
            intent = "general"
            if any(k in msg_lower for k in ["token", "wait", "queue", "कतार", "नंबर", "वेळ"]):
                intent = "queue_status"
            elif any(k in msg_lower for k in ["doctor", "department", "specialist", "विभाग", "डॉक्टर"]):
                intent = "department_help"

            actions = [
                {"label": "📅 Book Appointment", "action": "book_appointment"},
                {"label": "🎫 Track Token", "action": "track_token"},
                {"label": "💡 Symptom Triage", "action": "ai_triage"},
                {"label": "👨‍⚕️ View Doctors", "action": "view_doctors"}
            ]

            return {
                "reply": ai_reply,
                "intent": intent,
                "suggested_actions": actions,
                "conversation_id": session.conversation_id,
                "urgency": "ROUTINE",
                "is_offline_fallback": False,
                "spoken_text": build_spoken_text(ai_reply)
            }
        except Exception as e:
            logger.warning(f"Gemini conversational turn failed ({e}); using offline fallback response.")

    # 4. Deterministic Offline Fallback Response
    session.add_message("user", clean_msg)
    
    if any(k in msg_lower for k in ["appointment", "book", "अपॉइंटमेंट", "भेट", "तारीख"]):
        intent = "department_help"
        if language == "hi":
            reply = "[ऑफ़लाइन मोड]: आप हमारे ऑनलाइन बुकिंग सिस्टम के माध्यम से विभाग, डॉक्टर और समय स्लॉट चुनकर आसानी से अपॉइंटमेंट बुक कर सकते हैं।"
        elif language == "mr":
            reply = "[ऑफलाईन मोड]: आपण आमच्या ऑनलाइन बुकिंग पोर्टलद्वारे विभाग, डॉक्टर आणि वेळेचा स्लॉट निवडून अपॉइंटमेंट बुक करू शकता."
        else:
            reply = "[Offline Mode]: You can schedule a consultation with our specialist doctors by selecting your preferred department, doctor, date, and time slot."
        actions = [
            {"label": "📅 Book Appointment", "action": "book_appointment"},
            {"label": "👨‍⚕️ View Doctors", "action": "view_doctors"}
        ]
    elif any(k in msg_lower for k in ["status", "wait", "turn", "queue", "नंबर", "वेळ"]):
        intent = "queue_status"
        if token_context:
            reply = f"[Offline Mode]: {token_context}"
        else:
            if language == "hi":
                reply = "[ऑफ़लाइन मोड]: अपने टोकन की लाइव स्थिति और प्रतीक्षा समय जानने के लिए अपना 10 अंकों का मोबाइल नंबर दर्ज करें।"
            elif language == "mr":
                reply = "[ऑफलाईन मोड]: आपल्या टोकनची थेट स्थिती जाणून घेण्यासाठी कृपया आपला १० अंकी मोबाईल नंबर प्रविष्ट करा."
            else:
                reply = "[Offline Mode]: You can track your live queue turn and estimated wait time by entering your 10-digit mobile number or Token ID on the tracking page."
        actions = [
            {"label": "🎫 Track My Token", "action": "track_token"},
            {"label": "📺 Display Board", "action": "view_display"}
        ]
    elif any(k in msg_lower for k in ["doctor", "department", "विभाग", "डॉक्टर"]):
        intent = "department_help"
        if language == "hi":
            reply = "[ऑफ़लाइन मोड]: संजीवन अस्पताल में जनरल मेडिसिन, कार्डियोलॉजी, ऑर्थोपेडिक्स, पीडियाट्रिक्स और ईएनटी विभाग उपलब्ध हैं।"
        elif language == "mr":
            reply = "[ऑफलाईन मोड]: संजीवन रुग्णालयात जनरल मेडिसिन, कार्डिओलॉजी, ऑर्थोपेडिक्स, पेडियाट्रिक्स आणि ईएनटी विभाग उपलब्ध आहेत."
        else:
            reply = "[Offline Mode]: Sanjeevan Hospital offers General Medicine, Cardiology, Orthopedics, Pediatrics, and ENT departments."
        actions = [
            {"label": "👨‍⚕️ View Doctors", "action": "view_doctors"},
            {"label": "💡 Symptom Triage", "action": "ai_triage"}
        ]
    else:
        intent = "general"
        if language == "hi":
            reply = "[ऑफ़लाइन मोड]: नमस्ते! मैं संजीवन अस्पताल का डिजिटल सहायक हूँ। मैं टोकन ट्रैकिंग, अपॉइंटमेंट बुकिंग और विभाग चयन में सहायता कर सकता हूँ।"
        elif language == "mr":
            reply = "[ऑफलाईन मोड]: नमस्कार! मी संजीवन रुग्णालयाचा डिजिटल सहाय्यक आहे. मी टोकन ट्रॅकिंग, अपॉइंटमेंट बुकिंग आणि विभाग निवड याबाबत मदत करू शकतो."
        else:
            reply = "[Offline Mode]: Hello! I am the HealPath hospital assistant for Sanjeevan Hospital. I can help you book appointments, track queue tokens, or find medical departments."
        actions = [
            {"label": "📅 Book Appointment", "action": "book_appointment"},
            {"label": "🎫 Track Token", "action": "track_token"},
            {"label": "💡 AI Symptom Triage", "action": "ai_triage"}
        ]

    session.add_message("model", reply)
    return {
        "reply": reply,
        "intent": intent,
        "suggested_actions": actions,
        "conversation_id": session.conversation_id,
        "urgency": "ROUTINE",
        "is_offline_fallback": True,
        "spoken_text": build_spoken_text(reply)
    }
