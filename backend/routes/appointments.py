from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime
from typing import Optional
from backend.database import get_db_connection
from backend.models import AppointmentCreate
from backend.routes.auth import get_current_user
from backend.security import log_audit

router = APIRouter(prefix="/api/appointments", tags=["Appointments & Follow-up Intelligence"])

@router.get("")
def list_appointments(
    status: Optional[str] = Query(None),
    followup: Optional[str] = Query(None),
    today_only: bool = Query(False),
    current_user: dict = Depends(get_current_user)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    today_str = datetime.now().strftime("%Y-%m-%d")

    query = "SELECT * FROM appointments WHERE 1=1"
    params = []

    if today_only:
        query += " AND appointment_date = ?"
        params.append(today_str)
    if status:
        query += " AND status = ?"
        params.append(status)
    if followup:
        query += " AND follow_up_status = ?"
        params.append(followup)

    query += " ORDER BY appointment_date ASC, appointment_time ASC"

    cursor.execute(query, params)
    appointments = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return appointments

@router.post("")
def create_appointment(req: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
    INSERT INTO appointments (
        patient_id, patient_name, doctor_id, doctor_name,
        appointment_date, appointment_time, reason, status,
        follow_up_status, notes, reminder_sent, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Scheduled', ?, ?, 0, ?)
    """, (
        req.patient_id, req.patient_name, current_user.get("id"), req.doctor_name,
        req.appointment_date, req.appointment_time, req.reason,
        req.follow_up_status or "Treatment Started", req.notes, now_str
    ))
    appt_rowid = cursor.lastrowid
    conn.commit()

    # Automatically dispatch appointment SMS alert to keypad phone
    cursor.execute("SELECT phone FROM patients WHERE patient_id = ?", (req.patient_id,))
    p_row = cursor.fetchone()
    patient_phone = p_row["phone"] if p_row and p_row["phone"] else None
    if not patient_phone:
        cursor.execute("SELECT phone FROM users WHERE patient_id = ?", (req.patient_id,))
        u_row = cursor.fetchone()
        patient_phone = u_row["phone"] if u_row and u_row["phone"] else None

    if patient_phone:
        try:
            from backend.sms_voice_service import dispatch_keypad_sms
            dispatch_keypad_sms(
                phone=patient_phone,
                patient_name=req.patient_name,
                template_key="appointment_alert",
                lang="hi",
                custom_vars={
                    "name": req.patient_name,
                    "date": req.appointment_date,
                    "time": req.appointment_time,
                    "doctor": req.doctor_name,
                    "clinic": "Sanjeevani Clinic"
                }
            )
            cursor.execute("UPDATE appointments SET reminder_sent = 1 WHERE rowid = ?", (appt_rowid,))
            conn.commit()
        except Exception as e:
            print(f"Warning: SMS dispatch on appointment create: {e}")

    log_audit(conn, current_user.get("id"), current_user.get("username", "staff"), current_user.get("role", "staff"),
              "CREATE_APPOINTMENT", req.patient_id, "Appointments", f"Booked appointment on {req.appointment_date} at {req.appointment_time}")
    conn.close()

    return {"success": True, "message": "Appointment booked successfully and SMS alert sent to keypad phone"}

@router.post("/{appointment_id}/advance-followup")
def advance_followup_intelligence(appointment_id: int, new_status: str, current_user: dict = Depends(get_current_user)):
    """
    Follow-up Intelligence Progression:
    Treatment Started -> Follow-up Due -> Missed Appointment -> Reminder Sent -> Staff Escalated -> Attended
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,))
    appt = cursor.fetchone()
    if not appt:
        conn.close()
        raise HTTPException(status_code=404, detail="Appointment not found")

    reminder_flag = 1 if new_status == "Reminder Sent" else appt["reminder_sent"]
    status_field = "Missed" if new_status == "Missed Appointment" else ("Completed" if new_status == "Attended" else appt["status"])

    cursor.execute("""
    UPDATE appointments 
    SET follow_up_status = ?, reminder_sent = ?, status = ?
    WHERE id = ?
    """, (new_status, reminder_flag, status_field, appointment_id))

    conn.commit()

    # If reminder or missed appointment, dispatch SMS
    if new_status in ["Reminder Sent", "Missed Appointment", "Follow-up Due"]:
        try:
            cursor.execute("SELECT phone FROM patients WHERE patient_id = ?", (appt["patient_id"],))
            p_row = cursor.fetchone()
            patient_phone = p_row["phone"] if p_row and p_row["phone"] else None
            if not patient_phone:
                cursor.execute("SELECT phone FROM users WHERE patient_id = ?", (appt["patient_id"],))
                u_row = cursor.fetchone()
                patient_phone = u_row["phone"] if u_row and u_row["phone"] else None
            
            if patient_phone:
                from backend.sms_voice_service import dispatch_keypad_sms
                tmpl = "missed_visit" if new_status == "Missed Appointment" else "followup_scheduled"
                dispatch_keypad_sms(
                    phone=patient_phone,
                    patient_name=appt["patient_name"],
                    template_key=tmpl,
                    lang="hi",
                    custom_vars={
                        "name": appt["patient_name"],
                        "date": appt["appointment_date"],
                        "time": appt["appointment_time"],
                        "doctor": appt["doctor_name"]
                    }
                )
        except Exception as e:
            print(f"Warning: SMS dispatch on follow-up progression: {e}")

    log_audit(conn, current_user.get("id"), current_user.get("username", "staff"), current_user.get("role", "staff"),
              "ADVANCE_FOLLOWUP", appt["patient_id"], "Follow-up Intelligence", f"Progressed follow-up state to '{new_status}'")
    conn.close()

    return {
        "success": True,
        "message": f"Follow-up status advanced to '{new_status}'",
        "new_status": new_status,
        "reminder_sent": bool(reminder_flag)
    }
