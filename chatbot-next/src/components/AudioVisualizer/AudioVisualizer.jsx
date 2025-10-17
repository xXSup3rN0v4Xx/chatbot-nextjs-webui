import React, { useRef, useEffect, useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Settings } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function AudioVisualizer({ audioData = new Float32Array(0), isUserAudio = false }) {
  const canvasRef = useRef(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const demoIntervalRef = useRef(null)
  const settingsOpenTimeRef = useRef(0)
  const allowCloseRef = useRef(false)

  // Generate demo audio data
  const generateDemoData = () => {
    const demoData = new Float32Array(32)
    for (let i = 0; i < demoData.length; i++) {
      demoData[i] = Math.sin(Date.now() * 0.005 + i * 0.3) * Math.random() * 0.8
    }
    return demoData
  }

  useEffect(() => {
    if (isDemoMode) {
      demoIntervalRef.current = setInterval(() => {
        drawVisualization(generateDemoData())
      }, 50)
    } else {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current)
        demoIntervalRef.current = null
      }
    }

    return () => {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current)
      }
    }
  }, [isDemoMode])

  const drawVisualization = (data) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Set colors based on whether this is user audio or chatbot audio
    const barColor = isUserAudio ? 'hsl(9 70% 50%)' : 'hsl(52 100% 55%)' // Rust red for user, banana yellow for chatbot
    const backgroundColor = 'hsl(0 0% 11%)' // Card background

    // Fill background
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)

    // Draw pixelated bars
    const barCount = Math.min(data.length, 32) // Limit to 32 bars for pixelated look
    const barWidth = Math.floor(width / barCount) - 2 // 2px gap between bars
    const maxBarHeight = height - 4 // Leave some margin

    ctx.fillStyle = barColor

    for (let i = 0; i < barCount; i++) {
      const barHeight = Math.abs(data[i]) * maxBarHeight
      const x = i * (barWidth + 2) + 2 // 2px margin from left
      const y = height - barHeight - 2 // 2px margin from bottom

      // Draw pixelated bar (rectangular)
      ctx.fillRect(Math.floor(x), Math.floor(y), barWidth, Math.floor(barHeight))
    }
  }

  useEffect(() => {
    if (!isDemoMode) {
      drawVisualization(audioData)
    }
  }, [audioData, isUserAudio, isDemoMode])

  const handleDemoToggle = (checked) => {
    setIsDemoMode(checked)
  }

  return (
    <>
    <Card className="w-full h-full bg-card text-foreground relative" style={{ transform: 'translateZ(0)', willChange: 'contents' }}>
      <CardContent className="w-full h-full p-2">
        <canvas 
          ref={canvasRef} 
          width={400} 
          height={120} 
          className="w-full h-full rounded"
          style={{ imageRendering: 'pixelated' }}
        />
      </CardContent>
        
      {/* Settings Button - positioned in bottom-right corner as part of card border */}
      <button
        type="button"
        className="non-draggable audio-visualizer-settings-trigger"
        data-no-dnd="true"
        style={{
          position: 'absolute',
          bottom: '4px',
          right: '4px',
          width: '28px',
          height: '28px',
          padding: '0',
          margin: '0',
          borderRadius: '50%',
          border: '2px solid hsl(52 100% 55%)',
          backgroundColor: 'hsl(52 100% 55%)',
          color: 'hsl(0 0% 15%)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          lineHeight: 1,
          pointerEvents: 'auto',
          touchAction: 'none'
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('=== AUDIO VISUALIZER SETTINGS BUTTON CLICKED ===');
          console.log('Current isSettingsOpen state:', isSettingsOpen);
          settingsOpenTimeRef.current = Date.now();
          allowCloseRef.current = false;
          // Use setTimeout to ensure state update happens after event completes
          setTimeout(() => {
            console.log('Setting isSettingsOpen to true');
            setIsSettingsOpen(true);
          }, 0);
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Audio visualizer settings button pointer down');
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(52 100% 60%)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(52 100% 55%)'}
      >
        <Settings className="h-4 w-4" />
      </button>
        
        <Dialog 
          open={isSettingsOpen} 
          onOpenChange={(open) => {
            console.log('AudioVisualizer Dialog onOpenChange called with:', open, 'allowClose:', allowCloseRef.current, 'current state:', isSettingsOpen)
            // NEVER allow external closing - only our explicit handlers can close
            if (!open) {
              if (allowCloseRef.current) {
                console.log('Allowing dialog close - explicitly requested');
                setIsSettingsOpen(false);
                allowCloseRef.current = false;
              } else {
                console.log('BLOCKING dialog close - not explicitly requested');
              }
            } else {
              console.log('Dialog opening');
              setIsSettingsOpen(true);
            }
          }}
          modal={true}
        >
          <DialogContent 
            className="bg-card text-foreground border-accent z-[99999]"
            style={{ zIndex: 99999 }}
            ref={(node) => {
              if (node) {
                // Find and attach listener to the close button
                const closeButton = node.querySelector('[data-radix-collection-item]') || 
                                  node.querySelector('button[aria-label="Close"]') ||
                                  Array.from(node.querySelectorAll('button')).find(btn => 
                                    btn.querySelector('svg') && btn.className.includes('absolute')
                                  );
                if (closeButton && !closeButton.hasAttribute('data-close-listener')) {
                  closeButton.setAttribute('data-close-listener', 'true');
                  closeButton.addEventListener('click', () => {
                    console.log('X button clicked - allowing close');
                    allowCloseRef.current = true;
                  });
                }
              }
            }}
            onOpenAutoFocus={(e) => {
              e.preventDefault()
            }}
            onCloseAutoFocus={(e) => {
              e.preventDefault()
            }}
            onEscapeKeyDown={(e) => {
              console.log('AudioVisualizer: ESC pressed - closing')
              allowCloseRef.current = true;
              setIsSettingsOpen(false)
            }}
            onPointerDownOutside={(e) => {
              console.log('Audio visualizer dialog: onPointerDownOutside triggered', e.target);
              // Always prevent default - dialog should only close via X button or ESC
              e.preventDefault();
            }}
            onInteractOutside={(e) => {
              console.log('Audio visualizer dialog: onInteractOutside triggered', e.target);
              // Always prevent default - dialog should only close via X button or ESC
              e.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle style={{color: 'hsl(52 100% 55%)'}}>Audio Visualizer Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Demo Mode</label>
                  <p className="text-xs text-muted-foreground">
                    Show animated demo visualization
                  </p>
                </div>
                <Switch
                  checked={isDemoMode}
                  onCheckedChange={handleDemoToggle}
                  className="non-draggable"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </Card>
    </>
  )
}