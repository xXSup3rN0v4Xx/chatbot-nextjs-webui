"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Eye, EyeOff } from 'lucide-react';

/**
 * VisionDetection Component
 * Captures images from camera or file upload
 * Sends to backend via WebSocket for YOLO object detection
 * Displays results with bounding boxes
 * 
 * WebSocket Message Format:
 * {
 *   type: "vision_detect",
 *   image_data: "base64_encoded_image_string"
 * }
 * 
 * Expected Response:
 * {
 *   type: "vision_results",
 *   detections: [
 *     {
 *       label: "person",
 *       confidence: 0.95,
 *       bbox: [x1, y1, x2, y2]
 *     }
 *   ],
 *   image_path: "/path/to/saved/image.jpg",
 *   success: true
 * }
 */

const VisionDetection = ({ websocket, onDetectionComplete }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detections, setDetections] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);
  const [error, setError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setIsCapturing(true);
      
    } catch (err) {
      console.error('Error starting camera:', err);
      setError('Failed to access camera. Please check permissions.');
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsCapturing(false);
  }, []);

  // Capture frame from camera
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to base64
    canvas.toBlob(async (blob) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result.split(',')[1];
        setCurrentImage(reader.result); // Store for display
        sendImageForDetection(base64Image);
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.9);
    
    stopCamera();
  }, [stopCamera]);

  // Handle file upload
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    setError(null);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Image = reader.result.split(',')[1];
      setCurrentImage(reader.result); // Store for display
      sendImageForDetection(base64Image);
    };
    reader.readAsDataURL(file);
  }, []);

  // Send image to backend for detection
  const sendImageForDetection = useCallback((base64Image) => {
    try {
      if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket is not connected');
      }

      setIsProcessing(true);
      setDetections(null);

      const message = {
        type: 'vision_detect',
        image_data: base64Image
      };
      
      websocket.send(JSON.stringify(message));
      
    } catch (err) {
      console.error('Error sending image for detection:', err);
      setError('Failed to send image for detection');
      setIsProcessing(false);
    }
  }, [websocket]);

  // Handle detection results from WebSocket
  React.useEffect(() => {
    if (!websocket) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'vision_results') {
          setIsProcessing(false);
          
          if (data.success && data.detections) {
            setDetections(data.detections);
            setShowResults(true);
            
            if (onDetectionComplete) {
              onDetectionComplete(data.detections);
            }
          } else {
            setError(data.error || 'Detection failed');
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
  }, [websocket, onDetectionComplete]);

  // Draw bounding boxes on image
  const drawBoundingBoxes = useCallback(() => {
    if (!currentImage || !detections || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw image
      context.drawImage(img, 0, 0);
      
      // Draw detections
      detections.forEach((detection, index) => {
        const [x1, y1, x2, y2] = detection.bbox;
        const width = x2 - x1;
        const height = y2 - y1;
        
        // Generate color based on index
        const hue = (index * 137.5) % 360;
        const color = `hsl(${hue}, 70%, 50%)`;
        
        // Draw bounding box
        context.strokeStyle = color;
        context.lineWidth = 3;
        context.strokeRect(x1, y1, width, height);
        
        // Draw label background
        const label = `${detection.label} (${(detection.confidence * 100).toFixed(1)}%)`;
        context.font = '14px Arial';
        const textWidth = context.measureText(label).width;
        
        context.fillStyle = color;
        context.fillRect(x1, y1 - 22, textWidth + 10, 22);
        
        // Draw label text
        context.fillStyle = 'white';
        context.fillText(label, x1 + 5, y1 - 6);
      });
    };
    
    img.src = currentImage;
  }, [currentImage, detections]);

  // Redraw when detections change
  React.useEffect(() => {
    if (showResults) {
      drawBoundingBoxes();
    }
  }, [showResults, drawBoundingBoxes]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const clearResults = () => {
    setDetections(null);
    setCurrentImage(null);
    setShowResults(false);
    setError(null);
  };

  return (
    <div className="vision-detection-container">
      {/* Control Buttons */}
      <div className="controls">
        <button
          onClick={isCapturing ? captureFrame : startCamera}
          disabled={isProcessing}
          className="control-button camera"
          title={isCapturing ? 'Capture Frame' : 'Start Camera'}
        >
          <Camera className="icon" />
          {isCapturing ? 'Capture' : 'Camera'}
        </button>
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing || isCapturing}
          className="control-button upload"
          title="Upload Image"
        >
          <Upload className="icon" />
          Upload
        </button>
        
        {(detections || currentImage) && (
          <button
            onClick={clearResults}
            className="control-button clear"
            title="Clear Results"
          >
            <X className="icon" />
            Clear
          </button>
        )}
        
        {detections && (
          <button
            onClick={() => setShowResults(!showResults)}
            className="control-button toggle"
            title={showResults ? 'Hide Detections' : 'Show Detections'}
          >
            {showResults ? <EyeOff className="icon" /> : <Eye className="icon" />}
            {showResults ? 'Hide' : 'Show'}
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Error message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="processing-indicator">
          Processing image...
        </div>
      )}

      {/* Camera preview */}
      {isCapturing && (
        <div className="camera-preview">
          <video ref={videoRef} autoPlay playsInline muted />
          <button onClick={stopCamera} className="close-camera">
            <X />
          </button>
        </div>
      )}

      {/* Results canvas */}
      {(currentImage || detections) && !isCapturing && (
        <div className="results-container">
          <canvas ref={canvasRef} />
          
          {detections && detections.length > 0 && (
            <div className="detections-list">
              <h3>Detections ({detections.length})</h3>
              <ul>
                {detections.map((detection, index) => (
                  <li key={index}>
                    <span className="label">{detection.label}</span>
                    <span className="confidence">
                      {(detection.confidence * 100).toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .vision-detection-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .controls {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .control-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .control-button.camera {
          background: #2563eb;
          color: white;
        }

        .control-button.camera:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .control-button.upload {
          background: #7c3aed;
          color: white;
        }

        .control-button.upload:hover:not(:disabled) {
          background: #6d28d9;
        }

        .control-button.clear {
          background: #dc2626;
          color: white;
        }

        .control-button.clear:hover {
          background: #b91c1c;
        }

        .control-button.toggle {
          background: #0891b2;
          color: white;
        }

        .control-button.toggle:hover {
          background: #0e7490;
        }

        .control-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .icon {
          width: 18px;
          height: 18px;
        }

        .error-message,
        .processing-indicator {
          padding: 12px 16px;
          border-radius: 6px;
          font-size: 14px;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
        }

        .processing-indicator {
          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #f59e0b;
          text-align: center;
        }

        .camera-preview {
          position: relative;
          width: 100%;
          border-radius: 8px;
          overflow: hidden;
          background: #000;
        }

        .camera-preview video {
          width: 100%;
          display: block;
        }

        .close-camera {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .close-camera:hover {
          background: rgba(220, 38, 38, 0.9);
        }

        .results-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .results-container canvas {
          width: 100%;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .detections-list {
          background: white;
          padding: 16px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .detections-list h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }

        .detections-list ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .detections-list li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #f3f4f6;
          border-radius: 4px;
        }

        .detections-list .label {
          font-weight: 500;
          color: #374151;
          text-transform: capitalize;
        }

        .detections-list .confidence {
          font-size: 12px;
          color: #6b7280;
          background: #e5e7eb;
          padding: 2px 8px;
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
};

export default VisionDetection;
