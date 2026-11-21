from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field, field_validator

# --- Patient Schemas ---
class PatientBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=60)
    phone: str = Field(..., min_length=10, max_length=15)
    age: int = Field(..., ge=0, le=120)
    gender: Literal["male", "female", "other"]

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        clean = "".join(filter(str.isdigit, v))
        if len(clean) < 10 or len(clean) > 15:
            raise ValueError("Phone number must contain between 10 and 15 digits")
        return clean[-10:] if len(clean) == 10 or len(clean) > 10 and clean.startswith("91") else clean

class PatientResponse(PatientBase):
    id: int

    class Config:
        from_attributes = True

# --- Token Schemas ---
class TokenCreate(PatientBase):
    department_id: int
    priority: Optional[Literal["normal", "senior", "emergency"]] = "normal"
    symptoms: Optional[str] = Field(None, max_length=300)
    source: Optional[Literal["online", "walk_in", "appointment"]] = "online"
    emergency_reason: Optional[str] = Field(None, max_length=300)
    idempotency_key: Optional[str] = Field(None, max_length=64)

class TokenResponse(BaseModel):
    id: int
    token_number: str
    department_id: int
    department_name: str
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    patient: PatientResponse
    priority: str
    status: str
    source: str
    symptoms: Optional[str] = None
    position: Optional[int] = None
    people_ahead: Optional[int] = None
    est_wait_min: Optional[int] = None
    created_at: str
    called_at: Optional[str] = None
    completed_at: Optional[str] = None
    room: Optional[str] = None
    secure_hash: Optional[str] = None
    emergency_reason: Optional[str] = None
    emergency_flagged_by: Optional[str] = None
    emergency_verified_by: Optional[str] = None

class TokenDetailResponse(TokenResponse):
    now_serving: Optional[str] = None
    department_waiting_count: Optional[int] = None
    qr_tracking_url: Optional[str] = None

class TokenPriorityUpdate(BaseModel):
    priority: Literal["normal", "senior", "emergency"]
    reason: Optional[str] = Field(None, max_length=300)

class TokenRescheduleRequest(BaseModel):
    delay_minutes: Literal[15, 30, 60]

# --- Emergency Priority Workflow Schemas ---
class EmergencyFlagRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=300)

class EmergencyVerifyRequest(BaseModel):
    action: Literal["verify_emergency", "downgrade_senior", "downgrade_normal"]
    clinical_notes: str = Field(..., min_length=3, max_length=300)

class EmergencyAuditLogResponse(BaseModel):
    id: int
    token_id: int
    action: str
    old_priority: str
    new_priority: str
    staff_username: str
    staff_role: str
    reason: str
    created_at: str

# --- Department Schemas ---
class DepartmentResponse(BaseModel):
    id: int
    name: str
    code: str
    waiting_count: int
    in_progress_count: int
    active_doctors: int
    avg_consult_min: int
    est_wait_min: int

# --- Doctor Schemas ---
class DoctorResponse(BaseModel):
    id: int
    name: str
    department_id: int
    department_name: str
    specialization: str
    room: str
    status: Literal["available", "busy", "off"]
    duty_status: Optional[str] = "available"
    shift_start: Optional[str] = "09:00"
    shift_end: Optional[str] = "17:00"
    break_start: Optional[str] = "13:00"
    break_end: Optional[str] = "14:00"

class DoctorStatusUpdate(BaseModel):
    status: Literal["available", "off"]

class DoctorRosterUpdate(BaseModel):
    duty_status: Literal["available", "busy", "on_break", "off_duty"]
    shift_start: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    shift_end: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    break_start: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    break_end: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")

class DoctorCurrentResponse(BaseModel):
    doctor: DoctorResponse
    current: Optional[TokenResponse] = None
    next_up: List[TokenResponse]
    waiting_count: int

# --- Queue & Display Schemas ---
class QueueCounts(BaseModel):
    waiting: int
    in_progress: int
    completed: int
    skipped: int
    emergency: Optional[int] = 0

