@echo off
setlocal
set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"
title Sanjeevani - Push to GitHub
cd /d "%~dp0"
echo ======================================================================
echo   SANJEEVANI HEALTHCARE - PUSH TO GITHUB
echo ======================================================================
echo.
echo Target Repository: https://github.com/saurabhparab14007-alt/miniproject.git
echo.
set "REPO_URL="
set /p REPO_URL="Press ENTER to push to this repo (or type a different URL): "
if "%REPO_URL%"=="" (
    set "REPO_URL=https://github.com/saurabhparab14007-alt/miniproject.git"
)

git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main
echo.
echo Connecting to GitHub and pushing 'main' branch...
echo (A browser window or GitHub sign-in prompt may appear. Click "Sign in" to authorize.)
echo.
git push -u origin main

if errorlevel 1 (
    echo.
    echo ======================================================================
    echo [NOTICE] Push encountered an issue.
    echo If prompted, sign in via browser or use a GitHub Personal Access Token.
    echo ======================================================================
) else (
    echo.
    echo ======================================================================
    echo   [SUCCESS] All files and APK successfully uploaded to GitHub!
    echo   View your repository at:
    echo   https://github.com/saurabhparab14007-alt/miniproject
    echo ======================================================================
)
echo.
pause
