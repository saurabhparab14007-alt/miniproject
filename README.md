# 🩺 Sanjeevani (संजीवनी)
### Rural Health & Clinical Case Undertaking Platform

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline--First-orange.svg)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![DPDP Act 2023](https://img.shields.io/badge/Compliance-DPDP%20%26%20ABDM-green.svg)](https://www.meity.gov.in)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Sanjeevani** is an ABDM-aligned, DPDP Act 2023 compliant, offline-first clinical case undertaking and healthcare delivery platform tailored for rural primary health centres (PHCs), sub-district hospitals, credentialed clinicians, frontline ASHA workers, and rural patients.

---

## 🌟 Key Capabilities

### 🩺 1. Doctor Clinical Case Undertaking Portal
- **Case Undertaking Engine**: Longitudinal medical history, chief complaints, symptoms, physical examination, and ICD-aligned diagnosis.
- **4-Tier Clinical Risk Triage**: Real-time risk categorization (**GREEN**, **YELLOW**, **ORANGE**, **RED**) based on vitals, shock index, and clinical flags.
- **Doctor Voice-to-Case**: On-device speech recognition & NLP extraction of complaints, symptoms, and prescriptions directly into case files.
- **Lab Report OCR & Biomarker Analyzer**: Scans lab PDFs and images to extract biomarkers (Hemoglobin, WBC, Platelets, Blood Sugar, Serum Creatinine) with normal reference ranges.
- **Structured Shift Handover**: Generates ISBAR-formatted clinical briefs for incoming medical teams.

### 👤 2. Patient Digital Health File
- **ABHA / National Health Profile**: Verhoeff-validated ABHA identity and masked Aadhaar storage.
- **Multilingual Dosage Timetable**: Audio-visual medication schedules with customizable morning, afternoon, and night reminder slots.
- **Emergency QR Medical Profile**: Instant first-responder access to blood group, critical drug allergies (e.g., Penicillin anaphylaxis), and emergency contacts without unlocking phone.
- **Longitudinal Vitals Trends**: Interactive monitoring of Blood Pressure, Heart Rate, SpO2, Temperature, and Blood Glucose.

### 🏥 3. Hospital & Facility Operations
- **Real-Time Bed Availability**: Visual ward-by-ward bed tracker (ICU, General Medical, Maternity & Pediatric).
- **Oxygen & ICU Monitoring**: Real-time cryogenic oxygen plant purity and supply tracking.
- **Inter-Facility Case Transfers**: FHIR-compatible digital transfer workflows between rural PHCs and sub-district trauma facilities.
- **Staff Rostering & Camp Outreach**: Organization of rural maternal health and hypertension screening camps.

### 👩‍⚕️ 4. Rural ASHA Worker Community Care
- **Household Epidemiology Census**: Village-level demographic monitoring, sanitation coverage, and drinking water source tracking.
- **Maternal & Child Health**: Antenatal care (ANC) trimester visits and high-risk pregnancy tracking.
- **Immunization Schedules**: Tracking of infant and child vaccine milestones (BCG, OPV, Pentavalent, Rotavirus, DPT).
- **Household Family Graphs**: Visual relationship mapping for multi-generational village households.

### 📱 5. 2G Keypad Phone SMS & IVR Simulator
- **Feature Phone Inclusion**: Delivers medicine reminders, follow-up alerts, and health advisories over standard GSM SMS and IVR voice calls without requiring an internet connection or smartphone.
- **Interactive Simulator**: Embedded live 2G keypad phone handset simulator for testing real-time SMS dispatch.

### 📴 6. Resilient Rural Offline Mode (Service Worker v8 + IndexedDB Vault)
- **100% Offline Capability**: When laptops are powered off or rural connectivity drops, the client automatically switches to on-device IndexedDB caching.
- **Background Synchronization**: Offline patient registrations, consultation notes, and prescriptions automatically sync back to the central server when connectivity resumes.

---

## 🏗️ Architecture & Technology Stack

```
sanjeevani/
├── backend/
│   ├── routes/              # FastAPI modular REST endpoints
│   │   ├── auth.py          # Verified DPDP & NMC login/signup
│   │   ├── patients.py      # Patient demographic & health record APIs
│   │   ├── cases.py         # Clinical undertakings & AI voice parse
│   │   ├── hospital.py      # Bed tracking & facility management
│   │   ├── rural_health.py  # Village census & ASHA outreach
│   │   └── sms_calls.py     # 2G Keypad SMS & IVR dispatcher
│   ├── database.py          # SQLite schema & automatic test case seeder
│   ├── models.py            # Pydantic schemas & data validation
│   ├── security.py          # PBKDF2 hashing, JWT tokens, Verhoeff Aadhaar
│   └── main.py              # Application entrypoint & static mounts
├── frontend/
│   ├── index.html           # Unified Healthcare Gateway & Workspace
│   ├── doctor_portal.html   # Dedicated doctor clinical suite
│   ├── patient_portal.html  # Patient digital health record
│   ├── hospital_portal.html # Hospital facility & bed management
│   ├── asha_worker.html     # Rural community healthcare portal
│   ├── keypad_simulator.html# 2G feature phone simulator
│   ├── styles.css           # Responsive mobile-first CSS design system
│   ├── sw.js                # Resilient Service Worker v8 (Offline Caching)
│   ├── manifest.json        # Progressive Web App (PWA) configuration
│   └── js/                  # ES6 modular controllers & components
├── run.py                   # High-performance Uvicorn startup runner
└── requirements.txt         # Python runtime dependencies
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python 3.10+**
- Git installed on your machine

### 2. Clone the Repository
```bash
git clone https://github.com/<your-username>/sanjeevani-healthcare.git
cd sanjeevani-healthcare
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Server
```bash
python run.py
```

Open your browser at **`http://localhost:8000`** (or `http://127.0.0.1:8000`).

---

## 🔑 Default Demo Credentials

For quick evaluation, pre-seeded accounts across all roles are ready for instant 1-tap testing:

| Role | Username | Password | Verification Status |
| :--- | :--- | :--- | :--- |
| 🩺 **Doctor** | `dr_kulkarni` | `doctor123` | NMC / MCI Verified Clinician |
| 👤 **Patient** | `patient_aarnav` | `patient123` | ABHA Health Profile Linked |
| 🏥 **Hospital** | `hospital_admin` | `hospital123` | ROHINI / CEA Verified Facility |
| 👩‍⚕️ **ASHA Worker** | `asha_sunita` | `asha123` | Accredited Community Health Activist |
| 📋 **Receptionist** | `reception_amit` | `recep123` | OPD Registration Desk |
| ⚡ **Admin** | `admin` | `admin123` | Full Audit & System Oversight |

---

## 📱 Mobile & PWA Installation

### iPhone & iPad (iOS Safari)
1. Open `http://<your-ip>:8000` or your HTTPS tunnel in **Safari**.
2. Tap the **Share** button (`[↑]`) at the bottom of the screen.
3. Select **Add to Home Screen** (`➕`).
4. Launches full-screen as a standalone native app with full offline support.

### Android (Google Chrome)
1. Open the URL in **Google Chrome**.
2. Tap the **"Install Sanjeevani"** prompt or select **Menu (`⋮`)** $\rightarrow$ **Install app**.
3. Alternatively, download the direct APK bundle from the portal.

---

## 🛡️ Privacy, DPDP & ABDM Compliance
- **Masked Aadhaar**: Aadhaar numbers are validated using the official **UIDAI Verhoeff algorithm** and stored strictly in masked format (`XXXX-XXXX-4819`).
- **NMC / Medical Council Verification**: Validates registration formats (NMC, MMC, KMC, etc.) for doctors.
- **Immutable Audit Logging**: Every view, modification, and clinical transaction is recorded in the `audit_logs` table with actor, role, timestamp, and IP address.
- **Explicit Consent Architecture**: Supports time-bounded consent records for clinical data undertaking and emergency first-responder access.

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
