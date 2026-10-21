@echo off
setlocal
set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"
title Sanjeevani - Push to GitHub
cd /d "%~dp0"
echo ======================================================================
echo   SANJEEVANI HEALTHCARE - PUSH TO GITHUB
echo ======================================================================
echo.
echo Make sure you have created an empty repository on https://github.com/new
echo.
set /p REPO_URL="Paste your GitHub Repo URL (e.g. https://github.com/username/sanjeevani.git): "
if "%REPO_URL%"=="" (
    echo [ERROR] No URL provided. Exiting.
    pause
    exit /b
)

git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main
echo.
echo Connecting to GitHub and pushing 'main' branch...
git push -u origin main

if errorlevel 1 (
    echo.
    echo [NOTICE] If GitHub asked for authentication, sign in via browser or
    echo use a GitHub Personal Access Token (PAT) as your password.
) else (
    echo.
    echo ======================================================================
    echo   [SUCCESS] Your code is live on GitHub!
    echo ======================================================================
)
echo.
pause
