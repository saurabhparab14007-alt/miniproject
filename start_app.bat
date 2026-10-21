@echo off
cd /d "C:\Users\Santosh Parab\Desktop\miniproject"
netstat -ano | findstr :8000 >nul
if errorlevel 1 (
    start "" /b python run.py
    timeout /t 2 /nobreak >nul
)
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://127.0.0.1:8000/login