class QueueResponse(BaseModel):
    department_id: int
    department_name: str
    in_progress: List[TokenResponse]
    waiting: List[TokenResponse]
    skipped: List[TokenResponse]
    counts: QueueCounts

class DisplayServing(BaseModel):
    token_number: str
    doctor_name: str
    room: str
    patient_name: Optional[str] = None

class DisplayDepartment(BaseModel):
    department_id: int
    department_name: str
    now_serving: List[DisplayServing]
    next_up: List[str]
    waiting_count: int
    est_wait_min: int

class DisplayResponse(BaseModel):
    departments: List[DisplayDepartment]

# --- Stats Schemas ---
class DepartmentStat(BaseModel):
    department_id: int
    department_name: str
    waiting: int
    completed: int
    avg_wait_min: int

class HourlyStat(BaseModel):
    hour: int
    count: int

class StatsResponse(BaseModel):
    date: str
    total_tokens: int
    waiting: int
    in_progress: int
    completed: int
    skipped: int
    avg_wait_min: int
    avg_consult_min: int
    longest_wait_min: int
    emergency_count: Optional[int] = 0
    by_department: List[DepartmentStat]
    hourly: List[HourlyStat]

# --- Auth Schemas ---
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str
    doctor_id: Optional[int] = None

# --- Message Schemas ---
class MessageCreate(BaseModel):
    token_id: int
    text: str

class MessageResponse(BaseModel):
    id: int
    token_id: int
    text: str
    kind: Literal["system", "staff"]
    created_at: str

# --- AI & Chat Schemas ---
class AISuggestRequest(BaseModel):
    symptoms: str

class AISuggestResponse(BaseModel):
    department_id: int
    department_name: str
    reason: str
    disclaimer: str
    fallback: bool

class SuggestedAction(BaseModel):
    label: str
    action: str

class AITriageRequest(BaseModel):
    main_symptom: str = Field(..., min_length=2, description="Primary patient symptom or chief complaint")
    duration: Optional[str] = Field(None, description="Symptom duration e.g. '2 days', '1 week'")
    severity: Optional[Literal["mild", "moderate", "severe"]] = "moderate"
    age_group: Optional[Literal["infant", "child", "adult", "senior"]] = "adult"
    associated_symptoms: Optional[List[str]] = Field(default_factory=list)
    preexisting_conditions: Optional[List[str]] = Field(default_factory=list)
    language: Optional[Literal["en", "hi", "mr"]] = "en"

class AITriageResponse(BaseModel):
    symptom_summary: str
    recommended_department_id: int
    recommended_department_name: str
    urgency_category: Literal["ROUTINE", "MODERATE", "URGENT", "EMERGENCY"]
    reason: str
    suggested_next_step: str
    follow_up_questions: List[str] = Field(default_factory=list)
    emergency_warning_indicators: List[str] = Field(default_factory=list)
    disclaimer: str
    is_offline_fallback: bool = False

class ConversationResetRequest(BaseModel):
    conversation_id: str

class ConversationResetResponse(BaseModel):
    success: bool
    message: str
    conversation_id: str

class ChatRequest(BaseModel):
    message: str
    language: Optional[Literal["en", "hi", "mr"]] = "en"
    token_id: Optional[int] = None
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    intent: Literal["queue_status", "department_help", "general", "emergency"]
    suggested_actions: List[SuggestedAction]
    conversation_id: Optional[str] = None
    urgency: Optional[Literal["ROUTINE", "MODERATE", "URGENT", "EMERGENCY"]] = "ROUTINE"
    is_offline_fallback: Optional[bool] = False

# --- Demo Schemas ---
class DemoSimulateRequest(BaseModel):
    count: Optional[int] = 5

# --- Appointments Schemas ---
class AppointmentSlot(BaseModel):
    time: str  # "09:30"
    slot_datetime: str  # ISO string
    is_available: bool
    doctor_id: int
    doctor_name: str

class AppointmentBookRequest(PatientBase):
    department_id: int
    doctor_id: int
    slot_time: str  # ISO datetime string e.g. "2026-10-30T10:30:00"
    notes: Optional[str] = Field(None, max_length=300)
    source: Optional[str] = "online"
    idempotency_key: Optional[str] = Field(None, max_length=64)

