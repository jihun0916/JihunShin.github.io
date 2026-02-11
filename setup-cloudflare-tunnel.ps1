# Cloudflare Tunnel Setup Script for Ollama Remote Access
# This script sets up Cloudflare Tunnel so you can access Ollama from anywhere without installing anything on remote computers

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Cloudflare Tunnel Setup for Ollama" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[!] This script needs to run as Administrator for environment variables." -ForegroundColor Yellow
    Write-Host "    Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit
}

# Step 1: Download cloudflared
Write-Host "[1/4] Downloading cloudflared..." -ForegroundColor Green

$cloudflaredPath = "C:\cloudflared.exe"

if (Test-Path $cloudflaredPath) {
    Write-Host "[OK] cloudflared already exists at $cloudflaredPath" -ForegroundColor Green
} else {
    try {
        Write-Host "   Downloading from GitHub..." -ForegroundColor Gray
        Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $cloudflaredPath
        Write-Host "[OK] Downloaded successfully!" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] Failed to download cloudflared: $_" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit
    }
}

Write-Host ""

# Step 2: Configure Ollama CORS
Write-Host "[2/4] Configuring Ollama CORS settings..." -ForegroundColor Green

try {
    # Set environment variable to allow Cloudflare and GitHub Pages
    [System.Environment]::SetEnvironmentVariable(
        'OLLAMA_ORIGINS',
        'http://localhost:*,https://*.trycloudflare.com,https://*.github.io,https://*.cloudflare.com',
        'Machine'
    )
    Write-Host "[OK] CORS configured for Cloudflare and GitHub Pages" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Failed to set environment variable: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

Write-Host ""

# Step 3: Restart Ollama
Write-Host "[3/4] Restarting Ollama to apply CORS settings..." -ForegroundColor Green

$ollamaProcess = Get-Process -Name "ollama" -ErrorAction SilentlyContinue

if ($ollamaProcess) {
    Write-Host "   Stopping Ollama..." -ForegroundColor Gray
    Stop-Process -Name "ollama" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host "   Starting Ollama..." -ForegroundColor Gray
Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
Start-Sleep -Seconds 3

# Verify Ollama is running
$ollamaRunning = Get-Process -Name "ollama" -ErrorAction SilentlyContinue

if ($ollamaRunning) {
    Write-Host "[OK] Ollama is running" -ForegroundColor Green
} else {
    Write-Host "[!] Ollama might not be running. Please start it manually with 'ollama serve'" -ForegroundColor Yellow
}

Write-Host ""

# Step 4: Start Quick Tunnel
Write-Host "[4/4] Starting Cloudflare Quick Tunnel..." -ForegroundColor Green
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Starting tunnel and extracting URL..." -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Start cloudflared and capture output
Write-Host "[*] Launching cloudflared tunnel..." -ForegroundColor Green
Write-Host ""

# Start process in background and capture output
$job = Start-Job -ScriptBlock {
    param($path)
    & $path tunnel --url http://localhost:11434 2>&1
} -ArgumentList $cloudflaredPath

# Wait for URL to appear
Write-Host "[...] Waiting for tunnel URL (this may take 10-15 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$tunnelUrl = $null
$maxAttempts = 20
$attempt = 0

while ($attempt -lt $maxAttempts -and -not $tunnelUrl) {
    $output = Receive-Job -Job $job 2>&1 | Out-String

    if ($output -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
        $tunnelUrl = $matches[0]
        break
    }

    Start-Sleep -Seconds 1
    $attempt++
    Write-Host "." -NoNewline -ForegroundColor Gray
}

Write-Host ""
Write-Host ""

if ($tunnelUrl) {
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "  [OK] TUNNEL CREATED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "[*] Your Cloudflare Tunnel URL:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "    $tunnelUrl" -ForegroundColor Yellow -BackgroundColor DarkGreen
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host ""

    # Copy to clipboard
    try {
        Set-Clipboard -Value $tunnelUrl
        Write-Host "[OK] URL copied to clipboard automatically!" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "[!] Could not copy to clipboard. Please copy manually." -ForegroundColor Yellow
        Write-Host ""
    }

    # Save to file
    $urlFile = "$env:USERPROFILE\Desktop\ollama-tunnel-url.txt"
    try {
        $tunnelUrl | Out-File -FilePath $urlFile -Encoding UTF8
        Write-Host "[SAVE] URL also saved to: $urlFile" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "[!] Could not save URL to file." -ForegroundColor Yellow
    }

} else {
    Write-Host "==================================================" -ForegroundColor Red
    Write-Host "  [!] Could not extract URL automatically" -ForegroundColor Yellow
    Write-Host "==================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the cloudflared window for the URL." -ForegroundColor Yellow
    Write-Host "It will look like: https://xxxxx.trycloudflare.com" -ForegroundColor Gray
    Write-Host ""
}

# Keep the job running
Write-Host "[>>] Tunnel is now running in the background..." -ForegroundColor Cyan
Write-Host ""

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Next Steps" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "School/Work computer:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Open browser" -ForegroundColor White
Write-Host "   https://jihun0916.github.io/JihunShin.github.io/?research=true" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Click Settings tab" -ForegroundColor White
Write-Host ""
Write-Host "3. Paste Ollama URL (Ctrl+V)" -ForegroundColor White
if ($tunnelUrl) {
    Write-Host "   $tunnelUrl" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "4. Click Save then Test Connection" -ForegroundColor White
Write-Host ""
Write-Host "5. [OK] All features ready!" -ForegroundColor Green
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[!] IMPORTANT:" -ForegroundColor Yellow
Write-Host "   - Keep this computer ON" -ForegroundColor White
Write-Host "   - Do NOT close this window" -ForegroundColor White
if ($tunnelUrl) {
    Write-Host "   - Update URL on school computer if it changes" -ForegroundColor White
}
Write-Host ""

# Keep tunnel running
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Tunnel Status" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

if ($job.State -eq 'Running') {
    Write-Host "[OK] Tunnel is RUNNING" -ForegroundColor Green
    Write-Host ""
    if ($tunnelUrl) {
        Write-Host "[URL] $tunnelUrl" -ForegroundColor Cyan
    }
    Write-Host ""
    Write-Host "Closing this window will stop the tunnel." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press Ctrl+C or close this window to stop." -ForegroundColor Gray
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host ""

    # Show tunnel logs
    Write-Host "Tunnel logs (real-time):" -ForegroundColor Cyan
    Write-Host "------------------------" -ForegroundColor Gray
    Write-Host ""

    # Monitor the job and show output
    try {
        while ($job.State -eq 'Running') {
            $newOutput = Receive-Job -Job $job 2>&1
            if ($newOutput) {
                $newOutput | ForEach-Object {
                    Write-Host $_ -ForegroundColor Gray
                }
            }
            Start-Sleep -Seconds 2
        }
    } catch {
        Write-Host ""
        Write-Host "Tunnel stopped." -ForegroundColor Yellow
    } finally {
        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "[FAIL] Tunnel failed to start" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please try running manually:" -ForegroundColor Yellow
    Write-Host "C:\cloudflared.exe tunnel --url http://localhost:11434" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
}
