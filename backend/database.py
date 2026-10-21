import sqlite3
import os
import json
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "patient_case_system.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL")
    except Exception:
        pass
    return conn

def get_next_patient_id(cursor):
    """
    Safely generates a guaranteed unique PAT-2026-XXXX ID by inspecting all existing IDs.
    """
    cursor.execute("SELECT patient_id FROM patients")
    existing_ids = {r[0] for r in cursor.fetchall() if r[0]}
    
    max_num = 1000
    for pid in existing_ids:
        if str(pid).startswith("PAT-2026-"):
            try:
                num = int(str(pid).split("-")[-1])
                if num > max_num:
                    max_num = num
            except Exception:
                pass
    next_num = max_num + 1
    new_id = f"PAT-2026-{next_num}"
    while new_id in existing_ids:
        next_num += 1
        new_id = f"PAT-2026-{next_num}"
    return new_id

def get_next_case_id(cursor):
    """
    Safely generates a guaranteed unique CASE-2026-XXXX ID by inspecting all existing IDs.
    """
    cursor.execute("SELECT case_id FROM cases")
    existing_ids = {r[0] for r in cursor.fetchall() if r[0]}
    
    max_num = 500
    for cid in existing_ids:
        if str(cid).startswith("CASE-2026-"):
            try:
                num = int(str(cid).split("-")[-1])
                if num > max_num:
                    max_num = num
            except Exception:
                pass
    next_num = max_num + 1
    new_id = f"CASE-2026-{next_num}"
    while new_id in existing_ids:
        next_num += 1
        new_id = f"CASE-2026-{next_num}"
    return new_id

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN patient_id TEXT")
    except Exception: pass
    try:
        cursor.execute("ALTER TABLE vital_trends ADD COLUMN heart_rate INTEGER DEFAULT 76")
        cursor.execute("ALTER TABLE vital_trends ADD COLUMN spo2 INTEGER DEFAULT 98")
        cursor.execute("ALTER TABLE vital_trends ADD COLUMN temp_f REAL DEFAULT 98.4")
    except Exception: pass
    try:
        cursor.execute("ALTER TABLE cases ADD COLUMN prescriptions TEXT")
    except Exception: pass
    conn.commit()
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN patient_id TEXT")
        conn.commit()
    except Exception:
        pass

    # Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL, -- admin, doctor, nurse, receptionist, patient
        full_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        aadhaar_masked TEXT,
        registration_number TEXT,
        is_verified INTEGER DEFAULT 0,
        department TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # Patients table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        dob TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        emergency_contact TEXT NOT NULL,
        emergency_phone TEXT NOT NULL,
        blood_group TEXT NOT NULL,
        insurance_provider TEXT,
        insurance_policy_no TEXT,
        abha_id TEXT,
        qr_token TEXT NOT NULL,
        consent_status TEXT DEFAULT 'GRANTED',
        created_at TEXT NOT NULL
    )
    """)

    # Cases table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id TEXT UNIQUE NOT NULL,
        patient_id TEXT NOT NULL,
        doctor_id INTEGER,
        doctor_name TEXT NOT NULL,
        chief_complaint TEXT NOT NULL,
        symptoms TEXT NOT NULL,
        medical_history TEXT,
        allergies TEXT,
        current_medications TEXT,
        diagnosis TEXT NOT NULL,
        doctor_notes TEXT,
        treatment_plan TEXT NOT NULL,
        follow_up_date TEXT,
        status TEXT DEFAULT 'Active', -- Active, Closed, Transferred
        discharge_summary TEXT,
        discharge_approved_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
    )
    """)

    # Timeline events table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS timeline_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        event_type TEXT NOT NULL, -- Visit, Diagnosis, Tests, Results, Treatment, Follow-up, Outcome
        event_title TEXT NOT NULL,
        event_description TEXT NOT NULL,
        doctor_name TEXT,
        event_date TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    # Medical reports & documents table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id TEXT NOT NULL,
        case_id TEXT NOT NULL,
        report_type TEXT NOT NULL, -- Blood report, X-ray, MRI/CT scan, Prescription, Discharge summary, Referral document
        file_name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        uploaded_by TEXT NOT NULL,
        parsed_data TEXT, -- JSON structure of lab values
        summary TEXT,
        status TEXT DEFAULT 'Analyzed',
        created_at TEXT NOT NULL
    )
    """)

    # Appointments & Follow-ups table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id TEXT NOT NULL,
        patient_name TEXT NOT NULL,
        doctor_id INTEGER,
        doctor_name TEXT NOT NULL,
        appointment_date TEXT NOT NULL,
        appointment_time TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'Scheduled', -- Scheduled, Completed, Missed, Rescheduled
        follow_up_status TEXT DEFAULT 'Treatment Started', -- Treatment Started, Follow-up Due, Missed Appointment, Reminder Sent, Staff Escalated, Attended
        notes TEXT,
        reminder_sent INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    )
    """)

    # Audit Logs (DPDP Act / ABDM compliance)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT NOT NULL,
        role TEXT NOT NULL,
        action TEXT NOT NULL,
        patient_id TEXT,
        resource TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        timestamp TEXT NOT NULL
    )
    """)

    # Consent management
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS consent_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id TEXT NOT NULL,
        consent_type TEXT NOT NULL,
        purpose TEXT NOT NULL,
        status TEXT DEFAULT 'Active',
        granted_date TEXT NOT NULL,
        valid_until TEXT NOT NULL
    )
    """)

    # Pharmacies / Nearby Medical Stores
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pharmacies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        distance_km REAL NOT NULL,
        phone TEXT NOT NULL,
        emergency_phone TEXT,
        open_hours TEXT NOT NULL,
        is_24_hours INTEGER DEFAULT 0,
        rating REAL DEFAULT 4.5,
        emergency_medicines TEXT NOT NULL,
        stock_status TEXT DEFAULT 'In Stock'
    )
    """)

    # Villages Registry (Rural Public Health Clusters)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS villages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        village_id TEXT UNIQUE NOT NULL,
        village_name TEXT NOT NULL,
        district TEXT NOT NULL,
        taluka TEXT NOT NULL,
        gram_panchayat TEXT NOT NULL,
        phc_subcentre TEXT NOT NULL,
        asha_worker_name TEXT NOT NULL,
        target_population INTEGER DEFAULT 1000,
        water_supply_type TEXT DEFAULT 'Piped & Community Borewell',
        sanitation_coverage_percent REAL DEFAULT 85.0,
        created_at TEXT NOT NULL
    )
    """)

    # Rural Community Households (Family Health Graph)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS households (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id TEXT UNIQUE NOT NULL,
        village_id TEXT,
        village_name TEXT NOT NULL,
        head_name TEXT NOT NULL,
        phone TEXT,
        address TEXT NOT NULL,
        ration_card_type TEXT DEFAULT 'BPL',
        water_source TEXT DEFAULT 'Community Borewell',
        sanitation_toilet INTEGER DEFAULT 1,
        high_risk_flag INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    )
    """)

    # Ensure existing households table has village_id and phone
    try:
        cursor.execute("ALTER TABLE households ADD COLUMN village_id TEXT")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE households ADD COLUMN phone TEXT")
    except Exception:
        pass

    # Family Members Hierarchy
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS family_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id TEXT NOT NULL,
        patient_id TEXT,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        relation TEXT NOT NULL, -- Father, Mother, Child, Grandparent, Spouse
        immunization_status TEXT DEFAULT 'Complete', -- Complete, Pending, Overdue
        is_pregnant_anc INTEGER DEFAULT 0,
        chronic_condition TEXT DEFAULT 'None',
        high_priority INTEGER DEFAULT 0,
        FOREIGN KEY (household_id) REFERENCES households(household_id)
    )
    """)

    # SMS & Keypad Phone / IVR Call Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sms_call_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT NOT NULL,
        patient_name TEXT NOT NULL,
        message_type TEXT NOT NULL, -- SMS, VOICE_CALL
        content TEXT NOT NULL,
        language TEXT DEFAULT 'en', -- en, hi, mr, gu, ta, te
        status TEXT DEFAULT 'Delivered', -- Delivered, Queued, Failed
        created_at TEXT NOT NULL
    )
    """)

    # Longitudinal Health Trends (BP, Weight, Blood Glucose over time)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vital_trends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id TEXT NOT NULL,
        month_label TEXT NOT NULL, -- Jan 2026, Feb 2026, Mar 2026, Apr 2026
        systolic_bp INTEGER NOT NULL,
        diastolic_bp INTEGER NOT NULL,
        weight_kg REAL NOT NULL,
        fasting_glucose INTEGER NOT NULL,
        recorded_date TEXT NOT NULL
    )
    """)

    # Secure Case Transfers between healthcare facilities
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS case_transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transfer_id TEXT UNIQUE NOT NULL,
        case_id TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        from_facility TEXT NOT NULL,
        to_facility TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING', -- PENDING, ACCEPTED, REJECTED
        transfer_package_json TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    # 14. Hospital facilities registry
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS hospital_facilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        facility_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        rohini_id TEXT NOT NULL,
        cea_number TEXT NOT NULL,
        facility_type TEXT NOT NULL,
        total_beds INTEGER DEFAULT 120,
        occupied_beds INTEGER DEFAULT 94,
        icu_beds_total INTEGER DEFAULT 12,
        icu_beds_occupied INTEGER DEFAULT 8,
        oxygen_plant_status TEXT DEFAULT 'Optimal (98% Purity)',
        nodal_officer TEXT NOT NULL,
        nodal_aadhaar_masked TEXT NOT NULL,
        is_verified INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
    )
    """)

    # 15. Hospital Inpatient Ward Admissions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS hospital_admissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admission_id TEXT UNIQUE NOT NULL,
        patient_id TEXT NOT NULL,
        patient_name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        ward_type TEXT NOT NULL, -- General Ward, Emergency ICU, Maternity Ward
        bed_number TEXT NOT NULL,
        admitting_doctor TEXT NOT NULL,
        diagnosis TEXT NOT NULL,
        triage_level TEXT NOT NULL, -- Red, Amber, Green
        admission_date TEXT NOT NULL,
        status TEXT DEFAULT 'Admitted'
    )
    """)

    # 16. Rural Health Outreach & Mobile Van Camps
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rural_outreach_camps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        camp_name TEXT NOT NULL,
        village_name TEXT NOT NULL,
        scheduled_date TEXT NOT NULL,
        team_lead_doctor TEXT NOT NULL,
        target_services TEXT NOT NULL,
        status TEXT DEFAULT 'Scheduled'
    )
    """)

    conn.commit()
    seed_data(conn)
    conn.close()

def seed_data(conn):
    cursor = conn.cursor()
    from backend.security import hash_password

    now = datetime.now()
    now_str = now.strftime("%Y-%m-%d %H:%M:%S")
    today_str = now.strftime("%Y-%m-%d")

    # 1. Seed Users
    users = [
        ("admin", hash_password("admin123"), "admin", "System Administrator", "admin@hospital.in", "+91 98200 00000", "XXXX-XXXX-9901", "HOSP-ADM-001", 1, "Administration", now_str),
        ("dr_kulkarni", hash_password("doctor123"), "doctor", "Dr. Rajesh Kulkarni, MD", "dr.kulkarni@hospital.in", "+91 98201 23456", "XXXX-XXXX-4819", "NMC/MCI-84920/2012", 1, "General Medicine", now_str),
        ("dr_ananya", hash_password("doctor123"), "doctor", "Dr. Ananya Iyer, DNB", "dr.ananya@hospital.in", "+91 98202 34567", "XXXX-XXXX-7123", "NMC/MCI-49210/2016", 1, "Pulmonology & Critical Care", now_str),
        ("nurse_deepa", hash_password("nurse123"), "nurse", "Sister Deepa Nair, B.Sc Nursing", "deepa.nair@hospital.in", "+91 98203 45678", "XXXX-XXXX-3342", "INC-NR-92144", 1, "Clinical Vitals & Triage", now_str),
        ("reception_amit", hash_password("recep123"), "receptionist", "Amit Deshmukh", "amit.deshmukh@hospital.in", "+91 98204 56789", "XXXX-XXXX-5521", "REG-STAFF-102", 1, "Front Desk Registration", now_str),
        ("asha_sunita", hash_password("asha123"), "asha_worker", "Sunita Tai Patil (ASHA Worker)", "sunita.asha@phc.gov.in", "+91 98205 12345", "XXXX-XXXX-6789", "ASHA-MH-RAIGAD-042", 1, "Rural Community Health", now_str),
        ("patient_aarnav", hash_password("patient123"), "patient", "Aarnav Sharma", "aarnav.sharma@example.com", "+91 98765 43210", "XXXX-XXXX-8821", "N/A", 1, "Patient", now_str),
        ("hospital_admin", hash_password("hospital123"), "hospital", "Raigad Sub-District Hospital & PHC", "admin@raigadhospital.gov.in", "+91 98200 44556", "XXXX-XXXX-9901", "ROHINI-MH-89210", 1, "Hospital Administration & Inpatient Care", now_str),
    ]
    cursor.executemany("""
    INSERT OR IGNORE INTO users (username, password_hash, role, full_name, email, phone, aadhaar_masked, registration_number, is_verified, department, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, users)

    # 2. Seed Patients
    if cursor.execute("SELECT COUNT(*) FROM patients").fetchone()[0] == 0:
        patients = [
            (
                "PAT-2026-1001", "Aarnav Sharma", "2002-04-14", 24, "Male", "+91 98765 43210",
                "Flat 402, Sai Kripa Heights, Dadar West, Mumbai - 400028", "Sunita Sharma (Mother)", "+91 98765 43219",
                "B+", "Star Health Insurance", "SH-POL-992014-A", "22-9481-0192-3841", "QR-PAT-1001-AARNAV", "GRANTED", now_str
            ),
            (
                "PAT-2026-1002", "Priya Patel", "1988-11-23", 38, "Female", "+91 98211 54321",
                "12/B Nilgiri Apts, Navrangpura, Ahmedabad - 380009", "Kirit Patel (Spouse)", "+91 98211 54329",
                "O+", "HDFC ERGO General Health", "HE-90412-88B", "91-4412-8921-1102", "QR-PAT-1002-PRIYA", "GRANTED", now_str
            ),
            (
                "PAT-2026-1003", "Ramesh Verma", "1964-07-19", 62, "Male", "+91 98333 77889",
                "Plot 88, Sector 15, Vashi, Navi Mumbai - 400703", "Rohit Verma (Son)", "+91 98333 77880",
                "A+", "Care Health Senior Shield", "CHS-88102-V", "45-2190-6712-4491", "QR-PAT-1003-RAMESH", "GRANTED", now_str
            ),
            (
                "PAT-2026-1004", "Meera Nair", "1997-03-08", 29, "Female", "+91 98199 11223",
                "C-301, Palm Grove, Baner Road, Pune - 411045", "Anand Menon (Brother)", "+91 98199 11229",
                "AB+", "Niva Bupa Health Insurance", "NB-22019-91A", "19-8821-3490-6623", "QR-PAT-1004-MEERA", "GRANTED", now_str
            ),
            (
                "PAT-2026-1005", "Tanvi Sengupta", "2005-09-15", 21, "Female", "+91 98450 99887",
                "Flat 104, Green Meadows, Indiranagar, Bengaluru - 560038", "Debabrata Sengupta (Father)", "+91 98450 99880",
                "O-", "Aditya Birla Active Health", "AB-55102-TG", "33-7712-9901-4432", "QR-PAT-1005-TANVI", "GRANTED", now_str
            )
        ]
        cursor.executemany("""
        INSERT INTO patients (patient_id, name, dob, age, gender, phone, address, emergency_contact, emergency_phone, blood_group, insurance_provider, insurance_policy_no, abha_id, qr_token, consent_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, patients)

    # 3. Seed Complete Cases
    if cursor.execute("SELECT COUNT(*) FROM cases").fetchone()[0] == 0:
        cases = [
            (
                "CASE-2026-501", "PAT-2026-1001", 2, "Dr. Rajesh Kulkarni, MD",
                "High fever for 3 days with persistent dry cough and chest tightness",
                "Fever (101.8°F), productive cough with whitish sputum, nocturnal wheezing, fatigue",
                "Bronchial Asthma diagnosed in 2021; seasonal allergic rhinitis",
                "Penicillin (Causes anaphylactoid rash and facial edema)",
                "Montelukast 10mg OD at bedtime; Salbutamol Inhaler 100mcg PRN",
                "Acute Exacerbation of Bronchial Asthma secondary to Viral Upper Respiratory Infection",
                "Chest auscultation shows bilateral expiratory polyphonic wheezing. No crepitations. SpO2 96% on room air. Avoid beta-lactams. Ordered Complete Blood Count (CBC) and Chest X-Ray PA view.",
                "1. Budesonide + Formoterol (Foracort 200) inhaler 1 puff twice daily\n2. Paracetamol 650mg TDS PRN for fever\n3. Azithromycin 500mg OD for 3 days\n4. Steam inhalation TDS and hydration > 2.5L/day\n5. Urgent review if SpO2 falls < 94% or breathlessness worsens",
                (now + timedelta(days=5)).strftime("%Y-%m-%d"), "Active",
                "Patient presented with acute asthma exacerbation triggered by viral infection. Initial wheezing managed effectively. Azithromycin initiated. Safe for discharge with inhaler protocol.",
                "Dr. Rajesh Kulkarni, MD", now_str, now_str
            ),
            (
                "CASE-2026-502", "PAT-2026-1002", 2, "Dr. Rajesh Kulkarni, MD",
                "Bilateral knee pain, morning joint stiffness > 45 mins, generalized fatigue",
                "Joint tenderness in knees and MCP joints, warmth, morning stiffness",
                "Essential Hypertension (5 years)",
                "Sulfa drugs (Sulfamethoxazole - causes erythema multiforme)",
                "Amlodipine 5mg OD morning",
                "Suspected Early Rheumatoid Arthritis with mild secondary Osteoarthritis",
                "ESR and RA Factor tests ordered. Advised physiotherapy exercises.",
                "1. Tab Hydroxychloroquine 200mg OD\n2. Tab Paracetamol 650mg BD for pain relief\n3. Continue Tab Amlodipine 5mg OD\n4. Physical therapy referral for knee strengthening",
                (now + timedelta(days=14)).strftime("%Y-%m-%d"), "Active",
                None, None, now_str, now_str
            ),
            (
                "CASE-2026-503", "PAT-2026-1003", 2, "Dr. Rajesh Kulkarni, MD",
                "Retrosternal chest heaviness on climbing stairs, relieved with rest",
                "Exertional dyspnea (NYHA Class II), occasional diaphoresis",
                "Type 2 Diabetes Mellitus (12 yrs), CAD s/p PTCA with stent in LAD (2022)",
                "Aspirin (triggers severe gastric erosion/bleeding)",
                "Metformin 1000mg BD, Clopidogrel 75mg OD, Atorvastatin 40mg HS, Telmisartan 40mg OD",
                "Stable Angina Pectoris; Type 2 Diabetes; Status post-PCI LAD",
                "Vitals: BP 136/84 mmHg, HR 74 bpm. ECG shows sinus rhythm, T-wave inversion in V4-V6. Advised Stress Echo and HbA1c review.",
                "1. Tab Clopidogrel 75mg OD (Aspirin strictly avoided)\n2. Tab Metoprolol Succinate 25mg OD\n3. Tab Atorvastatin 40mg HS\n4. Sorbitrate 5mg sublingual PRN for acute chest pain\n5. Follow-up after Stress Echo",
                (now + timedelta(days=7)).strftime("%Y-%m-%d"), "Active",
                None, None, now_str, now_str
            )
        ]
        cursor.executemany("""
        INSERT INTO cases (case_id, patient_id, doctor_id, doctor_name, chief_complaint, symptoms, medical_history, allergies, current_medications, diagnosis, doctor_notes, treatment_plan, follow_up_date, status, discharge_summary, discharge_approved_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, cases)

    # 4. Seed Timeline Events for Patient Journey
    if cursor.execute("SELECT COUNT(*) FROM timeline_events").fetchone()[0] == 0:
        timeline = [
            ("CASE-2026-501", "PAT-2026-1001", "Visit", "Initial Presentation - Emergency OPD", "Presented with severe cough, breathlessness, and fever 101.8°F.", "Dr. Rajesh Kulkarni, MD", (now - timedelta(days=3)).strftime("%Y-%m-%d 10:15:00"), now_str),
            ("CASE-2026-501", "PAT-2026-1001", "Diagnosis", "Acute Asthma Exacerbation Diagnosed", "Bilateral expiratory wheezing confirmed on auscultation. Allergy to Penicillin flagged.", "Dr. Rajesh Kulkarni, MD", (now - timedelta(days=3)).strftime("%Y-%m-%d 10:45:00"), now_str),
            ("CASE-2026-501", "PAT-2026-1001", "Tests", "Diagnostic Tests Ordered", "CBC blood report, Serum IgE, and Chest X-Ray PA View ordered.", "Dr. Rajesh Kulkarni, MD", (now - timedelta(days=3)).strftime("%Y-%m-%d 11:00:00"), now_str),
            ("CASE-2026-501", "PAT-2026-1001", "Results", "CBC & Imaging Lab Results Available", "Elevated WBC (13,500/mcL), Hemoglobin 10.2 g/dL (mild anemia), Platelets normal (240k). Chest X-ray clear of consolidation.", "Dr. Ananya Iyer, DNB", (now - timedelta(days=2)).strftime("%Y-%m-%d 15:30:00"), now_str),
            ("CASE-2026-501", "PAT-2026-1001", "Treatment", "Inhaler & Antibiotic Protocol Initiated", "Started on Foracort 200, Azithromycin 500mg, Paracetamol 650mg. Nebulization given.", "Sister Deepa Nair", (now - timedelta(days=2)).strftime("%Y-%m-%d 16:00:00"), now_str),
            ("CASE-2026-501", "PAT-2026-1001", "Follow-up", "Follow-up Scheduled for Day 5", "Assessment of symptom control, peak expiratory flow (PEFR), and antibiotic completion.", "Dr. Rajesh Kulkarni, MD", (now + timedelta(days=5)).strftime("%Y-%m-%d 10:00:00"), now_str),

            ("CASE-2026-502", "PAT-2026-1002", "Visit", "Rheumatology Consultation", "Evaluation of bilateral joint pain and morning stiffness.", "Dr. Rajesh Kulkarni, MD", (now - timedelta(days=6)).strftime("%Y-%m-%d 11:30:00"), now_str),
            ("CASE-2026-502", "PAT-2026-1002", "Tests", "Autoimmune Panel Ordered", "RA Factor, Anti-CCP, ESR, Serum Uric Acid requested.", "Dr. Rajesh Kulkarni, MD", (now - timedelta(days=6)).strftime("%Y-%m-%d 12:00:00"), now_str),
            ("CASE-2026-502", "PAT-2026-1002", "Treatment", "DMARD Therapy Initiated", "Started Hydroxychloroquine 200mg OD with eye baseline check.", "Dr. Rajesh Kulkarni, MD", (now - timedelta(days=5)).strftime("%Y-%m-%d 14:00:00"), now_str),
        ]
        cursor.executemany("""
        INSERT INTO timeline_events (case_id, patient_id, event_type, event_title, event_description, doctor_name, event_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, timeline)

    # 5. Seed Medical Reports (Blood Report with parsed parameters)
    if cursor.execute("SELECT COUNT(*) FROM reports").fetchone()[0] == 0:
        parsed_cbc = json.dumps({
            "Hemoglobin": {"value": 10.2, "unit": "g/dL", "status": "Low", "range": "13.0 - 17.0"},
            "WBC Count": {"value": 13500, "unit": "cells/mcL", "status": "High", "range": "4,500 - 11,000"},
            "Platelet Count": {"value": 240000, "unit": "cells/mcL", "status": "Normal", "range": "150,000 - 450,000"},
            "Neutrophils": {"value": 78, "unit": "%", "status": "High", "range": "40 - 70"},
            "Lymphocytes": {"value": 18, "unit": "%", "status": "Low", "range": "20 - 40"},
            "ESR": {"value": 34, "unit": "mm/hr", "status": "High", "range": "0 - 15"}
        })

        parsed_ecg = json.dumps({
            "Heart Rate": {"value": 74, "unit": "bpm", "status": "Normal", "range": "60 - 100"},
            "PR Interval": {"value": 160, "unit": "ms", "status": "Normal", "range": "120 - 200"},
            "QRS Duration": {"value": 90, "unit": "ms", "status": "Normal", "range": "80 - 120"},
            "Findings": {"value": "T-wave inversion V4-V6", "unit": "", "status": "Abnormal", "range": "Normal ST-T"}
        })

        reports = [
            (
                "PAT-2026-1001", "CASE-2026-501", "Blood Report", "CBC_Differential_Aarnav.pdf",
                "/uploads/cbc_aarnav.pdf", "Suburban Diagnostics Lab", parsed_cbc,
                "Complete Blood Count indicates moderate leukocytosis (WBC 13,500) consistent with acute infection. Mild normocytic anemia (Hb 10.2). Platelets normal.",
                "Analyzed", (now - timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S")
            ),
            (
                "PAT-2026-1001", "CASE-2026-501", "X-ray", "Chest_XRay_PA_Aarnav.png",
                "/uploads/cxr_aarnav.png", "Lilavati Radiology", "{}",
                "Chest X-Ray PA View: Hyperinflated lung fields consistent with bronchial asthma. No evidence of focal consolidation, pleural effusion, or pneumothorax.",
                "Analyzed", (now - timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S")
            ),
            (
                "PAT-2026-1003", "CASE-2026-503", "ECG", "ECG_12Lead_Ramesh.pdf",
                "/uploads/ecg_ramesh.pdf", "Apex Heart Centre", parsed_ecg,
                "12-Lead Electrocardiogram demonstrates sinus rhythm at 74 bpm with symmetric T-wave inversions across anterolateral leads V4-V6. Correlate with clinical angina.",
                "Analyzed", (now - timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
            )
        ]
        cursor.executemany("""
        INSERT INTO reports (patient_id, case_id, report_type, file_name, file_url, uploaded_by, parsed_data, summary, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, reports)

    # 6. Seed Appointments & Follow-up Intelligence
    if cursor.execute("SELECT COUNT(*) FROM appointments").fetchone()[0] == 0:
        appointments = [
            (
                "PAT-2026-1001", "Aarnav Sharma", 2, "Dr. Rajesh Kulkarni, MD",
                (now + timedelta(days=2)).strftime("%Y-%m-%d"), "10:30 AM",
                "Asthma Inhaler Review & Cough Follow-up", "Scheduled", "Follow-up Due",
                "Evaluate breathlessness response to Foracort and finish antibiotic course.", 0, now_str
            ),
            (
                "PAT-2026-1002", "Priya Patel", 2, "Dr. Rajesh Kulkarni, MD",
                today_str, "11:15 AM",
                "Joint pain assessment and RA factor results review", "Scheduled", "Treatment Started",
                "Patient reported morning stiffness improvement with HCQ.", 0, now_str
            ),
            (
                "PAT-2026-1003", "Ramesh Verma", 2, "Dr. Rajesh Kulkarni, MD",
                (now - timedelta(days=1)).strftime("%Y-%m-%d"), "04:00 PM",
                "Cardiac Angina follow-up & Stress Test scheduling", "Missed", "Staff Escalated",
                "Patient did not arrive for scheduled slot. SMS reminder triggered. Follow-up coordinator alerted to call patient.", 1, (now - timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S")
            ),
            (
                "PAT-2026-1004", "Meera Nair", 3, "Dr. Ananya Iyer, DNB",
                today_str, "02:30 PM",
                "Migraine prophylactic therapy review", "Scheduled", "Follow-up Due",
                "Check headache log and sleep hygiene routine.", 0, now_str
            )
        ]
        cursor.executemany("""
        INSERT INTO appointments (patient_id, patient_name, doctor_id, doctor_name, appointment_date, appointment_time, reason, status, follow_up_status, notes, reminder_sent, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, appointments)

    # 7. Seed Consent Records (ABDM / DPDP compliance)
    if cursor.execute("SELECT COUNT(*) FROM consent_records").fetchone()[0] == 0:
        consents = [
            ("PAT-2026-1001", "Direct Clinical Care", "Access to medical history for outpatient diagnosis and prescribing", "Active", today_str, "2027-12-31"),
            ("PAT-2026-1001", "Emergency Access", "Permit scanned QR display of blood group and life-saving allergies", "Active", today_str, "2027-12-31"),
            ("PAT-2026-1001", "Hospital-to-Hospital Transfer", "Secure FHIR interoperability export to external tertiary referral care", "Active", today_str, "2027-12-31"),
            ("PAT-2026-1002", "Direct Clinical Care", "Access to rheumatology consultation and diagnostic reports", "Active", today_str, "2027-12-31"),
            ("PAT-2026-1003", "Direct Clinical Care", "Cardiology ongoing management and emergency cardiac care", "Active", today_str, "2027-12-31"),
        ]
        cursor.executemany("""
        INSERT INTO consent_records (patient_id, consent_type, purpose, status, granted_date, valid_until)
        VALUES (?, ?, ?, ?, ?, ?)
        """, consents)

    # 8. Seed Audit Logs
    if cursor.execute("SELECT COUNT(*) FROM audit_logs").fetchone()[0] == 0:
        audit = [
            (2, "dr_kulkarni", "doctor", "VIEW_CASE", "PAT-2026-1001", "CASE-2026-501", "Doctor viewed complete case record and medical timeline", "192.168.1.42", (now - timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S")),
            (2, "dr_kulkarni", "doctor", "AI_SUMMARY_GENERATED", "PAT-2026-1001", "CASE-2026-501", "AI Case Synthesis requested for clinical undertaking", "192.168.1.42", (now - timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S")),
            (4, "nurse_deepa", "nurse", "UPDATE_VITALS", "PAT-2026-1001", "CASE-2026-501", "Logged SpO2 96%, Pulse 84 bpm, Temp 101.8°F", "192.168.1.55", (now - timedelta(hours=3)).strftime("%Y-%m-%d %H:%M:%S")),
        ]
        cursor.executemany("""
        INSERT INTO audit_logs (user_id, username, role, action, patient_id, resource, details, ip_address, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, audit)

    # 9. Seed Nearby Pharmacies / Medical Stores (Indian Pharmacies with phone numbers)
    if cursor.execute("SELECT COUNT(*) FROM pharmacies").fetchone()[0] == 0:
        pharmacies = [
            (
                "Apollo Pharmacy 24x7", "Shop 4, Ground Floor, Sai Plaza, Dadar West, Mumbai", 0.4,
                "+91 98201 11222", "+91 22 2430 8899", "Open 24 Hours", 1, 4.8,
                "Salbutamol Inhalers, Foracort 200, Paracetamol 650, Azithromycin, Insulin Glargine, ORS, Deriphyllin",
                "In Stock (All Emergency Meds)"
            ),
            (
                "MedPlus Medical & Surgical", "Shop 12, Shivaji Park Road No 3, Dadar, Mumbai", 0.8,
                "+91 98202 33445", "+91 22 2445 6677", "8:00 AM - 11:30 PM", 0, 4.6,
                "Montelukast 10mg, Azithromycin 500mg, Paracetamol 650mg, Amlodipine 5mg, HCQ 200mg, Nebulizer Masks",
                "In Stock"
            ),
            (
                "Wellness Forever Chemist & Superstore", "Opp. Plaza Cinema, Tilak Bridge, Dadar West, Mumbai", 1.1,
                "+91 98203 55667", "+91 22 2437 1212", "Open 24 Hours", 1, 4.9,
                "Emergency Oxygen Cans, Ventolin Inhalers, Budecort Respules, Sorbitrate 5mg, Clopidogrel 75mg, Ice Packs",
                "In Stock (24x7 Delivery Available)"
            ),
            (
                "Noble Chemist & Druggist", "Shop 2, Ruby Commercial Centre, Senapati Bapat Marg, Dadar, Mumbai", 1.5,
                "+91 98204 77889", "+91 22 2422 4343", "7:30 AM - 11:00 PM", 0, 4.4,
                "Antibiotics, Inhalers, Pain Relievers, Cardiac Emergency Kit, Anti-allergy syrups",
                "In Stock"
            ),
            (
                "Jan Aushadhi Kendra (Govt Generic Meds)", "Near Railway Station West, Dadar, Mumbai", 0.6,
                "+91 98205 99001", "+91 22 2411 9000", "9:00 AM - 9:00 PM", 0, 4.7,
                "Generic Paracetamol, Generic Azithromycin, Generic Metformin, Generic Amlodipine, Generic Montelukast",
                "High Stock (Subsidized Rates)"
            )
        ]
        cursor.executemany("""
        INSERT INTO pharmacies (name, address, distance_km, phone, emergency_phone, open_hours, is_24_hours, rating, emergency_medicines, stock_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, pharmacies)

    # 10. Seed Villages Registry (Rural Public Health Clusters)
    if cursor.execute("SELECT COUNT(*) FROM villages").fetchone()[0] == 0:
        seed_villages = [
            (
                "VIL-MH-101", "Shivaji Nagar (Raigad)", "Raigad", "Alibag",
                "Shivaji Nagar Gram Panchayat", "Alibag Sub-Centre PHC", "Asha Worker Suman Kadam (+91 98205 11223)",
                1250, "Piped & Community Borewell", 88.5, now_str
            ),
            (
                "VIL-MH-102", "Khandala Khurd", "Pune", "Maval",
                "Khandala Gram Panchayat", "Khandala Primary Health Centre", "Asha Worker Meena Patil (+91 98211 44332)",
                980, "Gramin Jal Mission Piped", 92.0, now_str
            ),
            (
                "VIL-MH-103", "Kusgaon Wadi", "Raigad", "Pen",
                "Kusgaon Gram Panchayat", "Pen Rural Sub-Centre", "Asha Worker Sunita Gaikwad (+91 98333 22110)",
                740, "Protected Well & Tanker", 78.0, now_str
            )
        ]
        cursor.executemany("""
        INSERT INTO villages (village_id, village_name, district, taluka, gram_panchayat, phc_subcentre, asha_worker_name, target_population, water_supply_type, sanitation_coverage_percent, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, seed_villages)

    # 10b. Seed Rural Community Households (Family Health Graph)
    if cursor.execute("SELECT COUNT(*) FROM households").fetchone()[0] == 0:
        households = [
            ("HH-RAIGAD-101", "VIL-MH-101", "Shivaji Nagar (Raigad)", "Ramesh Sharma", "+91 98765 43210", "House 14, Main Gaon Road", "BPL", "Handpump & Tap", 1, 0, now_str),
            ("HH-RAIGAD-102", "VIL-MH-101", "Shivaji Nagar (Raigad)", "Tukaram Jadhav", "+91 98205 11223", "House 22, Mandir Galli", "AAY", "Community Well", 0, 1, now_str),
            ("HH-RAIGAD-103", "VIL-MH-101", "Shivaji Nagar (Raigad)", "Baburao Shinde", "+91 98333 77889", "House 07, Zilla Parishad School Road", "BPL", "Piped Water", 1, 1, now_str),
        ]
        cursor.executemany("""
        INSERT INTO households (household_id, village_id, village_name, head_name, phone, address, ration_card_type, water_source, sanitation_toilet, high_risk_flag, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, households)

    # Link existing households without village_id to default village
    cursor.execute("UPDATE households SET village_id = 'VIL-MH-101' WHERE village_id IS NULL OR village_id = ''")

    # 11. Seed Family Members Hierarchy
    if cursor.execute("SELECT COUNT(*) FROM family_members").fetchone()[0] == 0:
        family = [
            # Household 101 (Sharma family)
            ("HH-RAIGAD-101", None, "Ramlal Sharma", 72, "Male", "Grandparent", "Complete", 0, "Arthritis, Mild HTN", 0),
            ("HH-RAIGAD-101", None, "Ramesh Sharma", 48, "Male", "Father", "Complete", 0, "None", 0),
            ("HH-RAIGAD-101", None, "Sunita Sharma", 44, "Female", "Mother", "Complete", 0, "Anemia", 0),
            ("HH-RAIGAD-101", "PAT-2026-1001", "Aarnav Sharma", 24, "Male", "Child", "Complete", 0, "Bronchial Asthma", 1),

            # Household 102 (Jadhav family - High Risk Maternal & Child)
            ("HH-RAIGAD-102", None, "Tukaram Jadhav", 30, "Male", "Father", "Complete", 0, "None", 0),
            ("HH-RAIGAD-102", None, "Savitri Jadhav", 26, "Female", "Mother", "Pending", 1, "Pregnancy 3rd Trimester (High Risk ANC)", 1),
            ("HH-RAIGAD-102", None, "Aarav Jadhav", 2, "Male", "Child", "Overdue", 0, "Underweight (SAM screening due)", 1),

            # Household 103 (Shinde family - Senior High Risk)
            ("HH-RAIGAD-103", None, "Baburao Shinde", 52, "Male", "Father", "Complete", 0, "Type 2 Diabetes", 0),
            ("HH-RAIGAD-103", None, "Shantabai Shinde", 68, "Female", "Grandparent", "Complete", 0, "Severe Hypertension (BP 160/100)", 1),
            ("HH-RAIGAD-103", None, "Pooja Shinde", 19, "Female", "Child", "Complete", 0, "Severe Anemia (Hb 8.2)", 1),
        ]
        cursor.executemany("""
        INSERT INTO family_members (household_id, patient_id, name, age, gender, relation, immunization_status, is_pregnant_anc, chronic_condition, high_priority)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, family)

    # 12. Seed Longitudinal Health Trends (BP, Weight, Blood Glucose)
    if cursor.execute("SELECT COUNT(*) FROM vital_trends").fetchone()[0] == 0:
        trends = [
            # Aarnav Sharma (PAT-2026-1001)
            ("PAT-2026-1001", "Jan 2026", 138, 88, 76.5, 128, "2026-01-15"),
            ("PAT-2026-1001", "Feb 2026", 132, 85, 75.2, 120, "2026-02-14"),
            ("PAT-2026-1001", "Mar 2026", 126, 82, 74.0, 112, "2026-03-12"),
            ("PAT-2026-1001", "Apr 2026", 120, 80, 73.2, 105, "2026-04-05"),

            # Ramesh Verma (PAT-2026-1003)
            ("PAT-2026-1003", "Jan 2026", 154, 96, 84.0, 178, "2026-01-10"),
            ("PAT-2026-1003", "Feb 2026", 146, 92, 82.5, 162, "2026-02-12"),
            ("PAT-2026-1003", "Mar 2026", 140, 88, 81.0, 148, "2026-03-15"),
            ("PAT-2026-1003", "Apr 2026", 134, 84, 79.8, 136, "2026-04-02"),
        ]
        cursor.executemany("""
        INSERT INTO vital_trends (patient_id, month_label, systolic_bp, diastolic_bp, weight_kg, fasting_glucose, recorded_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, trends)

    # 13. Seed SMS & Keypad Call Logs
    if cursor.execute("SELECT COUNT(*) FROM sms_call_logs").fetchone()[0] == 0:
        sms_logs = [
            ("+91 98765 43210", "Aarnav Sharma", "SMS", "दवा स्मरण: रात 8 बजे Foracort इन्हेलर और पेरासिटामोल लें। पानी ज्यादा पिएं। - प्राथमिक स्वास्थ्य केंद्र", "hi", "Delivered", now_str),
            ("+91 98211 54321", "Priya Patel", "SMS", "आरोग्य सूचना: तुमची HCQ 200mg गोळी जेवणानंतर घ्या. पुढील तपासणी 5 दिवसांत. - आशा सेविका", "mr", "Delivered", now_str),
            ("+91 98333 77889", "Ramesh Verma", "VOICE_CALL", "Automated Voice: Aapki heart dawa Clopidogrel lene ka samay ho gaya hai. Kripya dawai lein.", "hi", "Delivered", now_str),
            ("+91 98205 11223", "Savitri Jadhav", "SMS", "मातृ सुरक्षा: उद्या सकाळी अंगणवाडी केंद्रात गरोदर तपासणी (ANC) व पोषण आहार वाटप आहे.", "mr", "Delivered", now_str)
        ]
        cursor.executemany("""
        INSERT INTO sms_call_logs (phone_number, patient_name, message_type, content, language, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, sms_logs)

    # 14. Seed Hospital Facilities Registry
    if cursor.execute("SELECT COUNT(*) FROM hospital_facilities").fetchone()[0] == 0:
        facilities = [
            (
                "HOSP-MH-RAIGAD-01", "Raigad Sub-District Hospital & Primary Health Centre",
                "ROHINI-MH-89210", "CEA-REG-MH-4401", "Sub-District Hospital (SDH) & 24x7 Emergency",
                120, 94, 12, 8, "Optimal (98% Cryogenic Purity)", "Dr. V. P. Deshmukh, Civil Surgeon",
                "XXXX-XXXX-9901", 1, now_str
            )
        ]
        cursor.executemany("""
        INSERT INTO hospital_facilities (facility_id, name, rohini_id, cea_number, facility_type, total_beds, occupied_beds, icu_beds_total, icu_beds_occupied, oxygen_plant_status, nodal_officer, nodal_aadhaar_masked, is_verified, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, facilities)

    # 15. Seed Hospital Inpatient Admissions
    if cursor.execute("SELECT COUNT(*) FROM hospital_admissions").fetchone()[0] == 0:
        admissions = [
            ("ADM-2026-101", "PAT-2026-1001", "Aarnav Sharma", 24, "Male", "Emergency ICU", "ICU-03", "Dr. Ananya Iyer, DNB", "Acute Asthma Exacerbation with Hypoxemia", "Red", (now - timedelta(days=2)).strftime("%Y-%m-%d %H:%M"), "Admitted"),
            ("ADM-2026-102", "PAT-2026-1003", "Ramesh Verma", 62, "Male", "General Ward", "GW-14", "Dr. Rajesh Kulkarni, MD", "Unstable Angina Pectoris s/p PCI", "Amber", (now - timedelta(days=1)).strftime("%Y-%m-%d %H:%M"), "Admitted"),
            ("ADM-2026-103", "PAT-2026-1002", "Priya Patel", 38, "Female", "General Ward", "GW-08", "Dr. Rajesh Kulkarni, MD", "Severe Inflammatory Arthritis flare-up", "Green", (now - timedelta(days=3)).strftime("%Y-%m-%d %H:%M"), "Discharged"),
            ("ADM-2026-104", "PAT-2026-1006", "Savitri Jadhav", 26, "Female", "Maternity Ward", "MAT-04", "Dr. Rajesh Kulkarni, MD", "High-Risk Pregnancy 36 Weeks (Severe Anemia)", "Red", now.strftime("%Y-%m-%d %H:%M"), "Admitted"),
        ]
        cursor.executemany("""
        INSERT INTO hospital_admissions (admission_id, patient_id, patient_name, age, gender, ward_type, bed_number, admitting_doctor, diagnosis, triage_level, admission_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, admissions)

    # 16. Seed Rural Outreach Camps
    if cursor.execute("SELECT COUNT(*) FROM rural_outreach_camps").fetchone()[0] == 0:
        camps = [
            ("Shivaji Nagar Health Mela", "Shivaji Nagar (Raigad)", (now + timedelta(days=2)).strftime("%Y-%m-%d"), "Dr. Rajesh Kulkarni, MD", "Maternal ANC Checkup, Pediatric Immunization, Blood Pressure & Sugar Screening", "Scheduled"),
            ("Tribal Hamlet Mobile Van Camp", "Kusgaon Wadi", (now + timedelta(days=5)).strftime("%Y-%m-%d"), "Dr. Ananya Iyer, DNB", "Respiratory Illness & Asthma Screening, Free Inhaler Distribution, Waterborne Disease Check", "Scheduled"),
            ("Senior Citizen Non-Communicable Disease Drive", "Pen Gaon Rural PHC", (now + timedelta(days=8)).strftime("%Y-%m-%d"), "Dr. Rajesh Kulkarni, MD", "ECG screening, Diabetic Foot exam, Cataract referrals", "Scheduled"),
        ]
        cursor.executemany("""
        INSERT INTO rural_outreach_camps (camp_name, village_name, scheduled_date, team_lead_doctor, target_services, status)
        VALUES (?, ?, ?, ?, ?, ?)
        """, camps)

    conn.commit()

if __name__ == "__main__":
    init_db()
    print("Database schema created and seed data initialized successfully.")
