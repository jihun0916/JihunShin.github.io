# ngrok setup script for Ollama remote access
Write-Host "=== ngrok Setup for Ollama ==="

# 1. Kill old tunnel processes
Write-Host "[1] Cleaning up old tunnel processes..."
Stop-Process -Name ssh -Force -ErrorAction SilentlyContinue
Stop-Process -Name cloudflared -Force -ErrorAction SilentlyContinue
Write-Host "    Old processes cleaned."

# 2. Check if ngrok exists
$ngrokPath = "C:\ngrok\ngrok.exe"
if (Test-Path $ngrokPath) {
    Write-Host "[2] ngrok already exists at $ngrokPath"
} else {
    Write-Host "[2] Downloading ngrok..."
    New-Item -Path "C:\ngrok" -ItemType Directory -Force | Out-Null
    $url = "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip"
    $zip = "$env:TEMP\ngrok.zip"
    
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
        Expand-Archive -Path $zip -DestinationPath "C:\ngrok" -Force
        Remove-Item $zip -Force -ErrorAction SilentlyContinue
        Write-Host "    ngrok downloaded to C:\ngrok\"
    } catch {
        Write-Host "    [FAIL] Download failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "    Please download manually from https://ngrok.com/download"
        exit 1
    }
}

# 3. Verify ngrok works
if (Test-Path $ngrokPath) {
    $ver = & $ngrokPath version 2>&1
    Write-Host "[3] ngrok version: $ver"
} else {
    Write-Host "[3] [FAIL] ngrok.exe not found at $ngrokPath" -ForegroundColor Red
    exit 1
}

# 4. Check authtoken
Write-Host "[4] Checking ngrok authtoken..."
$configFile = "$env:USERPROFILE\.ngrok2\ngrok.yml"
$configFile2 = "$env:USERPROFILE\AppData\Local\ngrok\ngrok.yml"
if ((Test-Path $configFile) -or (Test-Path $configFile2)) {
    Write-Host "    ngrok config found."
} else {
    Write-Host "    [!] No authtoken configured."
    Write-Host "    You need to sign up at https://ngrok.com and run:"
    Write-Host "    C:\ngrok\ngrok.exe config add-authtoken YOUR_TOKEN"
    Write-Host ""
    Write-Host "    Press Enter after adding your authtoken, or type 'skip' to try without auth:"
    $input = Read-Host
    if ($input -ne "skip") {
        Write-Host "    Checking again..."
        if (-not ((Test-Path $configFile) -or (Test-Path $configFile2))) {
            Write-Host "    [!] Still no config found. Will try anyway..."
        }
    }
}

# 5. Update OLLAMA_ORIGINS
Write-Host "[5] Updating OLLAMA_ORIGINS..."
$currentOrigins = [System.Environment]::GetEnvironmentVariable("OLLAMA_ORIGINS", "Machine")
if ($currentOrigins -and $currentOrigins -match "ngrok") {
    Write-Host "    OLLAMA_ORIGINS already includes ngrok: $currentOrigins"
} else {
    $newOrigins = if ($currentOrigins) { "$currentOrigins,https://*.ngrok-free.app,https://*.ngrok.io" } else { "http://localhost:*,https://*.ngrok-free.app,https://*.ngrok.io,https://*.github.io" }
    try {
        [System.Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", $newOrigins, "Machine")
        Write-Host "    OLLAMA_ORIGINS updated: $newOrigins"
        
        # Restart Ollama to pick up new env
        Write-Host "    Restarting Ollama..."
        Stop-Process -Name ollama* -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 5
        
        $test = try { (Invoke-WebRequest -Uri "http://localhost:11434/" -UseBasicParsing -TimeoutSec 5).Content } catch { "FAIL" }
        if ($test -match "Ollama") {
            Write-Host "    Ollama restarted successfully."
        } else {
            Write-Host "    [!] Ollama may not have restarted. Check manually."
        }
    } catch {
        Write-Host "    [!] Could not set OLLAMA_ORIGINS (need admin): $($_.Exception.Message)"
        Write-Host "    Run this script as Administrator, or set manually."
    }
}

Write-Host ""
Write-Host "=== Setup Complete ==="
Write-Host "To start the tunnel, run:"
Write-Host "  C:\ngrok\ngrok.exe http 11434 --host-header=localhost"
Write-Host ""
Write-Host "The ngrok URL will appear in the terminal."
Write-Host "Use that URL in your Research page Ollama settings."
