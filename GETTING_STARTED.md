# 🎯 Getting Started with Full-Stack AI Chatbot

Welcome! This guide will help you set up the complete AI chatbot platform in minutes.

## 🚀 Super Quick Start (3 Commands)

```powershell
# 1. Clone all repos (in same parent folder)
git clone https://github.com/xXSup3rN0v4Xx/chatbot-nextjs-webui.git
git clone https://github.com/xXSup3rN0v4Xx/chatbot-python-core.git
git clone https://github.com/xXSup3rN0v4Xx/multimodal-db.git

# 2. Setup (first time only)
cd chatbot-nextjs-webui\scripts
.\setup_python_environments.ps1

# 3. Start everything
.\start_all_services.ps1
```

That's it! Open http://localhost:3000 🎉

---

## 📚 What You Just Did

### Step 1: Clone Repos
You cloned three repositories that work together:
- **chatbot-nextjs-webui** - Frontend (what you're reading now!)
- **chatbot-python-core** - AI backend (Ollama, YOLO, Whisper, etc.)
- **multimodal-db** - Database backend (conversations, memory, RAG)

### Step 2: Setup
The setup script:
- ✅ Created Python virtual environments
- ✅ Installed all dependencies
- ✅ Verified installations

### Step 3: Start Services
The startup script launched 5 services:
- **Ollama** (port 11434) - LLM execution
- **Chatbot-Python-Core** (port 8000) - AI models
- **Multimodal-DB** (port 8001) - Data storage
- **WebSocket Bridge** (port 2020) - Connection glue
- **Next.js WebUI** (port 3000) - Frontend

---

## 🎓 Learning Path

### Beginner: Just Use It
1. Open http://localhost:3000
2. Click "Start Chatbot"
3. Type messages and chat!

### Intermediate: Understand It
Read these in order:
1. `README.md` (this file) - Overview
2. `docs/FULLSTACK_SETUP_GUIDE.md` - Architecture
3. `docs/QUICKSTART_COMPONENTS.md` - Component integration

### Advanced: Extend It
1. Read `docs/FRONTEND_COMPONENTS_GUIDE.md` - Component API
2. Read `docs/CHANGES_SUMMARY.md` - Recent updates
3. Explore source code in `chatbot-next/src/`

---

## 📁 What's Where

```
chatbot-nextjs-webui/              # ⭐ You are here
├── README.md                      # Overview & quick start
├── GETTING_STARTED.md             # This file
├── scripts/                       # 🚀 Automation scripts
│   ├── setup_python_environments.ps1  # Setup Python backends
│   └── start_all_services.ps1         # Start all services
├── docs/                          # 📚 Documentation
│   ├── FULLSTACK_SETUP_GUIDE.md       # Complete guide
│   ├── QUICKSTART_COMPONENTS.md       # Component integration
│   ├── FRONTEND_COMPONENTS_GUIDE.md   # Component API reference
│   ├── CHANGES_SUMMARY.md             # Changelog
│   └── FILE_REORGANIZATION.md         # How we organized files
└── chatbot-next/                  # Next.js application
    ├── src/
    │   ├── components/            # React components
    │   │   ├── SpeechRecognition/  # 🎤 Microphone recording
    │   │   ├── TextToSpeech/       # 🔊 Audio playback
    │   │   ├── VisionDetection/    # 👁️ YOLO integration
    │   │   └── ImageGeneration/    # 🎨 SDXL integration
    │   └── app/                   # Next.js pages
    └── package.json

../chatbot-python-core/            # AI Backend (sibling repo)
└── ../multimodal-db/              # Database Backend (sibling repo)
```

---

## 🎯 What Each Component Does

### Frontend Components (New!)
| Component | What It Does | Status |
|-----------|--------------|--------|
| **SpeechRecognition** | Records audio → Whisper → Text | ✅ Ready |
| **TextToSpeech** | Text → Kokoro/VibeVoice → Audio | ✅ Ready |
| **VisionDetection** | Image → YOLO → Detections | ✅ Ready |
| **ImageGeneration** | Text → SDXL → Image | ✅ Ready |

### Backend Services
| Service | Port | What It Does |
|---------|------|--------------|
| **Next.js WebUI** | 3000 | User interface |
| **WebSocket Bridge** | 2020 | Connects frontend to backends |
| **Chatbot-Python-Core** | 8000 | AI model execution |
| **Multimodal-DB** | 8001 | Data storage & RAG |
| **Ollama** | 11434 | LLM backend |

---

## 🛠️ Common Tasks

### Start Services
```powershell
cd scripts
.\start_all_services.ps1
```

### Stop Services
Just close the PowerShell windows that opened.

### Restart a Single Service
Find its terminal window and close it, then start manually:
```powershell
# Example: Restart WebSocket Bridge
cd multimodal-db
.\.venv\Scripts\Activate.ps1
python websocket_bridge.py
```

### Reinstall Dependencies
```powershell
cd scripts
.\setup_python_environments.ps1
# Choose 'y' when asked to recreate
```

### Update Frontend
```powershell
cd chatbot-next
npm install
npm run dev
```

---

## 🔧 Troubleshooting

### "No module named 'fastapi'" or similar
```powershell
# Recreate virtual environments
cd scripts
.\setup_python_environments.ps1
```

### "Port already in use"
```powershell
# Find what's using the port
netstat -ano | findstr :3000

# Kill it
taskkill /F /PID <PID>
```

### "WebSocket connection failed"
```powershell
# Check if bridge is running
curl http://localhost:2020/health

# Restart bridge manually
cd multimodal-db
.\.venv\Scripts\Activate.ps1
python websocket_bridge.py
```

### "Ollama not responding"
```powershell
# Start Ollama
ollama serve

# Check models
ollama list

# Download a model
ollama pull llama3.2
```

---

## 🎨 Customization

### Change AI Model
Edit the Next.js WebUI settings or use commands:
```
/models
```

### Add New Voice
Check TTS component settings:
- `af_heart` (default)
- `af_sky`
- More in Kokoro/VibeVoice docs

### Customize UI Colors
Edit `chatbot-next/tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      primary: '#your-color',
      // ...
    }
  }
}
```

---

## 📖 Documentation Index

### Quick Start
- **README.md** - Project overview
- **GETTING_STARTED.md** - This file!
- **docs/QUICKSTART_COMPONENTS.md** - Integrate components in 3 steps

### Setup & Architecture
- **docs/FULLSTACK_SETUP_GUIDE.md** - Complete architecture guide
- **docs/FILE_REORGANIZATION.md** - How files are organized

### Development
- **docs/FRONTEND_COMPONENTS_GUIDE.md** - Component API reference
- **docs/CHANGES_SUMMARY.md** - What's new
- **Component source:** `chatbot-next/src/components/`

### Backend (Sibling Repos)
- **chatbot-python-core/docs/** - AI backend docs
- **multimodal-db/docs/** - Database backend docs

---

## 🎓 Next Steps

### Level 1: Chat
1. Start services
2. Go to http://localhost:3000
3. Chat with AI

### Level 2: Multimodal
1. Click microphone → Speak → See transcription
2. Click speaker on message → Hear AI speak
3. Click camera → Capture → See detections
4. Type `/image sunset` → See generated image

### Level 3: Customize
1. Read component docs
2. Modify components in `chatbot-next/src/components/`
3. Add your own features

### Level 4: Extend
1. Study architecture in `docs/FULLSTACK_SETUP_GUIDE.md`
2. Add new AI models to chatbot-python-core
3. Add new databases to multimodal-db
4. Create new UI components

---

## 💡 Pro Tips

1. **Use scripts!** Don't start services manually unless debugging
2. **Read logs:** Check PowerShell windows for errors
3. **Virtual envs matter:** Always activate .venv for Python
4. **WebSocket is key:** All features flow through port 2020
5. **Test in stages:** Get chat working first, then add features

---

## 🆘 Need Help?

1. **Check documentation** - `docs/` folder has detailed guides
2. **Read error messages** - They usually tell you what's wrong
3. **Open GitHub issues** - Report bugs in respective repos
4. **Check ports** - Make sure no conflicts

---

## 🎉 You're Ready!

Everything is set up. The services are running. The components are ready.

**Start building something amazing!** 🚀

---

**Quick Commands:**
```powershell
# Setup (first time)
cd chatbot-nextjs-webui\scripts
.\setup_python_environments.ps1

# Start
.\start_all_services.ps1

# Access
http://localhost:3000
```

**Happy coding!** 🎨
