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
    <Card className="w-full h-full bg-card text-foreground relative">
      <CardContent className="w-full h-full p-2">
        <canvas 
          ref={canvasRef} 
          width={400} 
          height={120} 
          className="w-full h-full rounded"
          style={{ imageRendering: 'pixelated' }}
        />
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button 
              className="absolute bottom-2 right-2 rounded-full hover:opacity-90 flex items-center justify-center non-draggable"
              style={{
                backgroundColor: 'hsl(52 100% 55%)',
                color: 'hsl(0 0% 15%)',
                width: '32px',
                height: '32px',
                padding: '0'
              }}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card text-foreground border-accent">
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
      </CardContent>
    </Card>
  )
}