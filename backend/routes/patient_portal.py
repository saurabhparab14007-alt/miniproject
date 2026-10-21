from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime
from backend.database import get_db_connection, get_next_patient_id, get_next_case_id
from backend.routes.auth import get_current_user

router = APIRouter(prefix="/api/patient-content", tags=["Patient Portal Content"])

@router.get("/me")
def get_patient_health_file(current_user: dict = Depends(get_current_user)):
    """
    Returns dedicated personalized health file for the logged-in patient.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Find patient record specifically for this logged-in user
    import re
    patient_id = current_user.get("patient_id")
    clean_p = re.sub(r'[\s\-+]', '', str(current_user.get('phone') or ''))
    user_fullname = (current_user.get("full_name") or "").strip()

    # 1. Verify if existing patient_id actually matches the user's name
    if patient_id:
        cursor.execute("SELECT * FROM patients WHERE patient_id = ?", (patient_id,))
        existing_pat = cursor.fetchone()
        if existing_pat and user_fullname:
            pat_name = (existing_pat["name"] or "").strip().lower()
            if pat_name != user_fullname.lower() and not pat_name.startswith(user_fullname.lower().split()[0]):
                # Identity mismatch detected! Unlink and search/create correct profile
                patient_id = None

    # 2. Find or match patient record specifically for this logged-in user
    if not patient_id:
        # Match by phone AND name first
        if len(clean_p) >= 10 and user_fullname:
            cursor.execute("SELECT patient_id FROM patients WHERE phone LIKE ? AND LOWER(name) = LOWER(?) ORDER BY id DESC LIMIT 1", 
                           (f"%{clean_p[-10:]}%", user_fullname))
            row = cursor.fetchone()
            if row: patient_id = row["patient_id"]

        # Match by exact name
        if not patient_id and user_fullname:
            cursor.execute("SELECT patient_id FROM patients WHERE LOWER(name) = LOWER(?) ORDER BY id DESC LIMIT 1", (user_fullname,))
            row = cursor.fetchone()
            if row: patient_id = row["patient_id"]

    # 3. If still not found, create a dedicated patient profile
    if not patient_id:
        if current_user.get("username") == "patient_aarnav":
            patient_id = "PAT-2026-1001"
        else:
            import uuid
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            patient_id = get_next_patient_id(cursor)
            qr_tok = f"QR-{patient_id}-{uuid.uuid4().hex[:8].upper()}"
            cursor.execute("""
            INSERT INTO patients (patient_id, name, dob, age, gender, phone, address, emergency_contact, emergency_phone, blood_group, qr_token, consent_status, created_at)
            VALUES (?, ?, '1998-05-14', 28, 'Male', ?, 'Resident Address', 'Family Contact', ?, 'B+', ?, 'GRANTED', ?)
            """, (patient_id, user_fullname or "Registered Patient", current_user.get("phone", "+91 98765 00000"), current_user.get("phone", "+91 98765 00000"), qr_tok, now_str))
            
            case_id = get_next_case_id(cursor)
            cursor.execute("""
            INSERT INTO cases (case_id, patient_id, doctor_id, doctor_name, chief_complaint, symptoms, diagnosis, doctor_notes, treatment_plan, prescriptions, status, created_at, updated_at)
            VALUES (?, ?, NULL, 'Pending Doctor Consultation', 'Self-enrolled online', 'Pending examination', 'Pending Clinical Examination', 'Awaiting doctor consultation and prescription details.', 'Visit clinic/hospital for physical examination and vitals measurement.', '', 'Pending Consultation', ?, ?)
            """, (case_id, patient_id, now_str, now_str))
            
            # Heal the user's patient_id in users table
            if current_user.get("id"):
                cursor.execute("UPDATE users SET patient_id = ? WHERE id = ?", (patient_id, current_user["id"]))
            conn.commit()

    # If user record in DB has outdated patient_id, update it
    if current_user.get("id") and patient_id:
        cursor.execute("UPDATE users SET patient_id = ? WHERE id = ? AND (patient_id IS NULL OR patient_id != ?)", (patient_id, current_user["id"], patient_id))
        conn.commit()

    cursor.execute("SELECT * FROM patients WHERE patient_id = ?", (patient_id,))
    pat_row = cursor.fetchone()
    
    patient = dict(pat_row) if pat_row else {}
    if user_fullname:
        patient["name"] = user_fullname
    if current_user.get("phone"):
        patient["phone"] = current_user.get("phone")

    # Active Case & Medical Record
    cursor.execute("SELECT * FROM cases WHERE patient_id = ? ORDER BY id DESC LIMIT 1", (patient_id,))
    case_row = cursor.fetchone()
    case = dict(case_row) if case_row else {}

    # Appointments & Follow-ups
    cursor.execute("SELECT * FROM appointments WHERE patient_id = ? ORDER BY appointment_date ASC", (patient_id,))
    appointments = [dict(r) for r in cursor.fetchall()]

    # Lab Reports
    cursor.execute("SELECT id, report_type, file_name, file_url, summary, status, created_at FROM reports WHERE patient_id = ? ORDER BY id DESC", (patient_id,))
    reports = [dict(r) for r in cursor.fetchall()]

    # Longitudinal Health Trends (Only real vitals recorded by clinical staff)
    cursor.execute("SELECT * FROM vital_trends WHERE patient_id = ? ORDER BY id ASC", (patient_id,))
    trends = [dict(r) for r in cursor.fetchall()]

    # Nearby Pharmacies
    cursor.execute("SELECT name, address, distance_km, phone, emergency_phone, open_hours, is_24_hours FROM pharmacies LIMIT 5")
    pharmacies = [dict(r) for r in cursor.fetchall()]

    conn.close()

    # Dynamic Medication Timetable (Only generated if prescriptions exist)
    medications_schedule = []
    rx_content = case.get("prescriptions") or ""
    if rx_content.strip():
        # Build slots from prescription lines
        rx_lower = rx_content.lower()
        if "morning" in rx_lower or "8:00 am" in rx_lower or "8 am" in rx_lower or "breakfast" in rx_lower:
            medications_schedule.append({"slot": "Morning (8:00 AM)", "medication": "Morning Prescribed Medication", "instructions": "Take after breakfast with water", "audio_alert": "Subah 8 baje: Dawai lene ka samay ho gaya hai."})
        if "afternoon" in rx_lower or "1:00 pm" in rx_lower or "1 pm" in rx_lower or "lunch" in rx_lower:
            medications_schedule.append({"slot": "Afternoon (1:00 PM)", "medication": "Afternoon Prescribed Medication", "instructions": "Take after lunch with water", "audio_alert": "Dopahar 1 baje: Dopahar ki dawai lein."})
        if "night" in rx_lower or "evening" in rx_lower or "8:00 pm" in rx_lower or "dinner" in rx_lower or "bedtime" in rx_lower:
            medications_schedule.append({"slot": "Night (8:00 PM)", "medication": "Night Prescribed Medication", "instructions": "Take after dinner with warm water", "audio_alert": "Raat 8 baje: Raat ki dawai lene ka samay."})
        if not medications_schedule:
            medications_schedule.append({"slot": "Daily Routine", "medication": rx_content[:50], "instructions": "Take as directed by doctor", "audio_alert": "Dawai lene ka samay ho gaya hai."})

    return {
        "patient": patient,
        "active_case": case,
        "medications_schedule": medications_schedule,
        "appointments": appointments,
        "reports": reports,
        "trends": trends,
        "pharmacies": pharmacies,
        "emergency_profile": {
            "patient_id": patient.get("patient_id"),
            "name": patient.get("name"),
            "blood_group": patient.get("blood_group"),
            "critical_allergy": case.get("allergies", "None reported"),
            "emergency_contact": patient.get("emergency_contact"),
            "emergency_phone": patient.get("emergency_phone"),
            "chronic_condition": case.get("diagnosis", "Under Clinical Undertaking")
        }
    }

@router.post("/share-prescription")
async def share_prescription(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Allows a patient to share their treating doctor name, clinic/hospital name,
    chief complaint, prescription details, and optional prescription document/photo.
    """
    import os
    import re
    import uuid

    content_type = request.headers.get("content-type", "")
    doctor_name = ""
    hospital_name = ""
    chief_complaint = ""
    prescriptions = ""
    allergies = ""
    uploaded_file = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        doctor_name = str(form.get("doctor_name") or "").strip()
        hospital_name = str(form.get("hospital_name") or "").strip()
        chief_complaint = str(form.get("chief_complaint") or "").strip()
        prescriptions = str(form.get("prescriptions") or "").strip()
        allergies = str(form.get("allergies") or "").strip()
        uploaded_file = form.get("prescription_file")
    else:
        try:
            body = await request.json()
            doctor_name = str(body.get("doctor_name") or "").strip()
            hospital_name = str(body.get("hospital_name") or "").strip()
            chief_complaint = str(body.get("chief_complaint") or "").strip()
            prescriptions = str(body.get("prescriptions") or "").strip()
            allergies = str(body.get("allergies") or "").strip()
        except Exception:
            pass

    if not doctor_name:
        raise HTTPException(status_code=400, detail="Doctor name is required.")

    hospital_name = hospital_name or "Private Clinic / Hospital"
    chief_complaint = chief_complaint or "Clinical Consultation & Health Assessment"

    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Resolve patient_id
    patient_id = current_user.get("patient_id")
    if not patient_id:
        clean_p = re.sub(r'[\s\-+]', '', str(current_user.get('phone') or ''))
        if len(clean_p) >= 10:
            cursor.execute("SELECT patient_id FROM patients WHERE phone LIKE ? ORDER BY id DESC LIMIT 1", (f"%{clean_p[-10:]}%",))
            row = cursor.fetchone()
            if row: patient_id = row["patient_id"]
        if not patient_id:
            cursor.execute("SELECT patient_id FROM patients WHERE LOWER(name) = LOWER(?) OR patient_id = ? ORDER BY id DESC LIMIT 1",
                           (current_user.get("full_name", "").strip(), current_user.get("username", "")))
            row = cursor.fetchone()
            if row: patient_id = row["patient_id"]

    if not patient_id:
        conn.close()
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    # Find or create active case
    cursor.execute("SELECT * FROM cases WHERE patient_id = ? ORDER BY id DESC LIMIT 1", (patient_id,))
    case_row = cursor.fetchone()

    diag_text = f"Consultation with {doctor_name}"
    notes_text = f"Treating Clinic: {hospital_name}\nAttending Doctor: {doctor_name}\nPrescription details shared directly by patient."

    if case_row:
        case_id = case_row["case_id"]
        cursor.execute("""
        UPDATE cases
        SET doctor_name = ?,
            chief_complaint = ?,
            diagnosis = ?,
            doctor_notes = ?,
            treatment_plan = ?,
            prescriptions = ?,
            current_medications = ?,
            allergies = CASE WHEN ? != '' THEN ? ELSE allergies END,
            status = 'Active',
            updated_at = ?
        WHERE id = ?
        """, (
            doctor_name, chief_complaint, diag_text, notes_text,
            f"Consulting under {doctor_name} at {hospital_name}. Follow prescribed medication schedule.",
            prescriptions, prescriptions, allergies, allergies, now_str, case_row["id"]
        ))
        case_id = get_next_case_id(cursor)
        cursor.execute("""
        INSERT INTO cases (
            case_id, patient_id, doctor_id, doctor_name, chief_complaint, symptoms,
            medical_history, allergies, current_medications, diagnosis, doctor_notes,
            treatment_plan, prescriptions, follow_up_date, status, created_at, updated_at
        ) VALUES (?, ?, NULL, ?, ?,
                  'Patient reported consultation', 'None reported', ?, ?,
                  ?, ?,
                  ?, ?, NULL, 'Active', ?, ?)
        """, (
            case_id, patient_id, doctor_name, chief_complaint, allergies or "None reported",
            prescriptions, diag_text, notes_text,
            f"Consulting under {doctor_name} at {hospital_name}. Follow prescribed medication schedule.",
            prescriptions, now_str, now_str
        ))

    # Handle file upload if present
    saved_file_name = None
    if uploaded_file and hasattr(uploaded_file, "filename") and uploaded_file.filename:
        try:
            content = await uploaded_file.read()
            if len(content) > 0:
                upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "prescriptions")
                os.makedirs(upload_dir, exist_ok=True)
                safe_orig = re.sub(r'[^a-zA-Z0-9_.-]', '_', uploaded_file.filename)
                unique_name = f"RX_{patient_id}_{uuid.uuid4().hex[:6]}_{safe_orig}"
                file_path = os.path.join(upload_dir, unique_name)
                with open(file_path, "wb") as f:
                    f.write(content)
                saved_file_name = unique_name

                cursor.execute("""
                INSERT INTO reports (
                    patient_id, case_id, report_type, file_name, file_url,
                    uploaded_by, summary, status, created_at
                ) VALUES (?, ?, 'Prescription', ?, ?, ?, ?, 'Uploaded', ?)
                """, (
                    patient_id, case_id, safe_orig, f"/uploads/prescriptions/{unique_name}",
                    current_user.get("full_name", "Patient"),
                    f"Prescription slip from {doctor_name} ({hospital_name}): {prescriptions[:80] if prescriptions else 'Prescription Document'}",
                    now_str
                ))
        except Exception as e:
            print(f"Prescription file save warning: {e}")

    # Log timeline event
    cursor.execute("""
    INSERT INTO timeline_events (case_id, patient_id, event_type, event_title, event_description, doctor_name, event_date, created_at)
    VALUES (?, ?, 'Prescription Shared', ?, ?, ?, ?, ?)
    """, (
        case_id, patient_id, f"Prescription Shared: {doctor_name}",
        f"Prescription from {hospital_name} linked to patient health vault.{' Document attached.' if saved_file_name else ''}",
        doctor_name, now_str, now_str
    ))

    conn.commit()
    conn.close()

    # Automatically dispatch medicine schedule SMS if patient has registered phone
    patient_phone = current_user.get("phone")
    if not patient_phone:
        conn_check = get_db_connection()
        c_check = conn_check.cursor()
        c_check.execute("SELECT phone FROM patients WHERE patient_id = ?", (patient_id,))
        p_row = c_check.fetchone()
        if p_row and p_row["phone"]:
            patient_phone = p_row["phone"]
        conn_check.close()

    if patient_phone and prescriptions.strip():
        try:
            from backend.sms_voice_service import dispatch_keypad_sms
            rx_lower = prescriptions.lower()
            slots = []
            if "morning" in rx_lower or "8:00 am" in rx_lower or "breakfast" in rx_lower or "subah" in rx_lower:
                slots.append("Morning 8:00 AM")
            if "afternoon" in rx_lower or "1:00 pm" in rx_lower or "lunch" in rx_lower or "dopahar" in rx_lower:
                slots.append("Afternoon 1:00 PM")
            if "night" in rx_lower or "8:00 pm" in rx_lower or "dinner" in rx_lower or "raat" in rx_lower:
                slots.append("Night 8:00 PM")
            timing_slots_str = ", ".join(slots) if slots else "Morning 8:00 AM, Night 8:00 PM"
            
            p_display_name = current_user.get("full_name") or "Patient"
            dispatch_keypad_sms(
                phone=patient_phone,
                patient_name=p_display_name,
                template_key="med_timing_schedule",
                lang="hi",
                custom_vars={"name": p_display_name, "times": timing_slots_str}
            )
        except Exception as e:
            print(f"Warning: SMS dispatch on share_prescription: {e}")

    return {
        "success": True,
        "message": f"✓ Prescription and consultation with {doctor_name} ({hospital_name}) successfully linked!",
        "case_id": case_id,
        "doctor_name": doctor_name,
        "hospital_name": hospital_name,
        "prescriptions": prescriptions,
        "uploaded_file": saved_file_name
    }
