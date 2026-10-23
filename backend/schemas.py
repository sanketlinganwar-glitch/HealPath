from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field, field_validator

# --- Patient Schemas ---
class PatientBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=60)
    phone: str = Field(..., min_length=10, max_length=10)
    age: int = Field(..., ge=0, le=120)
    gender: Literal["male", "female", "other"]

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 10:
            raise ValueError("Phone number must be exactly 10 digits")
        return v

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

class TokenDetailResponse(TokenResponse):
    now_serving: Optional[str] = None
    department_waiting_count: Optional[int] = None

class TokenPriorityUpdate(BaseModel):
    priority: Literal["normal", "senior", "emergency"]

class TokenRescheduleRequest(BaseModel):
    delay_minutes: Literal[15, 30, 60]

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

class DoctorStatusUpdate(BaseModel):
    status: Literal["available", "off"]

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

class ChatRequest(BaseModel):
    message: str
    language: Optional[Literal["en", "hi", "mr"]] = "en"
    token_id: Optional[int] = None

class ChatResponse(BaseModel):
    reply: str
    intent: Literal["queue_status", "department_help", "general", "emergency"]
    suggested_actions: List[SuggestedAction]

# --- Demo Schemas ---
class DemoSimulateRequest(BaseModel):
    count: Optional[int] = 5

# --- Appointments & OT Schemas ---
class AppointmentResponse(BaseModel):
    id: int
    patient: PatientResponse
    department_id: int
    doctor_id: Optional[int] = None
    slot_time: str
    status: str

class OTScheduleResponse(BaseModel):
    id: int
    theatre: str
    procedure: str
    surgeon: str
    start_time: str
    end_time: str
    status: str
