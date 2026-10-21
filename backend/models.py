from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class UserLogin(BaseModel):
    username: str
    password: str

class UserSignup(BaseModel):
    username: str
    password: str
    role: str = "doctor" # doctor, admin, nurse, receptionist, patient
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    aadhaar_number: Optional[str] = None # 12 digits
    registration_number: Optional[str] = None # MCI / NMC / Hospital reg
    department: Optional[str] = "General Medicine"
    dob: Optional[str] = None
    gender: Optional[str] = "Male"
    # Optional patient-shared consultation data
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    chief_complaint: Optional[str] = None
    prescriptions: Optional[str] = None

class PatientPrescriptionShare(BaseModel):
    doctor_name: str
    hospital_name: Optional[str] = "Primary Health Centre"
    chief_complaint: Optional[str] = "Clinical Consultation"
    prescriptions: Optional[str] = None
    allergies: Optional[str] = "None reported"

class MedicationItem(BaseModel):
    name: str
    dosage: Optional[str] = "1 Dose"
    time_slot: Optional[str] = "Morning 8:00 AM (Post-Breakfast)"
    instructions: Optional[str] = "Take with water"

class PatientRegister(BaseModel):
    name: str
    dob: Optional[str] = "1995-05-15"
    age: Optional[int] = 30
    gender: Optional[str] = "Male"
    phone: str
    address: Optional[str] = "Village Resident Address"
    emergency_contact: Optional[str] = "Family Member"
    emergency_phone: Optional[str] = None
    blood_group: Optional[str] = "B+"
    insurance_provider: Optional[str] = None
    insurance_policy_no: Optional[str] = None
    abha_id: Optional[str] = None
    # Clinical Vitals Intake
    heart_rate: Optional[int] = 76
    systolic_bp: Optional[int] = 120
    diastolic_bp: Optional[int] = 80
    spo2: Optional[int] = 98
    temp_f: Optional[float] = 98.4
    fasting_glucose: Optional[int] = 100
    weight_kg: Optional[float] = 65.0
    # Clinical Diagnosis & Prescribed Medicines
    chief_complaint: Optional[str] = "Clinical undertaking & health evaluation"
    symptoms: Optional[str] = "Baseline evaluation"
    diagnosis: Optional[str] = "Primary Clinical Undertaking"
    allergies: Optional[str] = "No known drug allergies"
    doctor_notes: Optional[str] = ""
    treatment_plan: Optional[str] = ""
    prescriptions: Optional[str] = ""
    medications: Optional[List[MedicationItem]] = None
    send_sms: Optional[bool] = True
    # Clinical Vitals Intake
    heart_rate: Optional[int] = 76
    systolic_bp: Optional[int] = 120
    diastolic_bp: Optional[int] = 80
    spo2: Optional[int] = 98
    temp_f: Optional[float] = 98.4
    fasting_glucose: Optional[int] = 100
    weight_kg: Optional[float] = 65.0
    # Clinical Diagnosis & Prescribed Medicines
    chief_complaint: Optional[str] = "Clinical undertaking & health evaluation"
    symptoms: Optional[str] = "Baseline evaluation"
    diagnosis: Optional[str] = "Primary Clinical Undertaking"
    allergies: Optional[str] = "No known drug allergies"
    doctor_notes: Optional[str] = ""
    treatment_plan: Optional[str] = ""
    prescriptions: Optional[str] = ""
    medications: Optional[List[MedicationItem]] = None
    send_sms: Optional[bool] = True

class CaseCreate(BaseModel):
    patient_id: str
    doctor_name: str
    chief_complaint: str
    symptoms: str
    medical_history: Optional[str] = "None"
    allergies: Optional[str] = "No known allergies"
    current_medications: Optional[str] = "None"
    diagnosis: str
    doctor_notes: Optional[str] = ""
    treatment_plan: str
    follow_up_date: Optional[str] = None

class CaseUpdate(BaseModel):
    chief_complaint: Optional[str] = None
    symptoms: Optional[str] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None
    current_medications: Optional[str] = None
    diagnosis: Optional[str] = None
    doctor_notes: Optional[str] = None
    treatment_plan: Optional[str] = None
    follow_up_date: Optional[str] = None
    status: Optional[str] = None
    discharge_summary: Optional[str] = None
    discharge_approved_by: Optional[str] = None

class TimelineEventCreate(BaseModel):
    case_id: str
    patient_id: str
    event_type: str
    event_title: str
    event_description: str
    doctor_name: Optional[str] = ""
    event_date: str

class ReportAnalysisRequest(BaseModel):
    patient_id: str
    case_id: str
    report_type: str
    report_text: str
    file_name: Optional[str] = "Manual_Report_Entry.pdf"

class VoiceDictationRequest(BaseModel):
    spoken_text: str

class CaseQueryRequest(BaseModel):
    case_id: str
    patient_id: str
    query: str

class AppointmentCreate(BaseModel):
    patient_id: str
    patient_name: str
    doctor_name: str
    appointment_date: str
    appointment_time: str
    reason: str
    follow_up_status: Optional[str] = "Treatment Started"
    notes: Optional[str] = ""

class ConsentUpdate(BaseModel):
    consent_id: int
    status: str # Active or Revoked
