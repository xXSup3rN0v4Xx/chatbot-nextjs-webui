Write-Host '================================================================' -ForegroundColor Cyan
Write-Host '                  MULTIMODAL-DB API                            ' -ForegroundColor Cyan
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host ''
cd 'M:\_tools\chatbot_ui_project_folders\multimodal-db'
& 'M:\_tools\chatbot_ui_project_folders\multimodal-db\.venv\Scripts\Activate.ps1'
python multimodal-db/api/run_api.py
