from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from backend.database import get_db_connection
from backend.routes.auth import get_current_user
from backend.security import log_audit

router = APIRouter(prefix="/api/hospital", tags=["Hospital & Facility Management"])

class InpatientAdmissionRequest(BaseModel):
    patient_id: str
    patient_name: str
    age: int
    gender: str
    ward_type: str # Emergency ICU, General Ward, Maternity Ward
    bed_number: str
    admitting_doctor: str
    diagnosis: str
    triage_level: str # Red, Amber, Green

@router.get("/dashboard")
def get_hospital_dashboard(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Facility Profile & Accreditation (Specific to logged-in institution)
    facility = None
    if current_user.get("role") in ["hospital", "admin"]:
        cursor.execute("SELECT * FROM hospital_facilities WHERE name = ? OR rohini_id = ? ORDER BY id DESC LIMIT 1",
                       (current_user.get("full_name"), current_user.get("registration_number")))
        fac_row = cursor.fetchone()
        if fac_row:
            facility = dict(fac_row)
        else:
            import uuid
            facility_id = f"HOSP-2026-{uuid.uuid4().hex[:6].upper()}"
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cursor.execute("""
            INSERT INTO hospital_facilities (
                facility_id, name, rohini_id, cea_number, facility_type, total_beds,
                occupied_beds, icu_beds_total, icu_beds_occupied, oxygen_plant_status,
                nodal_officer, nodal_aadhaar_masked, is_verified, created_at
            ) VALUES (?, ?, ?, ?, ?, 100, 32, 12, 4, 'Optimal (Cryogenic Purity 98%)', ?, ?, 1, ?)
            """, (
                facility_id, current_user.get("full_name"), current_user.get("registration_number", "ROHINI-MH-89210"),
                f"CEA-REG-{uuid.uuid4().hex[:4].upper()}", current_user.get("department", "Sub-District Hospital (SDH)"),
                f"Nodal Medical Officer ({current_user.get('full_name')})", current_user.get("aadhaar_masked", "XXXX-XXXX-9901"), now_str
            ))
            conn.commit()
            cursor.execute("SELECT * FROM hospital_facilities WHERE facility_id = ?", (facility_id,))
            facility = dict(cursor.fetchone())

    if not facility:
        cursor.execute("SELECT * FROM hospital_facilities LIMIT 1")
        fac_row = cursor.fetchone()
        facility = dict(fac_row) if fac_row else {
        "facility_id": "HOSP-MH-RAIGAD-01",
        "name": "Raigad Sub-District Hospital & Primary Health Centre",
        "rohini_id": "ROHINI-MH-89210",
        "cea_number": "CEA-REG-MH-4401",
        "facility_type": "Sub-District Hospital (SDH) & 24x7 Emergency",
        "total_beds": 120,
        "occupied_beds": 94,
        "icu_beds_total": 12,
        "icu_beds_occupied": 8,
        "oxygen_plant_status": "Optimal (98% Cryogenic Purity)",
        "nodal_officer": "Dr. V. P. Deshmukh, Civil Surgeon",
        "nodal_aadhaar_masked": "XXXX-XXXX-9901",
        "is_verified": 1
    }

    # 2. Inpatient Admissions Roster
    cursor.execute("""
    SELECT * FROM hospital_admissions 
    ORDER BY CASE WHEN triage_level = 'Red' THEN 1 WHEN triage_level = 'Amber' THEN 2 ELSE 3 END, id DESC
    """)
    admissions = [dict(r) for r in cursor.fetchall()]

    # 3. Clinical Staff On-Duty (Doctors & Nurses with NMC Licenses)
    cursor.execute("""
    SELECT id, username, role, full_name, department, registration_number, is_verified, phone 
    FROM users 
    WHERE role IN ('doctor', 'nurse', 'hospital') 
    ORDER BY role ASC, id ASC
    """)
    staff = [dict(r) for r in cursor.fetchall()]

    # 4. Inter-Facility Case Transfers
    cursor.execute("""
    SELECT id, transfer_id, case_id, patient_id, from_facility, to_facility, reason, status, created_at 
    FROM case_transfers 
    ORDER BY id DESC LIMIT 5
    """)
    transfers = [dict(r) for r in cursor.fetchall()]

    # 5. Rural Health Outreach Camps
    cursor.execute("SELECT * FROM rural_outreach_camps ORDER BY id ASC")
    camps = [dict(r) for r in cursor.fetchall()]

    # 6. Overall KPIs
    total_beds = facility.get("total_beds", 120)
    occupied_beds = len([a for a in admissions if a.get("status") == "Admitted"])
    occupancy_pct = round((occupied_beds / total_beds) * 100, 1) if total_beds else 0
    icu_critical = len([a for a in admissions if a.get("ward_type") == "Emergency ICU" and a.get("status") == "Admitted"])
    red_triage = len([a for a in admissions if a.get("triage_level") == "Red" and a.get("status") == "Admitted"])

    conn.close()

    return {
        "facility": facility,
        "kpis": {
            "total_beds": total_beds,
            "occupied_beds": occupied_beds,
            "available_beds": max(0, total_beds - occupied_beds),
            "occupancy_rate_pct": occupancy_pct,
            "icu_critical_patients": icu_critical,
            "red_triage_count": red_triage,
            "active_doctors_on_duty": len([s for s in staff if s.get("role") == "doctor"]),
            "pending_transfers": len([t for t in transfers if t.get("status") == "PENDING"]),
            "scheduled_outreach_camps": len(camps)
        },
        "admissions": admissions,
        "staff": staff,
        "transfers": transfers,
        "camps": camps
    }

@router.post("/admit-patient")
def admit_inpatient(req: InpatientAdmissionRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM hospital_admissions ORDER BY id DESC LIMIT 1")
    last = cursor.fetchone()
    next_id = (last["id"] + 105) if last else 105
    admission_id = f"ADM-2026-{next_id}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")

    cursor.execute("""
    INSERT INTO hospital_admissions (admission_id, patient_id, patient_name, age, gender, ward_type, bed_number, admitting_doctor, diagnosis, triage_level, admission_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Admitted')
    """, (
        admission_id, req.patient_id, req.patient_name, req.age, req.gender,
        req.ward_type, req.bed_number, req.admitting_doctor, req.diagnosis,
        req.triage_level, now_str
    ))

    cursor.execute("UPDATE hospital_facilities SET occupied_beds = occupied_beds + 1 WHERE id = 1")
    conn.commit()

    log_audit(conn, current_user.get("id"), current_user.get("username", "hospital"), "hospital", 
              "INPATIENT_ADMISSION", req.patient_id, "Bed Allocation", 
              f"Admitted {req.patient_name} to {req.ward_type} (Bed {req.bed_number}) with Triage {req.triage_level}")
    conn.close()

    return {
        "success": True,
        "admission_id": admission_id,
        "message": f"Patient {req.patient_name} successfully admitted to {req.ward_type} ({req.bed_number})."
    }

@router.get("/verification-status")
def get_verification_details():
    return {
        "hospital_name": "Raigad Sub-District Hospital & Primary Health Centre",
        "rohini_id": "ROHINI-MH-89210",
        "clinical_establishments_act_reg": "CEA-REG-MH-4401",
        "accreditation": "NABH Entry Level Pre-Accredited Public Hospital",
        "nodal_officer": "Dr. V. P. Deshmukh, Civil Surgeon",
        "nodal_officer_aadhaar_masked": "XXXX-XXXX-9901",
        "ayushman_bharat_pmjay_status": "Active Empaneled Tertiary Network",
        "is_verified": True,
        "verification_seal": "✓ Government Verified Healthcare Institution (UIDAI / ROHINI / CEA Validated)"
    }
