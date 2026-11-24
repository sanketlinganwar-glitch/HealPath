import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from dotenv import load_dotenv

# Safe environment loading
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

from backend.db import engine, Base, SessionLocal, migrate_db
from backend.seed import seed_database
from backend.routers import auth, public, tokens, staff, ai, demo, appointments, prescriptions, feedback, queue, patient, webhook, analytics, hardware

def validate_security_config():
    import logging
    log = logging.getLogger("uvicorn.info")
    jwt_sec = os.getenv("JWT_SECRET")
    if not jwt_sec:
        log.warning("⚠️ [Security] JWT_SECRET not found in environment; using development key.")
    else:
        log.info("🔒 [Security] JWT_SECRET loaded and active.")
    
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        log.info("ℹ️ [AI Engine] GEMINI_API_KEY is unset; running in rule-based symptom triage mode.")
    else:
        log.info("🧠 [AI Engine] Google Gemini API key configured.")

def init_db():
    Base.metadata.create_all(bind=engine)
    migrate_db(engine)
    db = SessionLocal()
    try:
        seed_database(db, force_reset=False)
    finally:
        db.close()
    validate_security_config()


# Initialize tables immediately on startup
init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="HealPath 2.0 - Hospital Queue & Appointment Management API",
    description="Smart token generation, live queue tracking, appointments, digital prescriptions, and staff dashboard",
    version="2.0.0",
    lifespan=lifespan
)

# CORS configuration - allow all origins for web & mobile clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Production HTTP Security Headers
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Custom validation error handler matching {"detail": "..."} contract
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    msg = errors[0].get("msg", "Validation failed") if errors else "Validation failed"
    loc = errors[0].get("loc", []) if errors else []
    field_name = loc[-1] if loc else "input"
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": f"{field_name}: {msg}"}
    )

# Include all route modules
app.include_router(auth.router)
app.include_router(public.router)
app.include_router(tokens.router)
app.include_router(appointments.router)
app.include_router(prescriptions.router)
app.include_router(feedback.router)
app.include_router(staff.router)
app.include_router(ai.router)
app.include_router(demo.router)
app.include_router(queue.router)
app.include_router(patient.router)
app.include_router(webhook.router)
app.include_router(webhook.notifications_router)
app.include_router(analytics.router)
app.include_router(hardware.router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    reload = os.getenv("ENV", "development").lower() == "development"
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=reload)
