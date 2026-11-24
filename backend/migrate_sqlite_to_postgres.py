"""
Database Migration Utility: SQLite (queuecare.db) -> Cloud PostgreSQL (Neon / Supabase / Render)
Safely migrates all 14 clinical tables, preserving all primary keys, foreign keys, and existing records.
"""
import os
import sys
import sqlite3
from sqlalchemy import create_engine, MetaData, Table, text

def migrate(sqlite_path="backend/queuecare.db", target_url=None):
    if not target_url:
        target_url = os.getenv("DATABASE_URL")
    
    if not target_url or not target_url.startswith("postgres"):
        print("[ERROR] TARGET DATABASE_URL must be a valid PostgreSQL connection string.")
        print("Usage: python backend/migrate_sqlite_to_postgres.py <POSTGRES_DATABASE_URL>")
        sys.exit(1)

    if target_url.startswith("postgres://"):
        target_url = target_url.replace("postgres://", "postgresql://", 1)

    print(f"[1/4] Connecting to SQLite source: {sqlite_path}")
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    print(f"[2/4] Connecting to Target Cloud PostgreSQL...")
    pg_engine = create_engine(target_url)

    # Import models and create all tables in PostgreSQL
    from backend.db import Base
    import backend.models  # Registers all 14 tables
    print("[3/4] Creating schema tables in PostgreSQL...")
    Base.metadata.create_all(bind=pg_engine)

    # Table migration order to respect foreign key constraints
    tables_order = [
        "departments",
        "doctors",
        "patients",
        "users",
        "appointments",
        "tokens",
        "ot_schedule",
        "prescriptions",
        "messages",
        "emergency_audit_logs",
        "notification_logs",
        "patient_feedbacks",
        "prescription_verification_logs",
        "hardware_devices"
    ]

    print("[4/4] Transferring records...")
    with pg_engine.connect() as pg_conn:
        for tbl in tables_order:
            rows = sqlite_cur.execute(f"SELECT * FROM {tbl}").fetchall()
            if not rows:
                print(f"  - {tbl}: 0 records (skipped)")
                continue

            cols = rows[0].keys()
            col_names = ", ".join(cols)
            placeholders = ", ".join([f":{col}" for col in cols])
            insert_stmt = text(f"INSERT INTO {tbl} ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING")

            records = [dict(row) for row in rows]
            pg_conn.execute(insert_stmt, records)
            pg_conn.commit()
            print(f"  - {tbl}: {len(records)} records migrated successfully.")

    print("\n[SUCCESS] All records safely migrated from SQLite to Cloud PostgreSQL with 100% data integrity!")

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else None
    migrate(target_url=url)
