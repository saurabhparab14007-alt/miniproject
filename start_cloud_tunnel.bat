@echo off
title Sanjeevani Healthcare - Cloudflare Public Tunnel
cd /d "C:\Users\Santosh Parab\Desktop\miniproject"
echo ======================================================================
echo   SANJEEVANI HEALTHCARE PLATFORM - PUBLIC REMOTE ACCESS TUNNEL
echo   Enables access on phone without same Wi-Fi (Mobile 4G/5G anywhere)
echo ======================================================================
echo.
echo Ensuring backend server is running on port 8000...
netstat -ano | findstr :8000 >nul
if errorlevel 1 (
    echo Starting Sanjeevani backend server...
    start "" /b python run.py
    timeout /t 3 /nobreak >nul
)
echo.
echo Starting secure HTTPS tunnel...
echo Share the generated https://...trycloudflare.com link with your phones.
echo.
python run_tunnel.py
pause
