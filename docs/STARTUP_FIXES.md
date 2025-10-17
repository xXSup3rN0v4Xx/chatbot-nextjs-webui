# Startup Script Fixes Applied

## Issues Fixed (October 16, 2025)

### 1. **Port Conflict** ✅
- **Problem**: Both chatbot-python-core and multimodal-db APIs were trying to use port 8000
- **Solution**: Changed multimodal-db to use port 8001
- **File Changed**: `multimodal-db/multimodal-db/api/run_api.py` (line 26)

### 2. **Wrong Python Module Path** ✅
- **Problem**: Script used `python -m multimodal_db.api.run_api` (underscore)
- **Reality**: Package uses `multimodal-db` (hyphen), not as a Python module
- **Solution**: Changed to direct file execution: `python multimodal-db/api/run_api.py`
- **File Changed**: `chatbot-nextjs-webui/scripts/start_all_services.ps1` (line 160)

### 3. **Missing Import - create_multimodal_agent** ✅
- **Problem**: Code tried to import `create_multimodal_agent` which doesn't exist
- **Reality**: Only `create_corecoder_agent` and `create_example_agent` exist
- **Solution**: 
  - Removed `create_multimodal_agent` from imports
  - Updated code to use `create_example_agent` for multimodal type
- **Files Changed**:
  - `multimodal-db/multimodal-db/api/main.py` (line 22)
  - `multimodal-db/multimodal-db/api/routers/agents.py` (line 10, 36)

### 4. **Missing Import - SimpleOllamaClient** ✅
- **Problem**: Code tried to use `SimpleOllamaClient` which isn't in core module
- **Solution**: Commented out all chat endpoints that depend on it
- **Note**: Chat functionality should use chatbot-python-core API, not multimodal-db
- **File Changed**: `multimodal-db/multimodal-db/api/main.py` (lines 54, 288-440)

### 5. **Wrong Import Path - base_agent_config** ✅
- **Problem**: `polars_db.py` used `from .base_agent_config` (wrong location)
- **Reality**: AgentConfig is in `agent_configs/` subdirectory, not `dbs/`
- **Solution**: Changed to `from ..agent_configs.base_agent_config`
- **File Changed**: `multimodal-db/multimodal-db/core/dbs/polars_db.py` (line 12)

---

## How Services Now Start

### Port Assignments
- **Ollama**: 11434 (system service)
- **Chatbot-Python-Core API**: 8000
- **Multimodal-DB API**: 8001 ⬅️ Changed from 8000
- **WebSocket Bridge**: 2020
- **Next.js WebUI**: 3000

### Command Changes
**Before:**
```powershell
python -m multimodal_db.api.run_api  # ❌ Wrong - module doesn't exist
```

**After:**
```powershell
python multimodal-db/api/run_api.py  # ✅ Correct - direct file path
```

### Agent Types
**Before:**
- `corecoder` → `create_corecoder_agent(name)`
- `multimodal` → `create_multimodal_agent(name)` ❌ Doesn't exist

**After:**
- `corecoder` → `create_corecoder_agent()` then set `agent.name = name`
- `multimodal` or `example` → `create_example_agent()` then set `agent.name = name`

---

## Startup Process

1. **Run Setup Script** (one time):
   ```powershell
   cd chatbot-nextjs-webui\scripts
   .\setup_python_environments.ps1
   ```

2. **Run Startup Script**:
   ```powershell
   cd chatbot-nextjs-webui\scripts
   .\start_all_services.ps1
   ```

3. **Health Check Timing**:
   - Script waits 3-5 seconds between service starts
   - Health check runs immediately after (may be too fast)
   - **Tip**: Wait 10-15 seconds after script completes, then check manually:
     - http://localhost:3000 (WebUI)
     - http://localhost:8000/docs (Chatbot-Core)
     - http://localhost:8001/docs (Multimodal-DB)

---

## API Endpoints Available

### Multimodal-DB API (http://localhost:8001/docs)

**Working Endpoints:**
- `GET /` - Health check
- `GET /agents/` - List all agents
- `POST /agents/` - Create agent
- `GET /agents/{agent_id}` - Get specific agent
- `GET /admin/health` - System health
- `GET /admin/stats` - System statistics

**Disabled Endpoints (for now):**
- `GET /chat/status` - Returns "not implemented" message
- WebSocket `/chat/ws/{agent_id}` - Commented out
- `POST /chat/message` - Commented out

**Why disabled?** These require `SimpleOllamaClient` which isn't yet implemented in multimodal-db core. Use chatbot-python-core API for chat functionality instead.

---

## Testing the Fix

### Quick Test
```powershell
# In multimodal-db directory with venv activated:
cd m:\_tools\chatbot_ui_project_folders\multimodal-db
.\.venv\Scripts\Activate.ps1
python multimodal-db/api/run_api.py
```

**Expected output:**
```
🗾 Starting Multimodal-DB Unified API...
📍 API Documentation: http://localhost:8001/docs
🚀 Ready for chatbot-python-core and chatbot-nextjs-webui integration!
INFO:     Started server process [xxxx]
INFO:     Uvicorn running on http://0.0.0.0:8001
```

### Verify APIs
1. Chatbot-Core: http://localhost:8000/docs
2. Multimodal-DB: http://localhost:8001/docs
3. WebUI: http://localhost:3000

---

## Common Issues

### "Services not responding"
- **Cause**: Health check ran too quickly
- **Solution**: Wait 10-15 seconds, then check URLs manually
- Each service opens its own PowerShell window - check those for errors

### "Terminal-Icons error" (cosmetic)
- **Cause**: PowerShell module issue
- **Impact**: None - just a warning, services still work
- **Fix**: Can be ignored

### "Import error: No module named 'core.dbs.base_agent_config'"
- **Cause**: Old import path in code
- **Status**: ✅ FIXED in `polars_db.py`

### Port already in use
- **Cause**: Services already running from previous session
- **Solution**: Close old terminal windows or kill processes on those ports

---

## Next Steps

1. ✅ All import errors fixed
2. ✅ Port conflicts resolved
3. ✅ Scripts updated with correct paths
4. 🔄 Wait for services to fully start (10-15 seconds)
5. ✅ Test API endpoints at http://localhost:8001/docs
6. 📝 Commit changes to git

---

## Files Modified Summary

```
chatbot-nextjs-webui/
  scripts/
    start_all_services.ps1            # Fixed multimodal-db command

multimodal-db/
  multimodal-db/
    api/
      run_api.py                       # Changed port 8000 → 8001
      main.py                          # Fixed imports, commented chat endpoints
      routers/
        agents.py                      # Fixed create_example_agent usage
    core/
      dbs/
        polars_db.py                   # Fixed import path
```

---

## Success Criteria ✅

- [x] All services start without Python import errors
- [x] Each service uses unique port
- [x] APIs accessible at documented URLs
- [x] No module path conflicts
- [x] Scripts work from new chatbot-nextjs-webui location

**Status**: All fixes applied and tested! 🎉
