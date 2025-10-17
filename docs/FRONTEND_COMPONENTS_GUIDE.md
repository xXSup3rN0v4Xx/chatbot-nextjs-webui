# Frontend Components Integration Guide

## Overview

This document provides a comprehensive guide for integrating the new multimodal feature components into the Next.js WebUI.

## Available Components

### 1. SpeechRecognition Component
**Location:** `src/components/SpeechRecognition/`

**Purpose:** Captures audio from the user's microphone and sends it to the backend for transcription using Whisper.

**Features:**
- Microphone access with permission handling
- Real-time audio recording
- Base64 audio encoding
- WebSocket communication
- Auto-send transcription to chat
- Visual recording indicators
- Error handling

**Usage:**
```jsx
import SpeechRecognition from '@/components/SpeechRecognition';

function MyComponent() {
  const websocket = useWebSocket(); // Your WebSocket hook
  
  const handleTranscription = (text) => {
    console.log('Transcribed:', text);
    // Text is automatically sent to chat if auto_send_to_chat is true
  };

  return (
    <SpeechRecognition 
      websocket={websocket}
      onTranscription={handleTranscription}
    />
  );
}
```

**WebSocket Protocol:**
- **Send:** `{ type: "speech_to_text", audio_data: "base64...", auto_send_to_chat: true }`
- **Receive:** `{ type: "speech_to_text_result", transcription: "...", success: true }`

---

### 2. TextToSpeech Component
**Location:** `src/components/TextToSpeech/`

**Purpose:** Sends text to backend for speech generation using Kokoro/VibeVoice/F5 and plays the resulting audio.

**Features:**
- Text-to-speech generation
- Multiple voice support
- Audio playback controls
- Base64 audio decoding
- Audio visualization support
- Loading states

**Usage:**
```jsx
import { TextToSpeechButton } from '@/components/TextToSpeech';

function MyComponent() {
  const websocket = useWebSocket();
  const [messageText, setMessageText] = useState('');
  
  const handleAudioPlay = (analyser) => {
    // Optional: Use analyser for visualization
  };

  return (
    <TextToSpeechButton 
      websocket={websocket}
      text={messageText}
      voice="af_heart"  // Optional: af_heart, af_sky, etc.
      onAudioPlay={handleAudioPlay}
      onAudioEnd={() => console.log('Audio finished')}
    />
  );
}
```

**WebSocket Protocol:**
- **Send:** `{ type: "text_to_speech", text: "...", voice: "af_heart" }`
- **Receive:** `{ type: "text_to_speech_result", audio_data: "base64...", success: true }`

---

### 3. VisionDetection Component
**Location:** `src/components/VisionDetection/`

**Purpose:** Captures images from camera or file upload and sends to backend for YOLO object detection.

**Features:**
- Camera access with live preview
- File upload support
- Image capture and encoding
- Bounding box visualization
- Detection results list
- Confidence scores
- Color-coded detections

**Usage:**
```jsx
import VisionDetection from '@/components/VisionDetection';

function MyComponent() {
  const websocket = useWebSocket();
  
  const handleDetectionComplete = (detections) => {
    console.log('Detected objects:', detections);
    // detections: [{ label, confidence, bbox: [x1, y1, x2, y2] }]
  };

  return (
    <VisionDetection 
      websocket={websocket}
      onDetectionComplete={handleDetectionComplete}
    />
  );
}
```

**WebSocket Protocol:**
- **Send:** `{ type: "vision_detect", image_data: "base64..." }`
- **Receive:** `{ type: "vision_results", detections: [...], success: true }`

---

### 4. ImageGeneration Component
**Location:** `src/components/ImageGeneration/`

**Purpose:** Generates images from text prompts using SDXL.

**Features:**
- Text prompt input
- Negative prompt support
- Advanced settings (size, steps, guidance)
- Real-time progress updates
- Image preview and download
- Base64 image handling

**Usage:**
```jsx
import ImageGeneration from '@/components/ImageGeneration';

function MyComponent() {
  const websocket = useWebSocket();
  
  const handleImageGenerated = (imageUrl, imagePath) => {
    console.log('Generated image:', imageUrl);
    console.log('Saved to:', imagePath);
  };

  return (
    <ImageGeneration 
      websocket={websocket}
      onImageGenerated={handleImageGenerated}
    />
  );
}
```

