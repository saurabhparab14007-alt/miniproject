from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from backend.database import get_db_connection, get_next_case_id
from backend.models import (
    CaseCreate, CaseUpdate, TimelineEventCreate,
    VoiceDictationRequest, CaseQueryRequest
)
from backend.routes.auth import get_current_user
from backend.security import log_audit
from backend.ai_engine import (
    generate_ai_case_summary, analyze_smart_alerts,
    parse_doctor_voice_dictation, generate_doctor_handover_summary,
    generate_discharge_summary_draft, answer_patient_case_query
)

router = APIRouter(prefix="/api/cases", tags=["Case Undertaking"])

@router.get("")
def list_active_cases(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT c.*, p.name as patient_name, p.age, p.gender, p.blood_group, p.phone
    FROM cases c
    JOIN patients p ON c.patient_id = p.patient_id
    ORDER BY c.id DESC
    """)
    cases = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return cases

@router.post("")
def create_case(req: CaseCreate, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Generate next Case ID
    case_id = get_next_case_id(cursor)
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
    INSERT INTO cases (
        case_id, patient_id, doctor_id, doctor_name, chief_complaint, symptoms,
        medical_history, allergies, current_medications, diagnosis, doctor_notes,
        treatment_plan, follow_up_date, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?)
    """, (
        case_id, req.patient_id, current_user.get("id"), req.doctor_name, req.chief_complaint, req.symptoms,
        req.medical_history, req.allergies, req.current_medications, req.diagnosis, req.doctor_notes,
        req.treatment_plan, req.follow_up_date, now_str, now_str
    ))

    # Add initial timeline events for this visit
    cursor.execute("""
    INSERT INTO timeline_events (case_id, patient_id, event_type, event_title, event_description, doctor_name, event_date, created_at)
    VALUES (?, ?, 'Visit', 'Clinical Consultation', ?, ?, ?, ?)
    """, (case_id, req.patient_id, f"Presented with: {req.chief_complaint}", req.doctor_name, now_str, now_str))

    cursor.execute("""
    INSERT INTO timeline_events (case_id, patient_id, event_type, event_title, event_description, doctor_name, event_date, created_at)
    VALUES (?, ?, 'Diagnosis', 'Primary Clinical Impression', ?, ?, ?, ?)
    """, (case_id, req.patient_id, f"Confirmed Diagnosis: {req.diagnosis}", req.doctor_name, now_str, now_str))

    cursor.execute("""
    INSERT INTO timeline_events (case_id, patient_id, event_type, event_title, event_description, doctor_name, event_date, created_at)
    VALUES (?, ?, 'Treatment', 'Treatment Plan Undertaken', ?, ?, ?, ?)
    """, (case_id, req.patient_id, req.treatment_plan[:120], req.doctor_name, now_str, now_str))

    conn.commit()

    log_audit(conn, current_user.get("id"), current_user.get("username", "doctor"), current_user.get("role", "doctor"),
              "CREATE_CASE", req.patient_id, case_id, f"Created new patient case undertaking for {req.patient_id}")
    conn.close()

    return {
        "success": True,
        "case_id": case_id,
        "message": f"Case undertaking record {case_id} established successfully."
    }

