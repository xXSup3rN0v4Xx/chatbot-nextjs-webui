"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';

/**
 * SpeechRecognition Component
 * Captures audio from microphone, sends to backend via WebSocket for transcription
 * 
 * WebSocket Message Format:
 * {
 *   type: "speech_to_text",
 *   audio_data: "base64_encoded_audio_string",
 *   auto_send_to_chat: true  // Optional: automatically send transcription to chat
 * }
 * 
 * Expected Response:
 * {
 *   type: "speech_to_text_result",
 *   transcription: "transcribed text here",
 *   success: true
 * }
 */

const SpeechRecognition = ({ websocket, onTranscription }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  // Start recording audio from microphone
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      streamRef.current = stream;
      
      // Create MediaRecorder (use webm format which is widely supported)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioForTranscription(audioBlob);
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to access microphone. Please check permissions.');
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  }, [isRecording]);

  // Convert audio blob to base64 and send via WebSocket
  const sendAudioForTranscription = async (audioBlob) => {
    try {
      if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket is not connected');
      }

      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result.split(',')[1]; // Remove data:audio/webm;base64, prefix
        
        // Send to backend
        const message = {
          type: 'speech_to_text',
          audio_data: base64Audio,
          auto_send_to_chat: true  // Automatically send transcription to chat
        };
        
        websocket.send(JSON.stringify(message));
      };
      
      reader.onerror = () => {
        throw new Error('Failed to read audio file');
      };
      
      reader.readAsDataURL(audioBlob);
      
    } catch (err) {
      console.error('Error sending audio for transcription:', err);
      setError('Failed to send audio for transcription.');
      setIsProcessing(false);
    }
  };

  // Handle transcription result from WebSocket
  React.useEffect(() => {
    if (!websocket) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'speech_to_text_result') {
          setIsProcessing(false);
          
          if (data.success && data.transcription) {
            // Call parent callback with transcription
            if (onTranscription) {
              onTranscription(data.transcription);
            }
          } else {
            setError(data.error || 'Transcription failed');
          }
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    websocket.addEventListener('message', handleMessage);
    
    return () => {
      websocket.removeEventListener('message', handleMessage);
    };
  }, [websocket, onTranscription]);

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="speech-recognition-container">
      <button
        onClick={toggleRecording}
        disabled={isProcessing}
        className={`speech-recognition-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
        title={isRecording ? 'Stop Recording' : 'Start Recording'}
      >
        {isProcessing ? (
          <Square className="icon spinning" />
        ) : isRecording ? (
          <MicOff className="icon recording-icon" />
        ) : (
          <Mic className="icon" />
        )}
      </button>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {isRecording && (
        <div className="recording-indicator">
          <span className="recording-dot"></span>
          Recording...
        </div>
      )}
      
      {isProcessing && (
        <div className="processing-indicator">
          Transcribing...
        </div>
      )}

      <style jsx>{`
        .speech-recognition-container {
          position: relative;
          display: inline-block;
        }

        .speech-recognition-button {
          background: #2563eb;
          border: none;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
        }

        .speech-recognition-button:hover {
          background: #1d4ed8;
          transform: scale(1.05);
        }

        .speech-recognition-button.recording {
          background: #dc2626;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .speech-recognition-button.processing {
          background: #f59e0b;
          cursor: not-allowed;
        }

        .speech-recognition-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .icon {
          color: white;
          width: 24px;
          height: 24px;
        }

        .recording-icon {
          animation: pulse-icon 1s ease-in-out infinite;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        .error-message {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 8px;
          padding: 8px 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #dc2626;
          font-size: 12px;
          white-space: nowrap;
          z-index: 10;
        }

        .recording-indicator,
        .processing-indicator {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 8px;
          padding: 6px 12px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          border-radius: 6px;
          font-size: 12px;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .recording-dot {
          width: 8px;
          height: 8px;
          background: #dc2626;
          border-radius: 50%;
          animation: pulse 1s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
          }
          50% {
            opacity: 0.8;
            box-shadow: 0 0 0 10px rgba(220, 38, 38, 0);
          }
        }

        @keyframes pulse-icon {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default SpeechRecognition;
