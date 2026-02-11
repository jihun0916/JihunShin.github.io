@echo off
chcp 65001 >nul 2>&1
echo ============================================
echo   ngrok Setup for Ollama Remote Access
echo ============================================
echo.

REM Kill old tunnel processes
echo [1] Cleaning up old tunnel processes...
taskkill /F /IM ssh.exe 2>nul
taskkill /F /IM cloudflared.exe 2>nul
echo     Done.
echo.

REM Check/Download ngrok
echo [2] Checking ngrok...
if exist "C:\ngrok\ngrok.exe" (
    echo     ngrok already installed.
    C:\ngrok\ngrok.exe version
) else (
    echo     Downloading ngrok...
    if not exist "C:\ngrok" mkdir "C:\ngrok"
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip' -OutFile '%TEMP%\ngrok.zip' -UseBasicParsing; Expand-Archive -Path '%TEMP%\ngrok.zip' -DestinationPath 'C:\ngrok' -Force; Remove-Item '%TEMP%\ngrok.zip' -Force"
    if exist "C:\ngrok\ngrok.exe" (
        echo     ngrok downloaded successfully!
        C:\ngrok\ngrok.exe version
    ) else (
        echo     [FAIL] Download failed!
        echo     Please download manually: https://ngrok.com/download
        echo     Extract ngrok.exe to C:\ngrok\
        pause
        exit /b 1
    )
)
echo.

REM Update OLLAMA_ORIGINS (requires admin)
echo [3] Updating OLLAMA_ORIGINS...
powershell -Command "$cur = [Environment]::GetEnvironmentVariable('OLLAMA_ORIGINS','Machine'); if ($cur -match 'ngrok') { Write-Host '    Already includes ngrok: ' + $cur } else { $new = if ($cur) { $cur + ',https://*.ngrok-free.app,https://*.ngrok.io' } else { 'http://localhost:*,https://*.ngrok-free.app,https://*.ngrok.io,https://*.github.io' }; try { [Environment]::SetEnvironmentVariable('OLLAMA_ORIGINS', $new, 'Machine'); Write-Host '    Updated: ' + $new } catch { Write-Host '    [!] Need admin rights. Run as Administrator.' } }"
echo.

REM Restart Ollama
echo [4] Restarting Ollama...
taskkill /F /IM ollama.exe 2>nul
taskkill /F /IM ollama_llama_server.exe 2>nul
timeout /t 3 /nobreak >nul
start "" "ollama" serve
timeout /t 5 /nobreak >nul
curl -s http://localhost:11434/ 2>nul
echo.
echo.

REM Start ngrok
echo [5] Starting ngrok tunnel...
echo     URL will appear below. Copy the Forwarding URL.
echo     Press Ctrl+C to stop.
echo.
C:\ngrok\ngrok.exe http 11434 --host-header=localhost
