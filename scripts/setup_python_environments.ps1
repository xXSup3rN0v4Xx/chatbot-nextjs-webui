# setup_python_environments.ps1
# Sets up virtual environments and installs dependencies for Python services
# Run this script BEFORE start_all_services.ps1
# 
# This script should be run from: chatbot-nextjs-webui/scripts/
# It will look for sibling projects: ../../../chatbot-python-core and ../../../multimodal-db

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "     PYTHON ENVIRONMENT SETUP SCRIPT" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory and navigate to parent directory containing all projects
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$baseDir = Split-Path -Parent (Split-Path -Parent $scriptDir)  # Go up two levels from scripts/

# Define service directories (sibling to chatbot-nextjs-webui)
$chatbotCoreDir = Join-Path $baseDir "chatbot-python-core"
$multimodalDbDir = Join-Path $baseDir "multimodal-db"

Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "  1. Create virtual environments for Python services" -ForegroundColor Gray
Write-Host "  2. Install all required dependencies" -ForegroundColor Gray
Write-Host "  3. Verify installations" -ForegroundColor Gray
Write-Host ""

# Check if Python is installed
Write-Host "Checking for Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "  ✓ Found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Python not found!" -ForegroundColor Red
    Write-Host "    Please install Python 3.10 or higher from https://www.python.org/" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "     SETTING UP CHATBOT-PYTHON-CORE" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Setup Chatbot-Python-Core
$chatbotVenvPath = Join-Path $chatbotCoreDir ".venv"
$chatbotRequirements = Join-Path $chatbotCoreDir "requirements.txt"

if (Test-Path $chatbotVenvPath) {
    Write-Host "Virtual environment already exists at: $chatbotVenvPath" -ForegroundColor Yellow
    $recreate = Read-Host "Recreate it? (y/n)"
    if ($recreate -eq "y") {
        Write-Host "  Removing old venv..." -ForegroundColor Gray
        Remove-Item -Recurse -Force $chatbotVenvPath
    } else {
        Write-Host "  Skipping venv creation" -ForegroundColor Cyan
    }
}

if (-not (Test-Path $chatbotVenvPath)) {
    Write-Host "[1/3] Creating virtual environment..." -ForegroundColor Yellow
    Push-Location $chatbotCoreDir
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ Failed to create venv" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Write-Host "  ✓ Virtual environment created" -ForegroundColor Green
    Pop-Location
}

Write-Host "[2/3] Installing dependencies from requirements.txt..." -ForegroundColor Yellow
Push-Location $chatbotCoreDir
& ".\.venv\Scripts\Activate.ps1"
python -m pip install --upgrade pip
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Failed to install dependencies" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
Pop-Location

Write-Host "[3/3] Verifying installation..." -ForegroundColor Yellow
Push-Location $chatbotCoreDir
& ".\.venv\Scripts\Activate.ps1"
$testImports = @("fastapi", "uvicorn", "pydantic")
$allGood = $true
foreach ($module in $testImports) {
    $result = python -c "import $module; print('OK')" 2>&1
    if ($result -match "OK") {
        Write-Host "  ✓ $module" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $module" -ForegroundColor Red
        $allGood = $false
    }
}
Pop-Location

if (-not $allGood) {
    Write-Host "  ⚠ Some dependencies failed to import" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "     SETTING UP MULTIMODAL-DB" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Setup Multimodal-DB
$multimodalVenvPath = Join-Path $multimodalDbDir ".venv"
$multimodalRequirements = Join-Path $multimodalDbDir "requirements.txt"

if (Test-Path $multimodalVenvPath) {
    Write-Host "Virtual environment already exists at: $multimodalVenvPath" -ForegroundColor Yellow
    $recreate = Read-Host "Recreate it? (y/n)"
    if ($recreate -eq "y") {
        Write-Host "  Removing old venv..." -ForegroundColor Gray
        Remove-Item -Recurse -Force $multimodalVenvPath
    } else {
        Write-Host "  Skipping venv creation" -ForegroundColor Cyan
    }
}

if (-not (Test-Path $multimodalVenvPath)) {
    Write-Host "[1/3] Creating virtual environment..." -ForegroundColor Yellow
    Push-Location $multimodalDbDir
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ Failed to create venv" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Write-Host "  ✓ Virtual environment created" -ForegroundColor Green
    Pop-Location
}

Write-Host "[2/3] Installing dependencies from requirements.txt..." -ForegroundColor Yellow
Push-Location $multimodalDbDir
& ".\.venv\Scripts\Activate.ps1"
python -m pip install --upgrade pip
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Failed to install dependencies" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
Pop-Location

Write-Host "[3/3] Verifying installation..." -ForegroundColor Yellow
Push-Location $multimodalDbDir
& ".\.venv\Scripts\Activate.ps1"
$testImports = @("fastapi", "uvicorn", "polars", "httpx")
$allGood = $true
foreach ($module in $testImports) {
    $result = python -c "import $module; print('OK')" 2>&1
    if ($result -match "OK") {
        Write-Host "  ✓ $module" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $module" -ForegroundColor Red
        $allGood = $false
    }
}
Pop-Location

if (-not $allGood) {
    Write-Host "  ⚠ Some dependencies failed to import" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "     SETUP COMPLETE!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Virtual Environments Created:" -ForegroundColor Cyan
Write-Host "  ✓ $chatbotVenvPath" -ForegroundColor White
Write-Host "  ✓ $multimodalVenvPath" -ForegroundColor White
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Run the startup script: .\start_all_services.ps1" -ForegroundColor Gray
Write-Host "  2. Or navigate to parent folder and run: cd ..; .\chatbot-nextjs-webui\scripts\start_all_services.ps1" -ForegroundColor Gray
Write-Host "  3. Open http://localhost:3000 in your browser" -ForegroundColor Gray
Write-Host "  4. Start chatting!" -ForegroundColor Gray
Write-Host ""

Write-Host "Manual Activation (if needed):" -ForegroundColor Yellow
Write-Host "  Chatbot-Core: cd chatbot-python-core; .\.venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host "  Multimodal-DB: cd multimodal-db; .\.venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host ""
