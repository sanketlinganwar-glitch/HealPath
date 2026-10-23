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

from backend.db import engine, Base, SessionLocal
from backend.seed import seed_database
from backend.routers import auth, public, tokens, staff, ai, demo

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db, force_reset=False)
    finally:
        db.close()

# Initialize tables immediately on startup
init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="HealPath - Hospital Queue Management API",
    description="Smart token generation, live queue tracking, and staff dashboard",
    version="1.1.0",
    lifespan=lifespan
)

# CORS configuration - allow all origins for hackathon
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
app.include_router(staff.router)
app.include_router(ai.router)
app.include_router(demo.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
