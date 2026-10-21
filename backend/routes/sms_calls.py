from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from backend.database import get_db_connection
from backend.routes.auth import get_current_user
from backend.sms_voice_service import dispatch_keypad_sms, dispatch_automated_voice_call, get_recent_sms_call_logs

router = APIRouter(prefix="/api/sms", tags=["Keypad Phone SMS & IVR Call Alerts"])

class SendSMSRequest(BaseModel):
    phone: str
    patient_name: str
    template_key: str = "med_reminder"
    language: str = "hi" # en, hi, mr
    medicine_name: Optional[str] = "Foracort Inhaler & Paracetamol 650"
    dose_time: Optional[str] = "8:00 PM"
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None

class TriggerCallRequest(BaseModel):
    phone: str
    patient_name: str
    spoken_message: str
    language: str = "hi"

@router.post("/send")
def send_sms_to_keypad(req: SendSMSRequest):
    """
    Sends concise 160-char formatted SMS to basic 2G keypad / feature phones.
    """
    custom_vars = {
        "name": req.patient_name,
        "medicine": req.medicine_name,
        "time": req.appointment_time or req.dose_time,
        "date": req.appointment_date or ""
    }
    result = dispatch_keypad_sms(req.phone, req.patient_name, req.template_key, req.language, custom_vars)
    return result

@router.post("/call")
def trigger_voice_call_to_keypad(req: TriggerCallRequest):
    """
    Simulates automated IVR audio phone call for low-literacy rural patients.
    """
    result = dispatch_automated_voice_call(req.phone, req.patient_name, req.spoken_message, req.language)
    return result

@router.get("/logs")
def get_sms_inbox_logs():
    """
    Returns recent SMS & call logs to feed the on-screen Keypad Phone Simulator.
    """
    logs = get_recent_sms_call_logs(30)
    return logs

@router.post("/send-my-schedule")
def send_my_medication_schedule_sms(current_user: dict = Depends(get_current_user)):
    """
    Dispatches the patient's personalized medication timetable SMS to their registered keypad phone.
    """
    phone = current_user.get("phone")
    name = current_user.get("full_name") or "Patient"
    patient_id = current_user.get("patient_id")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    if not phone and patient_id:
        cursor.execute("SELECT phone FROM patients WHERE patient_id = ?", (patient_id,))
        p = cursor.fetchone()
        if p and p["phone"]: phone = p["phone"]
    
    if not phone:
        conn.close()
        raise HTTPException(status_code=400, detail="No registered phone number found for your patient profile.")

    # Find prescription slots
    cursor.execute("SELECT prescriptions, current_medications FROM cases WHERE patient_id = ? ORDER BY id DESC LIMIT 1", (patient_id,))
    case_row = cursor.fetchone()
    conn.close()

    rx_text = ""
    if case_row:
        rx_text = (case_row["prescriptions"] or case_row["current_medications"] or "").strip()

    slots = []
    if rx_text:
        rx_lower = rx_text.lower()
        if "morning" in rx_lower or "8:00 am" in rx_lower or "breakfast" in rx_lower or "subah" in rx_lower:
            slots.append("Morning 8:00 AM")
        if "afternoon" in rx_lower or "1:00 pm" in rx_lower or "lunch" in rx_lower or "dopahar" in rx_lower:
            slots.append("Afternoon 1:00 PM")
        if "night" in rx_lower or "8:00 pm" in rx_lower or "dinner" in rx_lower or "raat" in rx_lower:
            slots.append("Night 8:00 PM")

    times_str = ", ".join(slots) if slots else "Morning 8:00 AM, Night 8:00 PM"
    result = dispatch_keypad_sms(
        phone=phone,
        patient_name=name,
        template_key="med_timing_schedule",
        lang="hi",
        custom_vars={"name": name, "times": times_str}
    )
    return {
        "success": True,
        "message": f"Medicine timetable SMS sent to {phone}",
        "log": result
    }

@router.post("/send-my-followup")
def send_my_followup_appointment_sms(current_user: dict = Depends(get_current_user)):
    """
    Dispatches upcoming follow-up appointment reminder SMS to the patient's registered phone.
    """
    phone = current_user.get("phone")
    name = current_user.get("full_name") or "Patient"
    patient_id = current_user.get("patient_id")

    conn = get_db_connection()
    cursor = conn.cursor()
    if not phone and patient_id:
        cursor.execute("SELECT phone FROM patients WHERE patient_id = ?", (patient_id,))
        p = cursor.fetchone()
        if p and p["phone"]: phone = p["phone"]

    if not phone:
        conn.close()
        raise HTTPException(status_code=400, detail="No registered phone number found for your patient profile.")

    # Find nearest appointment or case follow-up
    cursor.execute("SELECT * FROM appointments WHERE patient_id = ? ORDER BY appointment_date ASC LIMIT 1", (patient_id,))
    appt = cursor.fetchone()

    appt_date = ""
    appt_time = "10:30 AM"
    doc_name = "Dr. Rajesh Kulkarni"

    if appt:
        appt_date = appt["appointment_date"]
        appt_time = appt["appointment_time"] or "10:30 AM"
        doc_name = appt["doctor_name"] or doc_name
    else:
        cursor.execute("SELECT follow_up_date, doctor_name FROM cases WHERE patient_id = ? ORDER BY id DESC LIMIT 1", (patient_id,))
        c_row = cursor.fetchone()
        if c_row and c_row["follow_up_date"]:
            appt_date = c_row["follow_up_date"]
            doc_name = c_row["doctor_name"] or doc_name
        else:
            appt_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")

    conn.close()

    result = dispatch_keypad_sms(
        phone=phone,
        patient_name=name,
        template_key="followup_scheduled",
        lang="hi",
        custom_vars={"name": name, "date": appt_date, "time": appt_time, "doctor": doc_name}
    )
    return {
        "success": True,
        "message": f"Follow-up appointment SMS sent to {phone}",
        "log": result
    }
