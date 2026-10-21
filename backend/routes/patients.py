from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime
import uuid
from typing import Optional
from backend.database import get_db_connection, get_next_patient_id, get_next_case_id
from backend.models import PatientRegister
from backend.routes.auth import get_current_user
from backend.security import log_audit

router = APIRouter(prefix="/api/patients", tags=["Patients"])

@router.get("")
def list_or_search_patients(
    search: Optional[str] = Query(None, description="Search by Patient ID, Name, Phone, or DOB"),
    current_user: dict = Depends(get_current_user)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    if search:
        term = f"%{search.strip()}%"
        cursor.execute("""
        SELECT p.*, 
               (SELECT COUNT(*) FROM cases c WHERE c.patient_id = p.patient_id AND c.status = 'Active') as active_cases_count,
               (SELECT MAX(created_at) FROM cases c WHERE c.patient_id = p.patient_id) as last_case_date
        FROM patients p
        WHERE p.patient_id LIKE ? OR p.name LIKE ? OR p.phone LIKE ? OR p.dob LIKE ?
        ORDER BY p.id DESC
        """, (term, term, term, term))
    else:
        cursor.execute("""
        SELECT p.*, 
               (SELECT COUNT(*) FROM cases c WHERE c.patient_id = p.patient_id AND c.status = 'Active') as active_cases_count,
               (SELECT MAX(created_at) FROM cases c WHERE c.patient_id = p.patient_id) as last_case_date
        FROM patients p
        ORDER BY p.id DESC
        """)

    patients = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return patients

@router.post("")
def register_patient(req: PatientRegister, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Generate next Patient ID
    patient_id = get_next_patient_id(cursor)
    qr_token = f"QR-{patient_id}-{uuid.uuid4().hex[:8].upper()}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    today_str = datetime.now().strftime("%Y-%m-%d")

    cursor.execute("""
    INSERT INTO patients (
        patient_id, name, dob, age, gender, phone, address, 
        emergency_contact, emergency_phone, blood_group, 
        insurance_provider, insurance_policy_no, abha_id, qr_token, consent_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'GRANTED', ?)
    """, (
        patient_id, req.name, req.dob, req.age, req.gender, req.phone, req.address,
        req.emergency_contact, (req.emergency_phone or req.phone), req.blood_group,
        req.insurance_provider, req.insurance_policy_no, req.abha_id, qr_token, now_str
    ))

    # 1. SAVE BASELINE VITALS (Heart Rate, Blood Pressure, SpO2, Temperature, Glucose, Weight)
    cursor.execute("""
    INSERT INTO vital_trends (
        patient_id, month_label, systolic_bp, diastolic_bp, weight_kg,
        fasting_glucose, heart_rate, spo2, temp_f, recorded_date
    ) VALUES (?, 'Apr 2026', ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        patient_id,
        req.systolic_bp or 120,
        req.diastolic_bp or 80,
        req.weight_kg or 65.0,
        req.fasting_glucose or 100,
        req.heart_rate or 76,
        req.spo2 or 98,
        req.temp_f or 98.4,
        today_str
    ))

    # 2. FORMAT STRUCTURED MEDICINES & TIMINGS
    formatted_med_lines = []
    if req.medications and len(req.medications) > 0:
        for idx, m in enumerate(req.medications, 1):
            dosage_str = f" ({m.dosage})" if m.dosage else ""
            time_str = f" at {m.time_slot}" if m.time_slot else ""
            inst_str = f" - {m.instructions}" if m.instructions else ""
            formatted_med_lines.append(f"{idx}. {m.name}{dosage_str}{time_str}{inst_str}")
    
    rx_text = "\n".join(formatted_med_lines) if formatted_med_lines else (req.prescriptions or req.treatment_plan or "Prescribed daily supportive care.")
    treatment_summary = req.treatment_plan or rx_text

    # Add default DPDP patient consents
    today_str = datetime.now().strftime("%Y-%m-%d")
    cursor.execute("""
    INSERT INTO consent_records (patient_id, consent_type, purpose, status, granted_date, valid_until)
    VALUES (?, 'Direct Clinical Care', 'Clinical diagnosis, consultations, and treatment undertakers', 'Active', ?, '2028-12-31')
    """, (patient_id, today_str))

    cursor.execute("""
    INSERT INTO consent_records (patient_id, consent_type, purpose, status, granted_date, valid_until)
    VALUES (?, 'Emergency Access', 'Emergency first-responder QR access to blood group and critical allergies', 'Active', ?, '2028-12-31')
    """, (patient_id, today_str))

    conn.commit()

    # Automatically initialize clinical undertaking case for new patient with doctor's clinical data
    from datetime import timedelta
    case_id = get_next_case_id(cursor)
    doc_name = current_user.get("full_name") or "Dr. Rajesh Kulkarni, MD"
    doc_id = current_user.get("id") or 1

    vitals_summary = f"Vitals: HR {req.heart_rate or 76} BPM, BP {req.systolic_bp or 120}/{req.diastolic_bp or 80} mmHg, SpO2 {req.spo2 or 98}%, Temp {req.temp_f or 98.4}°F, Glucose {req.fasting_glucose or 100} mg/dL."
    notes_text = f"{vitals_summary}\n{req.doctor_notes or 'Initial patient undertaking registered by physician.'}"

    cursor.execute("""
    INSERT INTO cases (
        case_id, patient_id, doctor_id, doctor_name, chief_complaint, symptoms,
        medical_history, allergies, current_medications, diagnosis, doctor_notes,
        treatment_plan, prescriptions, follow_up_date, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?,
              'None reported', ?, ?,
              ?, ?,
              ?, ?, ?, 'Active', ?, ?)
    """, (
        case_id, patient_id, doc_id, doc_name,
        req.chief_complaint or "Clinical Consultation & Health Assessment",
        req.symptoms or "Initial clinical examination",
        req.allergies or "No known drug allergies",
        rx_text,
        req.diagnosis or "Primary Clinical Undertaking",
        notes_text,
        treatment_summary,
        rx_text,
        (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
        now_str, now_str
    ))

    cursor.execute("""
    INSERT INTO timeline_events (case_id, patient_id, event_type, event_title, event_description, doctor_name, event_date, created_at)
    VALUES (?, ?, 'Visit', 'Initial Clinical Undertaking Registration', 'Patient undertaking initiated with DPDP consent.', ?, ?, ?)
    """, (case_id, patient_id, doc_name, now_str, now_str))

    # Commit all clinical records BEFORE external dispatches so DB is not held in write lock
    conn.commit()

    log_audit(conn, current_user.get("id"), current_user.get("username", "staff"), current_user.get("role", "staff"),
              "REGISTER_PATIENT", patient_id, "Patient Registry", f"Registered new patient {req.name} ({patient_id}) with Case {case_id}")
    conn.close()

    # Send SMS alert to keypad phone if phone is provided (after DB lock released)
    if req.phone:
        try:
            from backend.sms_voice_service import dispatch_keypad_sms
            followup_date_str = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
            
            # 1. Appointment Follow-up SMS
            dispatch_keypad_sms(
                phone=req.phone,
                patient_name=req.name,
                template_key="followup_scheduled",
                lang="hi",
                custom_vars={"date": followup_date_str, "time": "10:30 AM", "doctor": doc_name}
            )

            # 2. Medicine Timing Timetable SMS
            slots = []
            if req.medications:
                slots = [m.time_slot for m in req.medications if getattr(m, 'time_slot', None)]
            timing_slots_str = ", ".join(dict.fromkeys(slots)) if slots else "Morning 8:00 AM, Night 8:00 PM"
            dispatch_keypad_sms(
                phone=req.phone,
                patient_name=req.name,
                template_key="med_timing_schedule",
                lang="hi",
                custom_vars={"name": req.name, "times": timing_slots_str}
            )
        except Exception as e:
            print(f"Warning: SMS dispatch error in create_patient: {e}")

    return {
        "success": True,
        "message": f"Patient {req.name} registered successfully with ID {patient_id} and Case {case_id}",
        "patient_id": patient_id,
        "case_id": case_id,
        "qr_token": qr_token
    }

@router.get("/{patient_id}")
def get_patient_case_undertaking_file(patient_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM patients WHERE patient_id = ?", (patient_id,))
    patient = cursor.fetchone()
    if not patient:
        conn.close()
        raise HTTPException(status_code=404, detail="Patient record not found")

    patient_dict = dict(patient)

    # Get cases
    cursor.execute("SELECT * FROM cases WHERE patient_id = ? ORDER BY id DESC", (patient_id,))
    cases = [dict(c) for c in cursor.fetchall()]

    # Get timeline events
    cursor.execute("SELECT * FROM timeline_events WHERE patient_id = ? ORDER BY event_date ASC", (patient_id,))
    timeline = [dict(t) for t in cursor.fetchall()]

    # Get reports
    cursor.execute("SELECT * FROM reports WHERE patient_id = ? ORDER BY id DESC", (patient_id,))
    reports = [dict(r) for r in cursor.fetchall()]

    # Get appointments
    cursor.execute("SELECT * FROM appointments WHERE patient_id = ? ORDER BY id DESC", (patient_id,))
    appointments = [dict(a) for a in cursor.fetchall()]

    # Get consents
    cursor.execute("SELECT * FROM consent_records WHERE patient_id = ?", (patient_id,))
    consents = [dict(c) for c in cursor.fetchall()]

    log_audit(conn, current_user.get("id"), current_user.get("username", "user"), current_user.get("role", "doctor"),
              "VIEW_PATIENT_FILE", patient_id, "Patient Case File", f"Viewed complete case record for {patient_dict['name']}")
    conn.close()

    return {
        "patient": patient_dict,
        "cases": cases,
        "timeline": timeline,
        "reports": reports,
        "appointments": appointments,
        "consents": consents
    }

@router.get("/{patient_id}/emergency-qr")
def get_emergency_qr_profile(patient_id: str):
    """
    Public emergency responder QR profile showing strictly life-saving information:
    Blood group, Allergies, Active medications, Major medical history, Emergency contact.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT patient_id, name, age, gender, blood_group, emergency_contact, emergency_phone, abha_id, qr_token FROM patients WHERE patient_id = ?", (patient_id,))
    patient = cursor.fetchone()
    if not patient:
        conn.close()
        raise HTTPException(status_code=404, detail="Emergency profile not found")

    patient_dict = dict(patient)

    # Fetch active case for critical clinical flags
    cursor.execute("SELECT allergies, current_medications, medical_history FROM cases WHERE patient_id = ? AND status = 'Active' ORDER BY id DESC LIMIT 1", (patient_id,))
    active_case = cursor.fetchone()

    allergies = active_case["allergies"] if active_case else "No known drug allergies"
    medications = active_case["current_medications"] if active_case else "None reported"
    history = active_case["medical_history"] if active_case else "None reported"

    conn.close()

    return {
        "patient_id": patient_dict["patient_id"],
        "name": patient_dict["name"],
        "age": patient_dict["age"],
        "gender": patient_dict["gender"],
        "blood_group": patient_dict["blood_group"],
        "emergency_contact": patient_dict["emergency_contact"],
        "emergency_phone": patient_dict["emergency_phone"],
        "allergies": allergies,
        "current_medications": medications,
        "major_conditions": history,
        "abha_id": patient_dict.get("abha_id"),
        "disclaimer": "Emergency Responder Life-Saving Quick View. Strict data minimization applied under Indian Digital Healthcare norms."
    }
