"use client";

import React, { useState, useCallback } from 'react';
import { Image as ImageIcon, Download, X, Loader2 } from 'lucide-react';

/**
 * ImageGeneration Component
 * Sends text prompts to backend via WebSocket for SDXL image generation
 * Displays generated images with download option
 * 
 * WebSocket Message Format:
 * {
 *   type: "image_generate",
 *   prompt: "a beautiful sunset over mountains",
 *   negative_prompt: "blurry, low quality",  // Optional
 *   width: 1024,  // Optional, default 1024
 *   height: 1024,  // Optional, default 1024
 *   steps: 30,  // Optional, default 30
 *   guidance_scale: 7.5  // Optional, default 7.5
 * }
 * 
 * Expected Responses:
 * Progress: {
 *   type: "image_generation_status",
 *   status: "generating",
 *   progress: 50,
 *   message: "Generating image... 50%"
 * }
 * 
 * Result: {
 *   type: "image_generation_result",
 *   image_data: "base64_encoded_image",
 *   image_path: "/path/to/saved/image.png",
 *   success: true
 * }
 */

const ImageGeneration = ({ websocket, onImageGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, distorted');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [error, setError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Advanced settings
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [steps, setSteps] = useState(30);
  const [guidanceScale, setGuidanceScale] = useState(7.5);

  // Generate image from prompt
  const generateImage = useCallback(() => {
    try {
      if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket is not connected');
      }

      if (!prompt || prompt.trim() === '') {
        throw new Error('Please enter a prompt');
      }

      setError(null);
      setIsGenerating(true);
      setProgress(0);
      setGeneratedImage(null);

      // Send to backend
      const message = {
        type: 'image_generate',
        prompt: prompt.trim(),
        negative_prompt: negativePrompt.trim(),
        width: parseInt(width),
        height: parseInt(height),
        steps: parseInt(steps),
        guidance_scale: parseFloat(guidanceScale)
      };
      
      websocket.send(JSON.stringify(message));
      
    } catch (err) {
      console.error('Error generating image:', err);
      setError(err.message || 'Failed to generate image');
      setIsGenerating(false);
    }
  }, [websocket, prompt, negativePrompt, width, height, steps, guidanceScale]);

  // Handle WebSocket messages
  React.useEffect(() => {
    if (!websocket) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'image_generation_status') {
          setProgress(data.progress || 0);
        } else if (data.type === 'image_generation_result') {
          setIsGenerating(false);
          setProgress(100);
          
          if (data.success && data.image_data) {
            const imageUrl = `data:image/png;base64,${data.image_data}`;
            setGeneratedImage({
              url: imageUrl,
              path: data.image_path,
              prompt: prompt
            });
            
            if (onImageGenerated) {
              onImageGenerated(imageUrl, data.image_path);
            }
          } else {
            setError(data.error || 'Image generation failed');
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
  }, [websocket, prompt, onImageGenerated]);

  // Download generated image
  const downloadImage = useCallback(() => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage.url;
    link.download = `generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [generatedImage]);

  // Clear results
  const clearResults = () => {
    setGeneratedImage(null);
    setError(null);
    setProgress(0);
  };

  // Handle Enter key in prompt
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
      e.preventDefault();
      generateImage();
    }
  };

  return (
    <div className="image-generation-container">
      {/* Prompt Input */}
      <div className="prompt-section">
        <label htmlFor="prompt">Prompt</label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Describe the image you want to generate..."
          rows={3}
          disabled={isGenerating}
          className="prompt-input"
        />
      </div>

      {/* Negative Prompt Input */}
      <div className="prompt-section">
        <label htmlFor="negative-prompt">Negative Prompt (Optional)</label>
        <textarea
          id="negative-prompt"
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          placeholder="What you don't want in the image..."
          rows={2}
          disabled={isGenerating}
          className="prompt-input"
        />
      </div>

      {/* Advanced Settings Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="advanced-toggle"
        disabled={isGenerating}
      >
        {showAdvanced ? '▼' : '▶'} Advanced Settings
      </button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="advanced-settings">
          <div className="setting-row">
            <label>
              Width: {width}px
              <input
                type="range"
                min="512"
                max="1536"
                step="64"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                disabled={isGenerating}
              />
            </label>
            <label>
              Height: {height}px
              <input
                type="range"
                min="512"
                max="1536"
                step="64"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                disabled={isGenerating}
              />
            </label>
          </div>
          <div className="setting-row">
            <label>
              Steps: {steps}
              <input
                type="range"
                min="10"
                max="50"
                step="5"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                disabled={isGenerating}
              />
            </label>
            <label>
              Guidance Scale: {guidanceScale}
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={guidanceScale}
                onChange={(e) => setGuidanceScale(e.target.value)}
                disabled={isGenerating}
              />
            </label>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={generateImage}
        disabled={isGenerating || !prompt.trim()}
        className="generate-button"
      >
        {isGenerating ? (
          <>
            <Loader2 className="icon spinning" />
            Generating... {progress}%
          </>
        ) : (
          <>
            <ImageIcon className="icon" />
            Generate Image
          </>
        )}
      </button>

      {/* Progress Bar */}
      {isGenerating && (
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="close-error">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Generated Image */}
      {generatedImage && (
        <div className="result-container">
          <div className="result-header">
            <h3>Generated Image</h3>
            <div className="result-actions">
              <button onClick={downloadImage} className="action-button download">
                <Download className="icon" />
                Download
              </button>
              <button onClick={clearResults} className="action-button clear">
                <X className="icon" />
                Clear
              </button>
            </div>
          </div>
          
          <img src={generatedImage.url} alt={generatedImage.prompt} className="generated-image" />
          
          <div className="result-info">
            <p className="result-prompt">{generatedImage.prompt}</p>
            {generatedImage.path && (
              <p className="result-path">Saved to: {generatedImage.path}</p>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .image-generation-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 20px;
          background: #f9fafb;
          border-radius: 8px;
          max-width: 800px;
        }

        .prompt-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .prompt-section label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .prompt-input {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.3s ease;
        }

        .prompt-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .prompt-input:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
        }

        .advanced-toggle {
          align-self: flex-start;
          padding: 8px 12px;
          background: transparent;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .advanced-toggle:hover:not(:disabled) {
          background: #f3f4f6;
          color: #374151;
        }

        .advanced-settings {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 16px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }

        .setting-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .setting-row label {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 13px;
          color: #6b7280;
        }

        .setting-row input[type="range"] {
          width: 100%;
        }

        .generate-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .generate-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .generate-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .icon {
          width: 20px;
          height: 20px;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        .progress-container {
          width: 100%;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          transition: width 0.3s ease;
        }

        .error-message {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #dc2626;
          font-size: 14px;
        }

        .close-error {
          background: transparent;
          border: none;
          color: #dc2626;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
        }

        .result-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 16px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .result-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .result-actions {
          display: flex;
          gap: 8px;
        }

        .action-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .action-button.download {
          background: #10b981;
          color: white;
        }

        .action-button.download:hover {
          background: #059669;
        }

        .action-button.clear {
          background: #ef4444;
          color: white;
        }

        .action-button.clear:hover {
          background: #dc2626;
        }

        .generated-image {
          width: 100%;
          border-radius: 8px;
          display: block;
        }

        .result-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .result-prompt {
          margin: 0;
          font-size: 14px;
          color: #374151;
          font-style: italic;
        }

        .result-path {
          margin: 0;
          font-size: 12px;
          color: #6b7280;
          font-family: monospace;
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

export default ImageGeneration;
