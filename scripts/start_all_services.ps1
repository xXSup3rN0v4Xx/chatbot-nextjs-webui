# start_all_services.ps1
# Starts all required services for the full-stack chatbot
# Run this script from chatbot-nextjs-webui/scripts/ directory
#
# This script looks for sibling projects in the parent directory

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "     CHATBOT FULL STACK - SERVICE STARTUP SCRIPT" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory and navigate to parent directory containing all projects
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$baseDir = Split-Path -Parent (Split-Path -Parent $scriptDir)  # Go up two levels from scripts/

# Define service directories (siblings to chatbot-nextjs-webui)
$chatbotCoreDir = Join-Path $baseDir "chatbot-python-core"
$multimodalDbDir = Join-Path $baseDir "multimodal-db"
$webUiDir = Join-Path (Split-Path -Parent $scriptDir) "chatbot-next"  # chatbot-nextjs-webui/chatbot-next

# Check if directories exist
if (-not (Test-Path $chatbotCoreDir)) {
    Write-Host "ERROR: chatbot-python-core directory not found!" -ForegroundColor Red
    Write-Host "Expected at: $chatbotCoreDir" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $multimodalDbDir)) {
    Write-Host "ERROR: multimodal-db directory not found!" -ForegroundColor Red
    Write-Host "Expected at: $multimodalDbDir" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $webUiDir)) {
    Write-Host "ERROR: chatbot-nextjs-webui directory not found!" -ForegroundColor Red
    Write-Host "Expected at: $webUiDir" -ForegroundColor Red
    exit 1
}

Write-Host "Service Directories Found:" -ForegroundColor Green
Write-Host "  - Chatbot-Python-Core: $chatbotCoreDir" -ForegroundColor Gray
Write-Host "  - Multimodal-DB: $multimodalDbDir" -ForegroundColor Gray
Write-Host "  - Next.js WebUI: $webUiDir" -ForegroundColor Gray
Write-Host ""

# Check for virtual environments
Write-Host "Checking for Python virtual environments..." -ForegroundColor Yellow
$chatbotVenv = Join-Path $chatbotCoreDir ".venv\Scripts\Activate.ps1"
$multimodalVenv = Join-Path $multimodalDbDir ".venv\Scripts\Activate.ps1"

if (Test-Path $chatbotVenv) {
    Write-Host "  ✓ Found venv for Chatbot-Python-Core" -ForegroundColor Green
} else {
    Write-Host "  ⚠ No venv found for Chatbot-Python-Core" -ForegroundColor Yellow
    Write-Host "    Run: cd chatbot-python-core; python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt" -ForegroundColor Gray
}

if (Test-Path $multimodalVenv) {
    Write-Host "  ✓ Found venv for Multimodal-DB" -ForegroundColor Green
} else {
    Write-Host "  ⚠ No venv found for Multimodal-DB" -ForegroundColor Yellow
    Write-Host "    Run: cd multimodal-db; python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt" -ForegroundColor Gray
}

$missingVenv = (-not (Test-Path $chatbotVenv)) -or (-not (Test-Path $multimodalVenv))
if ($missingVenv) {
    Write-Host ""
    Write-Host "WARNING: Some Python services are missing virtual environments!" -ForegroundColor Yellow
    Write-Host "The script will attempt to use system Python, but this may fail if dependencies aren't installed." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Startup cancelled. Please create virtual environments and install dependencies." -ForegroundColor Red
        exit 0
    }
}
Write-Host ""

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
    return $connection
}

# Check for port conflicts
Write-Host "Checking for port conflicts..." -ForegroundColor Yellow

$ports = @{
    "3000" = "Next.js WebUI"
    "8000" = "Chatbot-Python-Core API"
    "8001" = "Multimodal-DB API"
    "2020" = "WebSocket Bridge"
    "11434" = "Ollama"
}

$hasConflicts = $false
foreach ($port in $ports.Keys) {
    if (Test-Port -Port $port) {
        Write-Host "  ⚠ Port $port is already in use (used by $($ports[$port]))" -ForegroundColor Red
        $hasConflicts = $true
    } else {
        Write-Host "  ✓ Port $port is available" -ForegroundColor Green
    }
}

