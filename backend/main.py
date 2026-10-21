from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
import os
from datetime import datetime

from backend.database import init_db, get_db_connection
from backend.routes import (
    auth, patients, cases, reports, appointments,
    pharmacies, audit, rural_health, sms_calls, trends, transfer,
    hospital, patient_portal
)

app = FastAPI(
    title="Sanjeevani - Rural Health & Clinical Case Undertaking System",
    description="Multi-page clinical portal, ASHA rural community healthcare, Keypad Phone SMS engine, and DPDP-compliant case management.",
    version="3.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

# Register Routers
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(cases.router)
app.include_router(reports.router)
app.include_router(appointments.router)
app.include_router(pharmacies.router)
app.include_router(audit.router)
app.include_router(rural_health.router)
app.include_router(sms_calls.router)
app.include_router(trends.router)
app.include_router(transfer.router)
app.include_router(hospital.router)
app.include_router(patient_portal.router)

# Dashboard KPI stats endpoint
@app.get("/api/dashboard/stats")
def get_dashboard_kpis():
    conn = get_db_connection()
    cursor = conn.cursor()
    today_str = datetime.now().strftime("%Y-%m-%d")

    cursor.execute("SELECT COUNT(*) FROM patients")
    total_patients = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM cases WHERE status = 'Active'")
    active_cases = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM appointments WHERE appointment_date = ?", (today_str,))
    today_appointments = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM reports WHERE status = 'Pending' OR status = 'Analyzed'")
    total_reports = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM appointments WHERE follow_up_status IN ('Follow-up Due', 'Staff Escalated')")
    followups_due = cursor.fetchone()[0]

    cursor.execute("""
    SELECT c.case_id, c.patient_id, p.name as patient_name, p.age, p.gender, c.diagnosis, c.status, c.created_at
    FROM cases c
    JOIN patients p ON c.patient_id = p.patient_id
    ORDER BY c.id DESC LIMIT 5
    """)
    recent_cases = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return {
        "total_patients": total_patients,
        "active_cases": active_cases,
        "today_appointments": today_appointments,
        "total_reports": total_reports,
        "followups_due": followups_due,
        "recent_cases": recent_cases
    }

# Mount uploads directory
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Frontend multi-page routing
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    # Multi-page Dedicated Endpoints
    @app.get("/")
    @app.get("/login")
    def serve_login():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

    @app.get("/manifest.json")
    def serve_manifest():
        return FileResponse(os.path.join(FRONTEND_DIR, "manifest.json"), media_type="application/manifest+json")

    @app.get("/download/sanjeevani.apk")
    def download_sanjeevani_apk():
        apk_path = os.path.join(FRONTEND_DIR, "downloads", "sanjeevani.apk")
        if os.path.exists(apk_path):
            return FileResponse(
                apk_path,
                filename="Sanjeevani_Healthcare.apk",
                media_type="application/vnd.android.package-archive"
            )
        return {"error": "APK file not found"}

    @app.get("/download/sanjeevani_kiosk.apk")
    def download_sanjeevani_kiosk_apk():
        apk_path = os.path.join(FRONTEND_DIR, "downloads", "sanjeevani_kiosk.apk")
        if os.path.exists(apk_path):
            return FileResponse(
                apk_path,
                filename="Sanjeevani_Kiosk.apk",
                media_type="application/vnd.android.package-archive"
            )
        return {"error": "Kiosk APK file not found"}

    @app.api_route("/api/system/create-desktop-shortcut", methods=["GET", "POST"])
    def api_create_desktop_shortcut():
        import subprocess
        desktop_dir = os.path.join(os.path.expanduser("~"), "Desktop")
        project_dir = os.path.abspath(os.path.join(FRONTEND_DIR, ".."))
        ico_path = os.path.join(FRONTEND_DIR, "icons", "sanjeevani.ico")
        chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
        edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
        browser_exe = chrome_path if os.path.exists(chrome_path) else edge_path
        
        launcher_bat = os.path.join(project_dir, "start_app.bat")
        with open(launcher_bat, "w", encoding="utf-8") as f:
            f.write(f'''@echo off
cd /d "{project_dir}"
netstat -ano | findstr :8000 >nul
if errorlevel 1 (
    start "" /b python run.py
    timeout /t 2 /nobreak >nul
)
start "" "{browser_exe}" --app=http://127.0.0.1:8000/login
''')
        vbs_path = os.path.join(project_dir, "Sanjeevani.vbs")
        shortcut_path = os.path.join(desktop_dir, "Sanjeevani Healthcare.lnk")
        ps_cmd = f'''
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("{shortcut_path}")
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"{vbs_path}`""
$Shortcut.WorkingDirectory = "{project_dir}"
$Shortcut.IconLocation = "{ico_path},0"
$Shortcut.Description = "Sanjeevani - Rural Healthcare & Clinical Suite"
$Shortcut.WindowStyle = 7
$Shortcut.Save()
'''
        subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True)
        src_apk = os.path.join(FRONTEND_DIR, "downloads", "sanjeevani.apk")
        dst_apk = os.path.join(desktop_dir, "Sanjeevani_Healthcare.apk")
        if os.path.exists(src_apk):
            import shutil
            shutil.copy2(src_apk, dst_apk)
            
        return {
            "success": True,
            "message": "Sanjeevani Desktop App created successfully on your Desktop with official icon!",
            "desktop_shortcut": shortcut_path,
            "desktop_apk": dst_apk
        }

    @app.get("/api/system/network-info")
    def api_get_network_info():
        cloud_url = "https://vice-tones-bronze-wagon.trycloudflare.com"
        tunnel_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "tunnel_url.txt")
        if os.path.exists(tunnel_file):
            try:
                with open(tunnel_file, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if content.startswith("http"):
                        cloud_url = content
            except Exception:
                pass
        return {
            "wifi_url": "http://192.168.29.82:8000/login",
            "cloud_url": cloud_url,
            "ip": "192.168.29.82",
            "port": 8000
        }

    @app.get("/doctor")
    def serve_doctor_portal(standalone: bool = False):
        if not standalone:
            return RedirectResponse(url="/?portal=doctor")
        return FileResponse(os.path.join(FRONTEND_DIR, "doctor_portal.html"))

    @app.get("/asha")
    def serve_asha_portal(standalone: bool = False):
        if not standalone:
            return RedirectResponse(url="/?portal=asha")
        return FileResponse(os.path.join(FRONTEND_DIR, "asha_worker.html"))

    @app.get("/patient")
    def serve_patient_portal(standalone: bool = False):
        if not standalone:
            return RedirectResponse(url="/?portal=patient")
        return FileResponse(os.path.join(FRONTEND_DIR, "patient_portal.html"))

    @app.get("/village")
    def serve_village_dashboard(standalone: bool = False):
        if not standalone:
            return RedirectResponse(url="/?portal=village")
        return FileResponse(os.path.join(FRONTEND_DIR, "village_dashboard.html"))

    @app.get("/hospital")
    def serve_hospital_portal(standalone: bool = False):
        if not standalone:
            return RedirectResponse(url="/?portal=hospital")
        return FileResponse(os.path.join(FRONTEND_DIR, "hospital_portal.html"))

    @app.get("/keypad")
    def serve_keypad_sim(standalone: bool = False):
        if not standalone:
            return RedirectResponse(url="/?portal=keypad")
        return FileResponse(os.path.join(FRONTEND_DIR, "keypad_simulator.html"))

    @app.get("/{catchall:path}")
    def serve_static_or_spa(catchall: str):
        file_path = os.path.join(FRONTEND_DIR, catchall)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
