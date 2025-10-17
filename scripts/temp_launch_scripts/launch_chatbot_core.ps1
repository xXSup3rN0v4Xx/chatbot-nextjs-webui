Write-Host '================================================================' -ForegroundColor Cyan
Write-Host '              CHATBOT-PYTHON-CORE API                          ' -ForegroundColor Cyan
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host ''
cd 'M:\_tools\chatbot_ui_project_folders\chatbot-python-core'
& 'M:\_tools\chatbot_ui_project_folders\chatbot-python-core\.venv\Scripts\Activate.ps1'
python run_api.py
