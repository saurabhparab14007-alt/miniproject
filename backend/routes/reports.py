from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from datetime import datetime
import os
import json
from typing import Optional
from backend.database import get_db_connection
from backend.models import ReportAnalysisRequest
from backend.routes.auth import get_current_user
from backend.security import log_audit
from backend.ai_engine import analyze_lab_report_text

router = APIRouter(prefix="/api/reports", tags=["Medical Reports & Documents"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/patient/{patient_id}")
def get_patient_reports(patient_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reports WHERE patient_id = ? ORDER BY id DESC", (patient_id,))
    reports = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return reports

@router.post("/analyze")
def analyze_and_undertake_report(req: ReportAnalysisRequest, current_user: dict = Depends(get_current_user)):
    """
    "Upload Report -> Understand It" endpoint.
    Extracts Hemoglobin, WBC, Platelets, Sugar, Creatinine etc.
    Provides plain-language synthesis and clinical decision support.
    """
    analysis = analyze_lab_report_text(req.report_text)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
    INSERT INTO reports (
        patient_id, case_id, report_type, file_name, file_url,
        uploaded_by, parsed_data, summary, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Analyzed', ?)
    """, (
        req.patient_id, req.case_id, req.report_type, req.file_name,
        f"/uploads/{req.file_name}", current_user.get("full_name", "Clinical Staff"),
        json.dumps(analysis["parameters"]), analysis["patient_plain_language"], now_str
    ))
    
    # Add timeline event for this result
    cursor.execute("""
    INSERT INTO timeline_events (case_id, patient_id, event_type, event_title, event_description, doctor_name, event_date, created_at)
    VALUES (?, ?, 'Results', ?, ?, ?, ?, ?)
    """, (
        req.case_id, req.patient_id, f"{req.report_type} Analyzed",
        analysis["patient_plain_language"][:140], current_user.get("full_name", "Dr. Rajesh Kulkarni"),
        now_str, now_str
    ))

    conn.commit()
    log_audit(conn, current_user.get("id"), current_user.get("username", "staff"), current_user.get("role", "staff"),
              "ANALYZE_REPORT", req.patient_id, req.case_id, f"Uploaded and analyzed {req.report_type} ({req.file_name})")
    conn.close()

    return {
        "success": True,
        "parameters": analysis["parameters"],
        "plain_explanation": analysis["patient_plain_language"],
        "disclaimer": analysis["clinical_decision_support_disclaimer"]
    }

@router.post("/upload")
async def upload_document_file(
    patient_id: str = Form(...),
    case_id: str = Form(...),
    report_type: str = Form(...),
    notes: Optional[str] = Form(""),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    safe_filename = f"{int(datetime.now().timestamp())}_{file.filename.replace(' ', '_')}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    # Mock extract text if file is uploaded or run analysis
    mock_extracted_text = f"Blood report uploaded: {file.filename}. Hemoglobin: 11.4 g/dL. WBC: 12,200. Platelets: 210,000. {notes}"
    analysis = analyze_lab_report_text(mock_extracted_text)

    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
    INSERT INTO reports (
        patient_id, case_id, report_type, file_name, file_url,
        uploaded_by, parsed_data, summary, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Analyzed', ?)
    """, (
        patient_id, case_id, report_type, file.filename,
        f"/uploads/{safe_filename}", current_user.get("full_name", "Attending Doctor"),
        json.dumps(analysis["parameters"]), analysis["patient_plain_language"], now_str
    ))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "file_name": file.filename,
        "file_url": f"/uploads/{safe_filename}",
        "analysis": analysis
    }
