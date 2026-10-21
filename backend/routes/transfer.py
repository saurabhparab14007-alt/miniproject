from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime
import json
from backend.database import get_db_connection
from backend.routes.auth import get_current_user
from backend.security import log_audit
from backend.ai_engine import export_fhir_case_package

router = APIRouter(prefix="/api/transfer", tags=["Secure Case Transfer"])

class TransferRequest(BaseModel):
    case_id: str
    patient_id: str
    from_facility: str
    to_facility: str
    reason: str

@router.post("/create")
def initiate_case_transfer(req: TransferRequest, current_user: dict = Depends(get_current_user)):
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

    fhir_bundle = export_fhir_case_package(dict(patient), dict(case), reports)
    transfer_id = f"TRF-2026-{int(datetime.now().timestamp())}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
    INSERT INTO case_transfers (transfer_id, case_id, patient_id, from_facility, to_facility, reason, status, transfer_package_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
    """, (transfer_id, req.case_id, req.patient_id, req.from_facility, req.to_facility, req.reason, json.dumps(fhir_bundle), now_str))

    cursor.execute("UPDATE cases SET status = 'Transferred' WHERE case_id = ?", (req.case_id,))
    conn.commit()

    log_audit(conn, current_user.get("id"), current_user.get("username", "doctor"), current_user.get("role", "doctor"),
              "CASE_TRANSFER_INITIATED", req.patient_id, req.case_id,
              f"Transferred case to {req.to_facility} (Transfer #{transfer_id})")
    conn.close()

    return {
        "success": True,
        "transfer_id": transfer_id,
        "status": "PENDING",
        "message": f"Secure case transfer package dispatched to {req.to_facility}. Awaiting recipient clinical acceptance."
    }

@router.get("/list")
def list_transfers():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM case_transfers ORDER BY id DESC")
    transfers = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return transfers

@router.post("/{transfer_id}/accept")
def accept_transferred_case(transfer_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM case_transfers WHERE transfer_id = ?", (transfer_id,))
    transfer = cursor.fetchone()
    if not transfer:
        conn.close()
        raise HTTPException(status_code=404, detail="Transfer record not found")

    cursor.execute("UPDATE case_transfers SET status = 'ACCEPTED' WHERE transfer_id = ?", (transfer_id,))
    cursor.execute("UPDATE cases SET status = 'Active' WHERE case_id = ?", (transfer["case_id"],))
    conn.commit()

    log_audit(conn, current_user.get("id"), current_user.get("username", "doctor"), current_user.get("role", "doctor"),
              "CASE_TRANSFER_ACCEPTED", transfer["patient_id"], transfer["case_id"],
              f"Recipient facility accepted case #{transfer['case_id']}")
    conn.close()

    return {"success": True, "message": f"Case #{transfer['case_id']} successfully accepted into active clinical care."}