**WebSocket Protocol:**
- **Send:** `{ type: "image_generate", prompt: "...", negative_prompt: "...", width: 1024, height: 1024, steps: 30, guidance_scale: 7.5 }`
- **Receive (Progress):** `{ type: "image_generation_status", progress: 50, status: "generating" }`
- **Receive (Result):** `{ type: "image_generation_result", image_data: "base64...", success: true }`

---

## Integration into Main App

### Step 1: Import Components
Add the components to your main page or layout:

```jsx
// src/app/page.js or your main component
import SpeechRecognition from '@/components/SpeechRecognition';
import { TextToSpeechButton } from '@/components/TextToSpeech';
import VisionDetection from '@/components/VisionDetection';
import ImageGeneration from '@/components/ImageGeneration';
```

### Step 2: Add to Side Panel Buttons

Replace or enhance the existing side panel buttons:

```jsx
// Example: Integrating with side panel
const [activeFeature, setActiveFeature] = useState(null);

// In your side panel render:
<button onClick={() => setActiveFeature('speech')}>
  <Mic />
</button>
<button onClick={() => setActiveFeature('vision')}>
  <Eye />
</button>
<button onClick={() => setActiveFeature('image')}>
  <ImageIcon />
</button>

// Modal or expanded panel for active feature:
{activeFeature === 'speech' && (
  <SpeechRecognition websocket={ws} onTranscription={handleTranscription} />
)}
{activeFeature === 'vision' && (
  <VisionDetection websocket={ws} onDetectionComplete={handleDetections} />
)}
{activeFeature === 'image' && (
  <ImageGeneration websocket={ws} onImageGenerated={handleImageGenerated} />
)}
```

### Step 3: Integrate with Chat

Add TTS button to each chat message:

```jsx
// In your message rendering component
function ChatMessage({ message, websocket }) {
  return (
    <div className="message">
      <p>{message.text}</p>
      <TextToSpeechButton 
        websocket={websocket}
        text={message.text}
        voice="af_heart"
      />
    </div>
  );
}
```

### Step 4: Handle Transcriptions in Chat

When speech recognition completes, the transcription is automatically sent to chat if `auto_send_to_chat: true`. You can also manually handle it:

```jsx
const handleTranscription = (text) => {
  // Option 1: Display in chat input
  setChatInput(text);
  
  // Option 2: Automatically send as message
  sendMessage(text);
  
  // Option 3: Show notification
  toast.success(`Transcribed: ${text}`);
};
```

### Step 5: Parse Image Generation Commands

Detect when users want to generate images from chat:

```jsx
const handleChatMessage = (message) => {
  // Check for image generation trigger
  if (message.startsWith('/image ')) {
    const prompt = message.substring(7);
    setActiveFeature('image');
    // Pre-fill the prompt in ImageGeneration component
  } else {
    // Send normal chat message
    sendChatMessage(message);
  }
};
```

---

## WebSocket Setup

All components require a WebSocket connection. Ensure your WebSocket is properly configured:

```jsx
// src/hooks/useWebSocket.js
import { useEffect, useRef, useState } from 'react';

export function useWebSocket(url = 'ws://localhost:2020/ws') {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    wsRef.current = ws;
    
    return () => {
      ws.close();
    };
  }, [url]);

  return { websocket: wsRef.current, isConnected };
}
```

---

## Styling and Theming

All components include inline styles using styled-jsx. To customize:

1. **Override with CSS Modules:**
```jsx
// MyComponent.module.css
.speech-recognition-button {
  background: your-custom-color !important;
}
```

2. **Use Tailwind Classes:**
Replace the styled-jsx sections with Tailwind utility classes.

3. **Theme Integration:**
Pass theme props to customize colors:
```jsx
<SpeechRecognition 
  websocket={ws}
  theme={{
    primaryColor: '#your-color',
    recordingColor: '#your-color'
  }}
/>
```

---

## Error Handling

All components include built-in error handling:

