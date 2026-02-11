@echo off
REM Simple tunnel starter - Shows URL clearly
title Ollama Cloudflare Tunnel

echo ================================================
echo   Ollama Cloudflare Tunnel
echo ================================================
echo.

REM Check if cloudflared exists
if not exist "C:\cloudflared.exe" (
    echo [ERROR] cloudflared.exe not found!
    echo.
    echo Please run setup-cloudflare-tunnel.ps1 first
    echo.
    pause
    exit
)

REM Check if Ollama is running
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I /N "ollama.exe">NUL
if "%ERRORLEVEL%"=="1" (
    echo [!] Ollama is not running. Starting Ollama...
    start /B ollama serve
    timeout /t 3 /nobreak >nul
    echo [OK] Ollama started
    echo.
)

echo [OK] Starting Cloudflared Tunnel...
echo.
echo ================================================
echo   LOOK FOR THE URL BELOW!
echo   It will appear in a few seconds...
echo ================================================
echo.

REM Start tunnel
C:\cloudflared.exe tunnel --url http://localhost:11434

echo.
echo ================================================
echo   Tunnel stopped
echo ================================================
pause
