@echo off
REM Quick start script for Cloudflare Tunnel
REM Double-click this file to start the tunnel

echo ================================================
echo   Starting Cloudflare Tunnel for Ollama
echo ================================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running as Administrator
    echo.
    powershell.exe -ExecutionPolicy Bypass -File "%~dp0setup-cloudflare-tunnel.ps1"
) else (
    echo [!] Need Administrator privileges
    echo.
    echo Restarting with Administrator privileges...
    echo.
    powershell.exe -Command "Start-Process '%~f0' -Verb RunAs"
    exit
)

pause
