@echo off
title Sanjeevani Healthcare - High Speed Phone Access Tunnel
cd /d "C:\Users\Santosh Parab\Desktop\miniproject"
echo ======================================================================
echo   SANJEEVANI HEALTHCARE - IPHONE & ANDROID HIGH SPEED REMOTE TUNNEL
echo   Fixes Safari "Server Not Found" - Unblocked by Indian ISPs (Jio/Airtel)
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
echo Launching secure HTTPS tunnel for your phone...
echo Open the generated https://...lhr.life link in Safari on iPhone or Chrome on Android.
echo.
python run_tunnel_ssh.py
pause
