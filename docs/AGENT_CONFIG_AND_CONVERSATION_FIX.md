# Agent Config & Conversation Storage Fix

**Date:** October 16, 2025  
**Issue:** Agent config returning empty JSON, messages not displaying, need agent selector and conversation persistence

## Problems Identified

### 1. Agent Config Empty JSON Error
**Symptom:** `Error getting agent config: Expecting value: line 1 column 1 (char 0)`

**Root Cause:** 
- POST `/agents` was returning `{"agent_id": "...", "status": "created"}` instead of full config
- WebSocket bridge tried to use this minimal response
- JSON parsing failed because expected config fields were missing

**Fix:**
- Modified `agents.py` POST endpoint to return full `agent.to_dict()` after creation
- Added `raise_for_status()` calls in websocket_bridge to catch HTTP errors properly
- Now POST returns complete agent config immediately

### 2. Conversation Storage Not Working
**Symptom:** Messages sent but not displayed in UI, no persistence

**Root Cause:**
- Conversation endpoints were using wrong paths (`/api/v1/conversations/message`)
- No proper conversations router existed
- Messages weren't being stored or retrieved correctly

**Fix:**
- Created new `conversations.py` router with proper endpoints:
  - `POST /conversations/{agent_id}/messages` - Store message
  - `GET /conversations/{agent_id}/messages` - Get history
  - `DELETE /conversations/{agent_id}/messages` - Clear history
- Updated websocket_bridge to use correct paths
- Added `clear_messages()` method to PolarsDB
- Registered conversations router in main.py

### 3. Message Display Issues
**Symptom:** User messages and AI responses not showing in chat window

**Root Cause:**
- WebSocket events not being emitted correctly
- Chat history state not updating
- Need to verify ChatSection component handles WebSocket messages

**Status:** Backend fixed, need to verify frontend WebSocket handling

## Files Modified

### Backend (multimodal-db)

1. **multimodal-db/multimodal-db/api/routers/agents.py**
   - Changed POST endpoint to return full agent config
   - Added `.raise_for_status()` check
   - Returns `stored_agent.to_dict()` instead of just ID

2. **multimodal-db/multimodal-db/api/routers/conversations.py** (NEW)
   - Created complete conversations router
   - Endpoints for storing, retrieving, and clearing messages
   - Proper Pydantic models for requests/responses

3. **multimodal-db/multimodal-db/api/main.py**
   - Imported conversations router
   - Registered with `app.include_router(conversations.router)`

4. **multimodal-db/multimodal-db/core/dbs/polars_db.py**
   - Added `clear_messages(agent_id)` method
   - Filters out messages for specified agent
   - Saves database after clearing

5. **multimodal-db/websocket_bridge.py**
   - Fixed agent creation to use POST response directly
   - Updated conversation paths from `/api/v1/conversations/...` to `/conversations/{agent_id}/messages`
   - Added `.raise_for_status()` for better error handling
   - Both user and assistant messages now stored correctly

## API Endpoints

### Agents
```
GET    /agents/              - List all agents
POST   /agents/              - Create agent (returns full config)
GET    /agents/{agent_id}    - Get specific agent
```

### Conversations
```
POST   /conversations/{agent_id}/messages    - Add message
GET    /conversations/{agent_id}/messages    - Get history (limit param)
DELETE /conversations/{agent_id}/messages    - Clear history
```

## Testing

### Test Agent Creation
```bash
curl -X POST http://localhost:8001/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-agent",
    "agent_type": "corecoder",
    "description": "Test agent"
  }'
```

### Test Message Storage
```bash
# Store user message
curl -X POST http://localhost:8001/conversations/test-agent/messages \
  -H "Content-Type: application/json" \
  -d '{"role": "user", "content": "Hello!"}'

# Get history
curl http://localhost:8001/conversations/test-agent/messages
```

## Next Steps

### 1. Frontend Message Display
Need to verify:
- ChatSection component subscribes to WebSocket messages correctly
- `chat_response` events update chat history state
- User messages are added to UI immediately when sent

### 2. Agent Selector Component (TODO)
Create new component for:
- Listing available agents from `/agents/` endpoint
- Creating new agents with different types
- Switching between agents (changes active WebSocket connection)
- Displaying agent capabilities (models, features enabled)

### 3. Load Conversation History on Mount (TODO)
- When ChatSection mounts, fetch history from `/conversations/{agent_id}/messages`
- Populate initial chat history state
- Resume conversation from where user left off

### 4. Agent Management UI (TODO)
- View all agents in sidebar
- Edit agent configuration
- Delete agents
- See agent statistics (message count, last active, etc.)

## Architecture Notes

### Conversation Flow
```
User types message
  ↓
ChatSection sends via WebSocket
  ↓
WebSocket Bridge receives
  ↓
Stores user message in multimodal-db (/conversations/{agent_id}/messages)
  ↓
Retrieves conversation history
  ↓
Sends to chatbot-python-core with history as context
  ↓
Streams response back to WebUI via WebSocket
  ↓
Stores assistant response in multimodal-db
  ↓
WebUI displays in ChatSection
```

### Agent Configuration
- Agents stored in multimodal-db with full config
- WebSocket bridge retrieves config on connection
- Config includes: models, prompts, features, capabilities
- UI should allow selecting/switching agents
- Each agent has independent conversation history

## Benefits

1. **Persistent Conversations** - History survives page refreshes
2. **Multi-Agent Support** - Different agents maintain separate histories
3. **Context-Aware Responses** - AI has access to previous conversation
4. **Audit Trail** - All messages timestamped and stored
5. **Cross-Session Continuity** - Resume conversations across sessions

## Known Issues

- [ ] Frontend doesn't load conversation history on mount yet
- [ ] No UI for selecting/managing agents
- [ ] Agent config UI editing not implemented
- [ ] Need to add conversation search/filtering
- [ ] Should add message editing/deletion endpoints