class AppointmentResponse(BaseModel):
    id: int
    appointment_code: str
    patient: PatientResponse
    department_id: int
    department_name: str
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    room: Optional[str] = None
    slot_time: str
    status: str
    notes: Optional[str] = None
    source: str
    created_at: str
    qr_tracking_url: Optional[str] = None

class AppointmentRescheduleRequest(BaseModel):
    new_slot_time: str
    reason: Optional[str] = None

class AppointmentCancelRequest(BaseModel):
    reason: str = Field(..., min_length=2, max_length=200)

class OTScheduleResponse(BaseModel):
    id: int
    theatre: str
    procedure: str
    surgeon: str
    start_time: str
    end_time: str
    status: str

# --- Prescription Schemas ---
class MedicineItem(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    dosage: str = Field(..., min_length=1, max_length=50)  # e.g. "500mg"
    frequency: str = Field(..., min_length=1, max_length=50)  # e.g. "1-0-1" or "Twice daily"
    duration: str = Field(..., min_length=1, max_length=50)  # e.g. "5 days"
    instructions: Optional[str] = "After food"

class PrescriptionCreate(BaseModel):
    token_id: Optional[int] = None
    appointment_id: Optional[int] = None
    patient_id: int
    doctor_id: int
    diagnosis: str = Field(..., min_length=2)
    medicines: List[MedicineItem]
    clinical_notes: Optional[str] = None
    tests_recommended: Optional[str] = None
    follow_up_date: Optional[str] = None

class PrescriptionResponse(BaseModel):
    id: int
    token_id: Optional[int] = None
    appointment_id: Optional[int] = None
    patient: PatientResponse
    doctor_name: str
    doctor_specialization: str
    doctor_room: str
    diagnosis: str
    medicines: List[MedicineItem]
    clinical_notes: Optional[str] = None
    tests_recommended: Optional[str] = None
    follow_up_date: Optional[str] = None
    created_at: str
    status: str

# --- Feedback Schemas ---
class FeedbackCreate(BaseModel):
    token_id: int
    rating: int = Field(..., ge=1, le=5)
    wait_time_rating: Optional[int] = Field(None, ge=1, le=5)
    staff_rating: Optional[int] = Field(None, ge=1, le=5)
    comments: Optional[str] = Field(None, max_length=500)
    is_anonymous: Optional[bool] = False

class FeedbackResponse(BaseModel):
    id: int
    token_id: int
    patient_name: str
    department_name: str
    doctor_name: Optional[str] = None
    rating: int
    wait_time_rating: Optional[int] = None
    staff_rating: Optional[int] = None
    comments: Optional[str] = None
    is_anonymous: bool
    created_at: str

class FeedbackSummaryResponse(BaseModel):
    average_rating: float
    total_reviews: int
    rating_breakdown: Dict[str, int]
    department_ratings: List[Dict[str, Any]]
    recent_feedback: List[FeedbackResponse]

# --- Notification Schemas ---
class NotificationLogResponse(BaseModel):
    id: int
    recipient_phone: str
    recipient_name: str
    channel: str
    event_type: str
    message_body: str
    status: str
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    error_detail: Optional[str] = None
    created_at: str

# --- Advanced Analytics Schemas ---
class DoctorAnalyticsStat(BaseModel):
    doctor_id: int
    doctor_name: str
    department_name: str
    consultations_completed: int
    avg_consult_duration_min: int
    status: str

class AdminAnalyticsResponse(BaseModel):
    time_range: str
    start_date: str
    end_date: str
    total_registered_patients: int
    total_tokens_generated: int
    waiting_patients: int
    in_consultation_patients: int
    completed_consultations: int
    cancelled_or_skipped_tokens: int
    emergency_cases_count: int
    avg_wait_time_min: int
    avg_consult_time_min: int
    appointments_booked: int
    appointments_cancelled: int
    notifications_sent_count: int
    notifications_simulated_count: int
    department_stats: List[DepartmentStat]
    doctor_stats: List[DoctorAnalyticsStat]
    hourly_trends: List[HourlyStat]
