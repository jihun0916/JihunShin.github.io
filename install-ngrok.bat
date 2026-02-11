@echo off
echo === Checking ngrok ===
where ngrok 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ngrok NOT found, downloading...
    if not exist "C:\ngrok" mkdir "C:\ngrok"
    echo Downloading ngrok...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip' -OutFile '%TEMP%\ngrok.zip' -UseBasicParsing"
    echo Extracting...
    powershell -Command "Expand-Archive -Path '%TEMP%\ngrok.zip' -DestinationPath 'C:\ngrok' -Force"
    del "%TEMP%\ngrok.zip" 2>nul
    echo Done.
) else (
    echo ngrok found!
)

if exist "C:\ngrok\ngrok.exe" (
    echo ngrok.exe exists at C:\ngrok\ngrok.exe
    C:\ngrok\ngrok.exe version
) else (
    echo FAIL: ngrok.exe not found
)
echo === DONE ===
pause
