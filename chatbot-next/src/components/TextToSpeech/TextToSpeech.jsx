"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';

/**
 * TextToSpeech Component
 * Sends text to backend via WebSocket for speech generation
 * Receives base64 audio and plays it
 * 
 * WebSocket Message Format:
 * {
 *   type: "text_to_speech",
 *   text: "text to convert to speech",
 *   voice: "af_heart"  // Optional: voice name (default from backend)
 * }
 * 
 * Expected Response:
 * {
 *   type: "text_to_speech_result",
 *   audio_data: "base64_encoded_audio",
 *   success: true
 * }
 */

const TextToSpeech = ({ websocket, onAudioPlay, onAudioEnd }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  // Send text to backend for TTS
  const generateSpeech = useCallback((text, voice = 'af_heart') => {
    try {
      if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket is not connected');
      }

      if (!text || text.trim() === '') {
        throw new Error('No text provided for speech generation');
      }

      setError(null);
      setIsGenerating(true);

      // Send to backend
      const message = {
        type: 'text_to_speech',
        text: text.trim(),
        voice: voice
      };
      
      websocket.send(JSON.stringify(message));
      
    } catch (err) {
      console.error('Error generating speech:', err);
      setError(err.message || 'Failed to generate speech');
      setIsGenerating(false);
    }
  }, [websocket]);

  // Play audio from base64 data
  const playAudio = useCallback(async (base64Audio) => {
    try {
      // Convert base64 to blob
      const byteCharacters = atob(base64Audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const audioBlob = new Blob([byteArray], { type: 'audio/wav' });
      
      // Create audio URL
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create or reuse audio element
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      
      audioRef.current.src = audioUrl;
      
      // Setup audio context for visualization (optional)
      if (onAudioPlay && !audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaElementSource(audioRef.current);
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      }
      
      // Play audio
      await audioRef.current.play();
      setIsPlaying(true);
      
      if (onAudioPlay) {
        onAudioPlay(analyserRef.current);
      }
      
      // Handle audio end
      audioRef.current.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        
        if (onAudioEnd) {
          onAudioEnd();
        }
      };
      
    } catch (err) {
      console.error('Error playing audio:', err);
      setError('Failed to play audio');
      setIsPlaying(false);
    }
  }, [onAudioPlay, onAudioEnd]);

  // Stop current audio playback
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      
      if (onAudioEnd) {
        onAudioEnd();
      }
    }
  }, [onAudioEnd]);

  // Handle TTS result from WebSocket
  React.useEffect(() => {
    if (!websocket) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'text_to_speech_result') {
          setIsGenerating(false);
          
          if (data.success && data.audio_data) {
            playAudio(data.audio_data);
          } else {
            setError(data.error || 'Speech generation failed');
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
  }, [websocket, playAudio]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  return {
    isPlaying,
    isGenerating,
    error,
    generateSpeech,
    stopAudio,
    clearError: () => setError(null)
  };
};

// UI Component wrapper
export const TextToSpeechButton = ({ websocket, text, voice = 'af_heart', onAudioPlay, onAudioEnd }) => {
  const { isPlaying, isGenerating, error, generateSpeech, stopAudio, clearError } = TextToSpeech({
    websocket,
    onAudioPlay,
    onAudioEnd
  });

  const handleClick = () => {
    if (isPlaying) {
      stopAudio();
    } else if (text) {
      generateSpeech(text, voice);
    }
  };

  return (
    <div className="tts-button-container">
      <button
        onClick={handleClick}
        disabled={isGenerating || !text}
        className={`tts-button ${isPlaying ? 'playing' : ''} ${isGenerating ? 'generating' : ''}`}
        title={isPlaying ? 'Stop Audio' : isGenerating ? 'Generating...' : 'Play Audio'}
      >
        {isGenerating ? (
          <Loader2 className="icon spinning" />
        ) : isPlaying ? (
          <VolumeX className="icon" />
        ) : (
          <Volume2 className="icon" />
        )}
      </button>
      
      {error && (
        <div className="error-message" onClick={clearError}>
          {error}
        </div>
      )}

      <style jsx>{`
        .tts-button-container {
          position: relative;
          display: inline-block;
        }

        .tts-button {
          background: #7c3aed;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 6px rgba(124, 58, 237, 0.3);
        }

        .tts-button:hover:not(:disabled) {
          background: #6d28d9;
          transform: scale(1.05);
        }

        .tts-button.playing {
          background: #dc2626;
          animation: pulse-playing 1s ease-in-out infinite;
        }

        .tts-button.generating {
          background: #f59e0b;
          cursor: not-allowed;
        }

        .tts-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .icon {
          color: white;
          width: 20px;
          height: 20px;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        .error-message {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 6px;
          padding: 6px 10px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 4px;
          color: #dc2626;
          font-size: 11px;
          white-space: nowrap;
          z-index: 10;
          cursor: pointer;
        }

        @keyframes pulse-playing {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
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

export default TextToSpeech;