@router.get("/{case_id}")
def get_case_details(case_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM cases WHERE case_id = ?", (case_id,))
    case_row = cursor.fetchone()
    if not case_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Case record not found")

    case = dict(case_row)

    # Get patient
    cursor.execute("SELECT * FROM patients WHERE patient_id = ?", (case["patient_id"],))
    patient_row = cursor.fetchone()
    patient = dict(patient_row) if patient_row else {}

    # Get reports
    cursor.execute("SELECT * FROM reports WHERE case_id = ? ORDER BY id DESC", (case_id,))
    reports = [dict(r) for r in cursor.fetchall()]

    # Get timeline
    cursor.execute("SELECT * FROM timeline_events WHERE case_id = ? ORDER BY event_date ASC", (case_id,))
    timeline = [dict(t) for t in cursor.fetchall()]

    conn.close()

    # Generate Clinical AI Features
    ai_summary = generate_ai_case_summary(patient, case, reports)
    smart_alerts = analyze_smart_alerts(case)

    return {
        "case": case,
        "patient": patient,
        "reports": reports,
        "timeline": timeline,
        "ai_summary": ai_summary,
        "smart_alerts": smart_alerts
    }

@router.put("/{case_id}")
def update_case(case_id: str, req: CaseUpdate, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM cases WHERE case_id = ?", (case_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Case record not found")

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Update dynamic fields
    fields = []
    values = []
    for k, v in req.dict(exclude_unset=True).items():
        fields.append(f"{k} = ?")
        values.append(v)

    if fields:
        fields.append("updated_at = ?")
        values.append(now_str)
        values.append(case_id)
        cursor.execute(f"UPDATE cases SET {', '.join(fields)} WHERE case_id = ?", values)
        conn.commit()

    log_audit(conn, current_user.get("id"), current_user.get("username", "doctor"), current_user.get("role", "doctor"),
              "UPDATE_CASE", existing["patient_id"], case_id, f"Updated case undertaking fields: {list(req.dict(exclude_unset=True).keys())}")
    conn.close()

    return {"success": True, "message": f"Case {case_id} updated successfully"}

@router.post("/{case_id}/timeline")
def add_timeline_event(case_id: str, req: TimelineEventCreate, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
    INSERT INTO timeline_events (case_id, patient_id, event_type, event_title, event_description, doctor_name, event_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (case_id, req.patient_id, req.event_type, req.event_title, req.event_description, req.doctor_name, req.event_date, now_str))
    conn.commit()
    conn.close()

    return {"success": True, "message": "Timeline milestone registered"}

@router.get("/{case_id}/handover")
def get_doctor_handover_card(case_id: str, current_user: dict = Depends(get_current_user)):
    """
    Produces 30-Second Doctor Handover Card for seamless hospital shift changeover.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM cases WHERE case_id = ?", (case_id,))
    case = cursor.fetchone()
    if not case:
        conn.close()
        raise HTTPException(status_code=404, detail="Case not found")

    cursor.execute("SELECT * FROM patients WHERE patient_id = ?", (case["patient_id"],))
    patient = cursor.fetchone()

    cursor.execute("SELECT * FROM reports WHERE case_id = ?", (case_id,))
    reports = [dict(r) for r in cursor.fetchall()]

    conn.close()

    handover = generate_doctor_handover_summary(dict(patient), dict(case), reports)
    return handover

@router.get("/{case_id}/discharge-summary")
def get_discharge_summary(case_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM cases WHERE case_id = ?", (case_id,))
    case = cursor.fetchone()
    if not case:
        conn.close()
        raise HTTPException(status_code=404, detail="Case not found")

    cursor.execute("SELECT * FROM patients WHERE patient_id = ?", (case["patient_id"],))
    patient = cursor.fetchone()

    cursor.execute("SELECT * FROM reports WHERE case_id = ?", (case_id,))
    reports = [dict(r) for r in cursor.fetchall()]

    conn.close()

    draft = generate_discharge_summary_draft(dict(patient), dict(case), reports)
    return draft

@router.post("/{case_id}/approve-discharge")
def approve_discharge_summary(case_id: str, approved_text: str, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    UPDATE cases 
    SET status = 'Closed', discharge_summary = ?, discharge_approved_by = ? 
    WHERE case_id = ?
    """, (approved_text, current_user.get("full_name", "Attending Physician"), case_id))

    conn.commit()

    log_audit(conn, current_user.get("id"), current_user.get("username", "doctor"), current_user.get("role", "doctor"),
              "APPROVE_DISCHARGE", None, case_id, "Physician digitally reviewed and approved official Discharge Summary")
    conn.close()

    return {"success": True, "message": "Discharge summary approved and case closed."}

@router.post("/voice-parse")
def parse_voice(req: VoiceDictationRequest):
    """
    Parses doctor's natural voice dictation into structured case fields.
    """
    parsed = parse_doctor_voice_dictation(req.spoken_text)
    return parsed

@router.post("/ask")
def ask_patient_case(req: CaseQueryRequest, current_user: dict = Depends(get_current_user)):
    """
    AI 'Ask This Patient's Case': answers doctors' natural language questions from authorized records.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM cases WHERE case_id = ?", (req.case_id,))
    case = cursor.fetchone()
    if not case:
        conn.close()
        raise HTTPException(status_code=404, detail="Case not found")

    cursor.execute("SELECT * FROM patients WHERE patient_id = ?", (req.patient_id,))
    patient = cursor.fetchone()

    cursor.execute("SELECT * FROM reports WHERE case_id = ?", (req.case_id,))
    reports = [dict(r) for r in cursor.fetchall()]

    conn.close()

    result = answer_patient_case_query(req.query, dict(patient), dict(case), reports)
    return result
