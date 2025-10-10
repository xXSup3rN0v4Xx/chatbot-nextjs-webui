# 💬 chatbot-nextjs-webui 💬

## About
**Chatbot-nextjs-webui** is a sleek, responsive frontend for interacting with powerful local agents. It supports natural language chat, speech-to-text, text-to-speech, image generation, vision tasks, and more — all wrapped in a modern Next.js interface.

Rendering features include:
- Darcula-style markdown code blocks
- Mermaid diagrams
- LaTeX formulas
- HTML with embedded JavaScript

Just type prompts like:

- "please use LaTeX to explain..."
- "please code me a Python script for a transformers chatbot that..."
- "please create a mermaid chart for..."
- "please create an HTML app with embedded JavaScript that..."

## Features
- 🖥️ Modern UI made using Next.js 14 & shadcn/ui
- 🎨 Magnetic Slider, customizable dashboard using draggable components
- 💬 Chat interface with response stream rendering
- 👁️ Several types of vision models for a variety of tasks
- 🎙️ Speech recognition and text-to-speech generation using WhisperSTT and VibeVoiceTTS
- 🎭 Create Custom Avatars with lip sync using SadTalker

## Prerequisites
- Node.js 18+
- Chatbot-core Python API Server
- Ollama

# Installation
1. Step one, clone [chatbot-python-core](https://github.com/xXSup3rN0v4Xx/chatbot-python-core) and follow its installation instructions carefully including installing its dependecies.
```bash
# In a seperate directory clone the chatbot-core
git clone https://github.com/xXSup3rN0v4Xx/chatbot-core.git
```

2. Step two, clone the webui [chatbot-nextjs-webui](https://github.com/xXSup3rN0v4Xx/chatbot-nextjs-webui) and follow the installation instructions carefully.

```bash
git clone https://github.com/xXSup3rN0v4Xx/chatbot-nextjs-webui.git
```

3. Step three, install the webui dependencies
```bash
cd chatbot-next
npm install
```

4. Step 4, start the development server to start using your local chatbot
```bash
npm run dev
```