if ($hasConflicts) {
    Write-Host ""
    Write-Host "WARNING: Some ports are already in use!" -ForegroundColor Yellow
    Write-Host "This might mean services are already running, or another application is using these ports." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Startup cancelled." -ForegroundColor Red
        exit 0
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "     STARTING SERVICES" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Windows Terminal is available
$wtAvailable = Get-Command wt -ErrorAction SilentlyContinue

if ($wtAvailable) {
    Write-Host "Windows Terminal detected! Opening all services in split panes..." -ForegroundColor Green
    Write-Host ""
    
    # Create temporary helper scripts for each service to avoid escaping issues
    $tempScriptDir = Join-Path $scriptDir "temp_launch_scripts"
    if (-not (Test-Path $tempScriptDir)) {
        New-Item -ItemType Directory -Path $tempScriptDir | Out-Null
    }
    
    # Script 1: Ollama
    $ollamaScript = Join-Path $tempScriptDir "launch_ollama.ps1"
    @"
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host '                    OLLAMA SERVER                               ' -ForegroundColor Cyan
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host ''
ollama serve
"@ | Out-File -FilePath $ollamaScript -Encoding UTF8
    
    # Script 2: Chatbot-Python-Core
    $chatbotScript = Join-Path $tempScriptDir "launch_chatbot_core.ps1"
    $chatbotVenv = Join-Path $chatbotCoreDir ".venv\Scripts\Activate.ps1"
    if (Test-Path $chatbotVenv) {
        @"
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host '              CHATBOT-PYTHON-CORE API                          ' -ForegroundColor Cyan
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host ''
cd '$chatbotCoreDir'
& '$chatbotVenv'
python run_api.py
"@ | Out-File -FilePath $chatbotScript -Encoding UTF8
    } else {
        @"
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host '              CHATBOT-PYTHON-CORE API                          ' -ForegroundColor Cyan
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host ''
cd '$chatbotCoreDir'
python run_api.py
"@ | Out-File -FilePath $chatbotScript -Encoding UTF8
    }
    
    # Script 3: Multimodal-DB
    $multimodalScript = Join-Path $tempScriptDir "launch_multimodal_db.ps1"
    $multimodalVenv = Join-Path $multimodalDbDir ".venv\Scripts\Activate.ps1"
    if (Test-Path $multimodalVenv) {
        @"
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host '                  MULTIMODAL-DB API                            ' -ForegroundColor Cyan
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host ''
cd '$multimodalDbDir'
& '$multimodalVenv'
python multimodal-db/api/run_api.py
"@ | Out-File -FilePath $multimodalScript -Encoding UTF8
    } else {
        @"
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host '                  MULTIMODAL-DB API                            ' -ForegroundColor Cyan
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host ''
cd '$multimodalDbDir'
python multimodal-db/api/run_api.py
"@ | Out-File -FilePath $multimodalScript -Encoding UTF8
    }
    
    # Script 4: WebSocket Bridge
    $websocketScript = Join-Path $tempScriptDir "launch_websocket.ps1"
    if (Test-Path $multimodalVenv) {
        @"
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host '                 WEBSOCKET BRIDGE                              ' -ForegroundColor Cyan
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host ''
cd '$multimodalDbDir'
& '$multimodalVenv'
python websocket_bridge.py
"@ | Out-File -FilePath $websocketScript -Encoding UTF8
    } else {
        @"
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host '                 WEBSOCKET BRIDGE                              ' -ForegroundColor Cyan
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host ''
cd '$multimodalDbDir'
python websocket_bridge.py
"@ | Out-File -FilePath $websocketScript -Encoding UTF8
    }
    
    # Script 5: Next.js WebUI
    $webuiScript = Join-Path $tempScriptDir "launch_nextjs.ps1"
    @"
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host '                   NEXT.JS WEBUI                               ' -ForegroundColor Cyan
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host ''
cd '$webUiDir'
npm run dev
"@ | Out-File -FilePath $webuiScript -Encoding UTF8
    
    Write-Host "Launching Windows Terminal with split panes..." -ForegroundColor Yellow
    Write-Host ""
    
    # Launch Windows Terminal with split panes using the helper scripts
    wt -w 0 new-tab --title "Ollama" pwsh -NoExit -File "$ollamaScript" `; split-pane -H --title "Chatbot-Core" pwsh -NoExit -File "$chatbotScript" `; split-pane -H --title "Multimodal-DB" pwsh -NoExit -File "$multimodalScript" `; move-focus first `; split-pane -V --title "WebSocket" pwsh -NoExit -File "$websocketScript" `; move-focus right `; split-pane -V --title "Next.js" pwsh -NoExit -File "$webuiScript"
    
    Write-Host "  ✓ All services starting in Windows Terminal split panes" -ForegroundColor Green
    Write-Host "  ℹ Helper scripts created in: $tempScriptDir" -ForegroundColor Gray
    Start-Sleep -Seconds 8
    
} else {
    Write-Host "Windows Terminal not detected. Using separate windows..." -ForegroundColor Yellow
    Write-Host "  Tip: Install Windows Terminal from Microsoft Store for split pane support!" -ForegroundColor Cyan
    Write-Host ""
    
    # 1. Start Ollama (if not already running)
    Write-Host "[1/5] Starting Ollama..." -ForegroundColor Yellow
    if (-not (Test-Port -Port 11434)) {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "ollama serve"
        Write-Host "  ✓ Ollama starting on port 11434" -ForegroundColor Green
        Start-Sleep -Seconds 3
    } else {
        Write-Host "  ℹ Ollama already running on port 11434" -ForegroundColor Cyan
    }

    # 2. Start Chatbot-Python-Core API
    Write-Host "[2/5] Starting Chatbot-Python-Core API..." -ForegroundColor Yellow
    if (-not (Test-Port -Port 8000)) {
        # Check for venv and activate it
        $chatbotVenv = Join-Path $chatbotCoreDir ".venv\Scripts\Activate.ps1"
        if (Test-Path $chatbotVenv) {
            $chatbotCoreCmd = "cd '$chatbotCoreDir'; & '$chatbotVenv'; python run_api.py"
            Write-Host "  ℹ Activating venv for Chatbot-Python-Core" -ForegroundColor Gray
        } else {
            Write-Host "  ⚠ No venv found at $chatbotVenv, using system Python" -ForegroundColor Yellow
            $chatbotCoreCmd = "cd '$chatbotCoreDir'; python run_api.py"
        }
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $chatbotCoreCmd
        Write-Host "  ✓ Chatbot-Python-Core API starting on port 8000" -ForegroundColor Green
        Start-Sleep -Seconds 5
    } else {
        Write-Host "  ℹ Chatbot-Python-Core API already running on port 8000" -ForegroundColor Cyan
    }

    # 3. Start Multimodal-DB API
    Write-Host "[3/5] Starting Multimodal-DB API..." -ForegroundColor Yellow
    if (-not (Test-Port -Port 8001)) {
        # Check for venv and activate it
        $multimodalVenv = Join-Path $multimodalDbDir ".venv\Scripts\Activate.ps1"
        if (Test-Path $multimodalVenv) {
            $multimodalDbCmd = "cd '$multimodalDbDir'; & '$multimodalVenv'; python multimodal-db/api/run_api.py"
            Write-Host "  ℹ Activating venv for Multimodal-DB" -ForegroundColor Gray
        } else {
            Write-Host "  ⚠ No venv found at $multimodalVenv, using system Python" -ForegroundColor Yellow
            $multimodalDbCmd = "cd '$multimodalDbDir'; python multimodal-db/api/run_api.py"
        }
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $multimodalDbCmd
        Write-Host "  ✓ Multimodal-DB API starting on port 8001" -ForegroundColor Green
        Start-Sleep -Seconds 5
    } else {
        Write-Host "  ℹ Multimodal-DB API already running on port 8001" -ForegroundColor Cyan
    }

    # 4. Start WebSocket Bridge Server
    Write-Host "[4/5] Starting WebSocket Bridge Server..." -ForegroundColor Yellow
    if (-not (Test-Port -Port 2020)) {
        # Use same venv as Multimodal-DB
        $multimodalVenv = Join-Path $multimodalDbDir ".venv\Scripts\Activate.ps1"
        if (Test-Path $multimodalVenv) {
            $websocketBridgeCmd = "cd '$multimodalDbDir'; & '$multimodalVenv'; python websocket_bridge.py"
            Write-Host "  ℹ Activating venv for WebSocket Bridge" -ForegroundColor Gray
        } else {
            Write-Host "  ⚠ No venv found, using system Python" -ForegroundColor Yellow
            $websocketBridgeCmd = "cd '$multimodalDbDir'; python websocket_bridge.py"
        }
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $websocketBridgeCmd
        Write-Host "  ✓ WebSocket Bridge starting on port 2020" -ForegroundColor Green
        Start-Sleep -Seconds 3
    } else {
        Write-Host "  ℹ WebSocket Bridge already running on port 2020" -ForegroundColor Cyan
    }

    # 5. Start Next.js WebUI
    Write-Host "[5/5] Starting Next.js WebUI..." -ForegroundColor Yellow
    if (-not (Test-Port -Port 3000)) {
        $webUiCmd = "cd '$webUiDir'; npm run dev"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $webUiCmd
        Write-Host "  ✓ Next.js WebUI starting on port 3000" -ForegroundColor Green
        Start-Sleep -Seconds 5
    } else {
        Write-Host "  ℹ Next.js WebUI already running on port 3000" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "     ALL SERVICES STARTED!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Access Points:" -ForegroundColor Cyan
Write-Host "  🌐 WebUI:              http://localhost:3000" -ForegroundColor White
Write-Host "  📡 Chatbot-Core API:   http://localhost:8000/docs" -ForegroundColor White
Write-Host "  💾 Multimodal-DB API:  http://localhost:8001/docs" -ForegroundColor White
Write-Host "  🔌 WebSocket Bridge:   ws://localhost:2020" -ForegroundColor White
Write-Host "  🤖 Ollama:             http://localhost:11434" -ForegroundColor White
Write-Host ""

Write-Host "Quick Start:" -ForegroundColor Yellow
Write-Host "  1. Go to http://localhost:3000" -ForegroundColor Gray
Write-Host "  2. Click 'Start Chatbot' button" -ForegroundColor Gray
Write-Host "  3. Start chatting with your AI!" -ForegroundColor Gray
Write-Host ""

Write-Host "Service Health Check:" -ForegroundColor Yellow
Write-Host "  Testing connections..." -ForegroundColor Gray

# Wait a bit for services to fully start
Start-Sleep -Seconds 3

# Health checks
$healthChecks = @(
    @{Url = "http://localhost:3000"; Name = "Next.js WebUI"},
    @{Url = "http://localhost:8000/docs"; Name = "Chatbot-Core API"},
    @{Url = "http://localhost:8001/docs"; Name = "Multimodal-DB API"},
    @{Url = "http://localhost:2020"; Name = "WebSocket Bridge"},
    @{Url = "http://localhost:11434/api/tags"; Name = "Ollama"}
)

$allHealthy = $true
foreach ($check in $healthChecks) {
    try {
        $response = Invoke-WebRequest -Uri $check.Url -TimeoutSec 2 -ErrorAction Stop
        Write-Host "  ✓ $($check.Name) - OK" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ $($check.Name) - NOT RESPONDING" -ForegroundColor Red
        $allHealthy = $false
    }
}

Write-Host ""

if ($allHealthy) {
    Write-Host "✓ All services are healthy!" -ForegroundColor Green
} else {
    Write-Host "⚠ Some services are not responding yet." -ForegroundColor Yellow
    Write-Host "  Give them a few more seconds to start up." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Troubleshooting:" -ForegroundColor Yellow
Write-Host "  - If services fail to start, check individual terminal windows" -ForegroundColor Gray
Write-Host "  - Make sure Python and Node.js are installed" -ForegroundColor Gray
Write-Host "  - Check that all dependencies are installed (pip/npm install)" -ForegroundColor Gray
Write-Host "  - Verify Ollama is installed and models are downloaded" -ForegroundColor Gray
Write-Host ""

Write-Host "Press any key to open WebUI in browser..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Open browser
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "WebUI opened in browser!" -ForegroundColor Green
Write-Host "You can close this window. Services will continue running in their respective terminals." -ForegroundColor Gray
Write-Host ""
