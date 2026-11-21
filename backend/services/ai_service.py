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
import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dotenv import load_dotenv

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
        "chest tightness", "severe palpitations", "छाती में दर्द", "हार्ट अटैक", "हृदयविकार", "छातीत तीव्र वेदना"
    ],
    "respiratory": [
        "shortness of breath", "severe dyspnea", "gasping for air", "choking", "turning blue",
        "cyanosis", "unable to breathe", "सांस लेने में तकलीफ", "दम घुटना", "श्वास घेण्यास त्रास", "श्वास कोंडणे"
    ],
    "neurological": [
        "stroke", "facial drooping", "slurred speech", "sudden paralysis", "loss of consciousness",
        "unconscious", "passed out", "seizure", "convulsions", "बेहोश", "दौरा", "पक्षाघात", "अचानक अर्धांगवायू"
    ],
    "trauma_bleeding": [
        "severe bleeding", "uncontrolled bleeding", "head injury", "arterial bleed", "major accident",
        "deep wound", "रक्तस्राव", "गंभीर जखम", "रक्त वाहणे"
    ],
    "poison_burns": [
        "poisoning", "chemical ingestion", "snake bite", "severe burns", "विषबाधा", "साप चावणे", "भाजणे"
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


def chat_turn_with_gemini(
    message: str,
    conversation_id: Optional[str] = None,
    language: str = "en",
    token_context: Optional[str] = None,
    client_ip: Optional[str] = None,
    departments: Optional[List[Any]] = None
) -> Dict[str, Any]:
    """
    Handles a conversational turn with Google Gemini 2.5 Flash, maintaining multi-turn context,
    conversation isolation, rate limiting, and hospital action suggestions.
    """
    session = conversation_store.get_or_create(conv_id=conversation_id, client_ip=client_ip)

    # 1. Rate Limiting Check (20 req / min per session)
    if session.is_rate_limited(max_requests=20, window_seconds=60):
        return {
            "reply": "You are sending messages too quickly. Please pause a moment before asking another question.",
            "intent": "general",
            "suggested_actions": [{"label": "⏳ Wait a moment", "action": "wait"}],
            "conversation_id": session.conversation_id,
            "urgency": "ROUTINE",
            "is_offline_fallback": True
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
            "is_offline_fallback": False
        }

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
                "is_offline_fallback": False
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
        "is_offline_fallback": True
    }