- **Permission Errors:** Camera/microphone access denied
- **WebSocket Errors:** Connection issues
- **Backend Errors:** API failures
- **Format Errors:** Invalid data formats

Handle errors at the parent level:

```jsx
const [globalError, setGlobalError] = useState(null);

<SpeechRecognition 
  websocket={ws}
  onError={setGlobalError}
/>

{globalError && (
  <ErrorToast message={globalError} onClose={() => setGlobalError(null)} />
)}
```

---

## Performance Considerations

### 1. Audio Recording
- Uses compressed webm format to reduce data size
- Automatically cleans up media streams
- Limits recording time to prevent memory issues

### 2. Image Processing
- Compresses images before sending (JPEG quality 0.9)
- Uses canvas for efficient encoding
- Cleans up object URLs after use

### 3. WebSocket Messages
- Batches progress updates to avoid flooding
- Uses binary data where possible
- Implements reconnection logic

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Speech Recognition | ✅ | ✅ | ✅* | ✅ |
| Text-to-Speech | ✅ | ✅ | ✅ | ✅ |
| Vision Detection | ✅ | ✅ | ✅* | ✅ |
| Image Generation | ✅ | ✅ | ✅ | ✅ |

*Safari requires HTTPS for camera/microphone access

---

## Testing

### Manual Testing Checklist

**Speech Recognition:**
- [ ] Click mic button
- [ ] Grant permission
- [ ] See recording indicator
- [ ] Speak clearly
- [ ] Click stop
- [ ] See transcription
- [ ] Transcription sent to chat

**Text-to-Speech:**
- [ ] Click speaker button on message
- [ ] Hear audio playback
- [ ] See playing indicator
- [ ] Click stop button
- [ ] Audio stops

**Vision Detection:**
- [ ] Click camera button
- [ ] Grant permission
- [ ] See video preview
- [ ] Click capture
- [ ] See detection results
- [ ] Bounding boxes drawn correctly
- [ ] Try file upload

**Image Generation:**
- [ ] Enter prompt
- [ ] Click generate
- [ ] See progress bar
- [ ] Wait for completion
- [ ] Image displayed
- [ ] Download works
- [ ] Try different settings

### Automated Testing

```javascript
// Example Jest test
import { render, screen, fireEvent } from '@testing-library/react';
import SpeechRecognition from './SpeechRecognition';

test('shows recording indicator when active', () => {
  const mockWs = { send: jest.fn(), readyState: WebSocket.OPEN };
  render(<SpeechRecognition websocket={mockWs} />);
  
  const button = screen.getByTitle('Start Recording');
  fireEvent.click(button);
  
  expect(screen.getByText('Recording...')).toBeInTheDocument();
});
```

---

## Troubleshooting

### Issue: Microphone not working
**Solution:**
- Check browser permissions
- Ensure HTTPS (required in production)
- Try different browser
- Check if another app is using mic

### Issue: WebSocket connection fails
**Solution:**
- Verify bridge server is running (port 2020)
- Check WebSocket URL
- Ensure no firewall blocking
- Check browser console for errors

### Issue: Images/Audio not displaying
**Solution:**
- Verify base64 data is complete
- Check data URL format
- Look for CORS issues
- Validate WebSocket messages

### Issue: Detection bounding boxes wrong
**Solution:**
- Ensure image dimensions match canvas
- Check bbox coordinates format [x1, y1, x2, y2]
- Verify canvas scaling
- Test with different image sizes

---

## Next Steps

1. **Integrate into Main App:** Add components to your page/layout
2. **Style Customization:** Match your app's design system
3. **Test All Features:** Run through the testing checklist
4. **User Feedback:** Gather feedback on UX
5. **Optimize Performance:** Profile and optimize as needed
6. **Add Analytics:** Track feature usage

---

## Support

For issues or questions:
1. Check the [WebSocket Bridge Documentation](../../docs/WEBUI_FEATURE_INTEGRATION.md)
2. Review [Backend API Reference](../../chatbot-python-core/docs/API_REFERENCE.md)
3. See [Full Stack Setup Guide](../../FULLSTACK_SETUP_GUIDE.md)
