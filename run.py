"""
Sanjeevani - Patient Case Undertaking & Clinical Management Software
Startup Server Runner
"""

import sys
import os

# Fix Windows console UTF-8 encoding
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Ensure project root is in python path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.database import init_db
import uvicorn

def main():
    print("=" * 75)
    print("  [+] SANJEEVANI - PATIENT CASE UNDERTAKING & CLINICAL SYSTEM [+]")
    print("=" * 75)
    print("  Initializing SQLite Database & Seeding Indian Clinical Cases...")
    init_db()
    print("  [OK] Database ready with verified Doctor, Nurse, Admin, and Patient accounts.")
    print("  [OK] Clinical Intelligence, Offline IndexedDB Vault, and DPDP/ABDM Engine loaded.")
    print("-" * 75)
    print("  Local Laptop URL:    http://127.0.0.1:8000")
    print("  Phone (Wi-Fi) URL:   http://192.168.29.82:8000")
    print("  Interactive API Docs: http://127.0.0.1:8000/docs")
    print("-" * 75)
    print("  Default Demo Credentials:")
    print("  * Doctor:       username: dr_kulkarni    password: doctor123  (NMC Verified)")
    print("  * Nurse:        username: nurse_deepa    password: nurse123")
    print("  * Receptionist: username: reception_amit password: recep123")
    print("  * Admin:        username: admin          password: admin123")
    print("  * Patient:      username: patient_aarnav password: patient123")
    print("=" * 75)

    # Start Uvicorn Server on 0.0.0.0 so phone on same Wi-Fi can connect
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)

if __name__ == "__main__":
    main()
