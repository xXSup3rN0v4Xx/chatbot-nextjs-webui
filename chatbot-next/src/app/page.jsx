'use client'

import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Orbitron } from 'next/font/google'

const orbitron = Orbitron({ subsets: ['latin'] })

const IsometricBackground = () => {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animationFrameId

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const drawIsometricGrid = (time) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const gridSize = 40
      const sqrt3 = Math.sqrt(3)
      const gridWidth = Math.ceil(canvas.width / (gridSize * sqrt3)) + 2
      const gridHeight = Math.ceil(canvas.height / (gridSize * 1.5)) + 2

      ctx.strokeStyle = 'rgba(82, 82, 82, 0.4)' // Dark grey lines
      ctx.lineWidth = 1

      for (let row = -1; row < gridHeight; row++) {
        for (let col = -1; col < gridWidth; col++) {
          const x = (col + (row % 2) * 0.5) * gridSize * sqrt3
          const y = row * gridSize * 1.5

          // Draw upward-pointing triangle
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(x + gridSize * sqrt3 / 2, y + gridSize * 1.5)
          ctx.lineTo(x - gridSize * sqrt3 / 2, y + gridSize * 1.5)
          ctx.closePath()
          ctx.stroke()
        }
      }

      // Truly infinite starfish animation - new star every 4 seconds forever
      const starSpawnInterval = 4000 // New star every 4 seconds
      const starLifespan = 45000 // 45 seconds active
      const fadeTime = 9000 // 9 seconds fade out
      const totalCycleTime = starLifespan + fadeTime
      
      // Calculate how many stars have been spawned so far
      const totalStarsSpawned = Math.floor(time / starSpawnInterval) + 1
      
      // Only show stars that are currently active (within their lifecycle)
      for (let starIndex = 0; starIndex < totalStarsSpawned; starIndex++) {
        const starStartTime = starIndex * starSpawnInterval
        const starTime = time - starStartTime
        const starPhase = starTime / starLifespan
        
        // Skip stars that haven't started yet or have completely faded
        if (starTime < 0 || starTime > totalCycleTime) continue
        
        // If star is past its main lifecycle, only show fading remnants
        const isCompleted = starPhase > 1
        
        if (starPhase <= 0) continue
        
        // Pick random center position based on when the star starts (more randomness)
        const randomSeed1 = Math.sin(starIndex * 12.345 + starStartTime * 0.001) * 999999
        const randomSeed2 = Math.cos(starIndex * 67.890 + starStartTime * 0.003) * 999999
        const margin = 0.15 // Keep 15% margin from edges for arm growth
        const centerRow = Math.floor(Math.abs(Math.sin(randomSeed1)) * (gridHeight * (1 - 2 * margin)) + gridHeight * margin)
        const centerCol = Math.floor(Math.abs(Math.cos(randomSeed2)) * (gridWidth * (1 - 2 * margin)) + gridWidth * margin)
        const centerX = (centerCol + (centerRow % 2) * 0.5) * gridSize * sqrt3
        const centerY = centerRow * gridSize * 1.5
        
        // Generate 5 random walk arms from the center
        const numArms = 5
        const maxArmLength = 8 // Max steps per arm
        
        // Pre-calculate all arms for this star (fully deterministic, no time dependency!)
        const arms = []
        
        for (let armIndex = 0; armIndex < numArms; armIndex++) {
          const armSegments = []
          let currentRow = centerRow
          let currentCol = centerCol
          const visited = new Set()
          
          // Random walk for this arm
          for (let step = 0; step < maxArmLength; step++) {
            const nodeKey = `${currentRow}-${currentCol}`
            if (visited.has(nodeKey)) break
            visited.add(nodeKey)
            
            // Current position
            const currentX = (currentCol + (currentRow % 2) * 0.5) * gridSize * sqrt3
            const currentY = currentRow * gridSize * 1.5
            
            // Store segment from previous to current position
            if (step > 0 && armSegments.length > 0) {
              const prevSegment = armSegments[armSegments.length - 1]
              armSegments.push({
                fromX: prevSegment.toX,
                fromY: prevSegment.toY,
                toX: currentX,
                toY: currentY,
                stepIndex: step
              })
            } else if (step === 0) {
              // First segment starts from center
              armSegments.push({
                fromX: centerX,
                fromY: centerY,
                toX: currentX,
                toY: currentY,
                stepIndex: step
              })
            }
            
            // Get valid hexagonal neighbors for triangle grid
            const neighbors = []
            const isEvenRow = currentRow % 2 === 0
            
            if (isEvenRow) {
              neighbors.push(
                { row: currentRow, col: currentCol + 1 },     // right
                { row: currentRow, col: currentCol - 1 },     // left
                { row: currentRow + 1, col: currentCol },     // down-right
                { row: currentRow + 1, col: currentCol - 1 }, // down-left
                { row: currentRow - 1, col: currentCol },     // up-right
                { row: currentRow - 1, col: currentCol - 1 }  // up-left
              )
            } else {
              neighbors.push(
                { row: currentRow, col: currentCol + 1 },     // right
                { row: currentRow, col: currentCol - 1 },     // left
                { row: currentRow + 1, col: currentCol + 1 }, // down-right
                { row: currentRow + 1, col: currentCol },     // down-left
                { row: currentRow - 1, col: currentCol + 1 }, // up-right
                { row: currentRow - 1, col: currentCol }      // up-left
              )
            }
            
            // Filter valid neighbors within grid bounds
            const validNeighbors = neighbors.filter(n => 
              n.row >= 0 && n.row < gridHeight && 
              n.col >= 0 && n.col < gridWidth &&
              !visited.has(`${n.row}-${n.col}`)
            )
            
            if (validNeighbors.length === 0) break
            
            // Pick random neighbor (more randomness based on start time)
            const pathRandomSeed = starIndex * 3.7 + armIndex * 2.1 + step * 1.9 + starStartTime * 0.002
            const randomIndex = Math.floor((Math.sin(pathRandomSeed) * 0.5 + 0.5) * validNeighbors.length)
            const nextNode = validNeighbors[randomIndex]
            currentRow = nextNode.row
            currentCol = nextNode.col
          }
          
          arms.push(armSegments)
        }
        
        // Calculate drawing progress - Stop drawing new segments if completed
        const totalSegments = arms.reduce((sum, arm) => sum + arm.length, 0)
        const drawingPhase = 0.7 // Use 70% of the star's life for drawing
        const totalDrawingTime = starLifespan * drawingPhase // 70% of 45s = 31.5s for drawing
        const secondsPerSegment = totalDrawingTime / 1000 / totalSegments // ~0.79 seconds per segment
        
        let drawingProgress
        if (isCompleted) {
          // Completed star - freeze drawing progress, only fade existing segments
          drawingProgress = 1
        } else {
          drawingProgress = Math.min(1, (starTime / totalDrawingTime))
        }
        
        // Handle fading for completed starfish
        let globalFadeOpacity = 1
        
        if (isCompleted) {
          // Completed star - only show fading remnants, no new growth
          const fadePhase = (starPhase - 1) / 0.2 // Fade over the extra 20% time
          globalFadeOpacity = Math.max(0, 1 - fadePhase)
        } else {
          // Active star - normal fade starts at 85% of lifecycle
          const fadeStartPhase = 0.85
          if (starPhase > fadeStartPhase) {
            const fadeProgress = (starPhase - fadeStartPhase) / (1 - fadeStartPhase)
            globalFadeOpacity = 1 - fadeProgress * 0.3 // Only fade to 70% during active phase
          }
        }
        
        if (globalFadeOpacity <= 0.05) continue
        
        ctx.lineWidth = 2.5
        
        // Store all segments for overlap detection
        const allSegments = []
        
        // Draw all arms SIMULTANEOUSLY - each arm grows at the same rate
        const currentDrawingTime = drawingProgress * totalDrawingTime
        
        // Find the maximum step we should be drawing across all arms
        const maxStepToRender = Math.floor(currentDrawingTime / (secondsPerSegment * 1000))
        
        for (let armIndex = 0; armIndex < arms.length; armIndex++) {
          const arm = arms[armIndex]
          
          for (let stepIndex = 0; stepIndex < arm.length && stepIndex <= maxStepToRender; stepIndex++) {
            const segment = arm[stepIndex]
            
            // Each arm uses the same timing - all arms grow together
            const segmentStartTime = stepIndex * secondsPerSegment * 1000
            
            if (currentDrawingTime < segmentStartTime) {
              // Haven't started this segment yet
              continue
            }
            
            // Calculate how much of this segment should be drawn
            const segmentDrawProgress = Math.min(1, (currentDrawingTime - segmentStartTime) / (secondsPerSegment * 1000))
            
            // Age-based opacity for trail effect
            const segmentAge = (currentDrawingTime - segmentStartTime) / 1000 // age in seconds
            const ageFactor = Math.max(0.2, 1 - segmentAge * 0.02) // Very slow fade
            const finalOpacity = ageFactor * globalFadeOpacity * 0.9
            
            if (finalOpacity <= 0.1) {
              continue
            }
            
            // Store segment for overlap detection later
            if (segmentDrawProgress >= 1) {
              allSegments.push({
                fromX: segment.fromX,
                fromY: segment.fromY,
                toX: segment.toX,
                toY: segment.toY,
                opacity: finalOpacity,
                starIndex: starIndex,
                isPartial: false
              })
            } else {
              const currentX = segment.fromX + (segment.toX - segment.fromX) * segmentDrawProgress
              const currentY = segment.fromY + (segment.toY - segment.fromY) * segmentDrawProgress
              
              allSegments.push({
                fromX: segment.fromX,
                fromY: segment.fromY,
                toX: currentX,
                toY: currentY,
                opacity: finalOpacity,
                starIndex: starIndex,
                isPartial: true,
                headX: currentX,
                headY: currentY
              })
            }
          }
        }
        
        // Draw segments with overlap detection
        for (let i = 0; i < allSegments.length; i++) {
          const segment = allSegments[i]
          let hasOverlap = false
          
          // Check for overlaps with other stars' segments
          for (let j = 0; j < allSegments.length; j++) {
            if (i !== j && allSegments[j].starIndex !== segment.starIndex) {
              const other = allSegments[j]
              const distance = Math.sqrt(
                Math.pow((segment.toX + segment.fromX) / 2 - (other.toX + other.fromX) / 2, 2) +
                Math.pow((segment.toY + segment.fromY) / 2 - (other.toY + other.fromY) / 2, 2)
              )
              if (distance < 30) { // Close enough to be considered overlapping
                hasOverlap = true
                break
              }
            }
          }
          
          // Choose color based on overlap
          const baseColor = hasOverlap ? 'rgba(191, 87, 64' : 'rgba(255, 215, 0' // Rust vs Yellow
          
          ctx.shadowColor = `${baseColor}, ${segment.opacity * 0.7})`
          ctx.shadowBlur = 6
          ctx.strokeStyle = `${baseColor}, ${segment.opacity})`
          
          ctx.beginPath()
          ctx.moveTo(segment.fromX, segment.fromY)
          ctx.lineTo(segment.toX, segment.toY)
          ctx.stroke()
          
          // Draw bright drawing head if this is a partial segment
          if (segment.isPartial && segment.headX && segment.headY) {
            ctx.fillStyle = `${baseColor}, ${globalFadeOpacity})`
            ctx.shadowColor = `${baseColor}, ${globalFadeOpacity * 0.8})`
            ctx.shadowBlur = 10
            ctx.beginPath()
            ctx.arc(segment.headX, segment.headY, 3, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        
        // Draw bright center point
        if (drawingProgress > 0) {
          ctx.fillStyle = `rgba(255, 215, 0, ${globalFadeOpacity * 0.95})`
          ctx.shadowColor = `rgba(255, 215, 0, ${globalFadeOpacity * 0.9})`
          ctx.shadowBlur = 15
          ctx.beginPath()
          ctx.arc(centerX, centerY, 5, 0, Math.PI * 2)
          ctx.fill()
        }
        
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
      }
    }

    const animate = (time) => {
      drawIsometricGrid(time)
      animationFrameId = requestAnimationFrame(animate)
    }

    resizeCanvas()
    animate(0)

    window.addEventListener('resize', resizeCanvas)
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" />
}

const ModernButton = ({ children, href }) => (
  <Link href={href} passHref>
    <motion.div
      className="w-72 h-14 relative cursor-pointer group"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div 
        className="absolute inset-0 rounded-2xl border-2 transition-all duration-300 group-hover:shadow-lg"
        style={{
          backgroundColor: 'hsl(0 0% 11%)',
          borderColor: 'hsl(52 100% 55%)',
          boxShadow: '0 0 20px hsla(52, 100%, 55%, 0.3)'
        }}
      />
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(135deg, hsla(52, 100%, 55%, 0.1) 0%, hsla(52, 100%, 55%, 0.05) 100%)'
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span 
          className="font-bold text-lg transition-colors duration-300 group-hover:drop-shadow-lg"
          style={{ color: 'hsl(52 100% 55%)' }}
        >
          {children}
        </span>
      </div>
    </motion.div>
  </Link>
)

export default function Home() {
  return (
    <div 
      className={`relative min-h-screen text-white overflow-hidden ${orbitron.className}`}
      style={{ backgroundColor: 'hsl(0 0% 6%)' }}
    >
      <IsometricBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-12">
        <header className="text-center mb-32">
          <h1 className="text-7xl font-bold mb-6 relative inline-block">
            <span 
              className="modern-title-glow"
              style={{ 
                color: 'hsl(9 70% 50%)', // Rust color text
                textShadow: `
                  0 0 10px hsla(9, 70%, 50%, 0.8),
                  0 0 20px hsla(9, 70%, 50%, 0.6),
                  0 0 30px hsla(9, 70%, 50%, 0.4),
                  0 0 40px hsla(9, 70%, 50%, 0.2)
                `
              }}
            >
              Chatbot Nextjs WebUI
            </span>
          </h1>
          <motion.p 
            className="text-2xl font-medium"
            style={{ color: 'hsl(52 100% 75%)' }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            Digital Agents at Your Command
          </motion.p>
        </header>

        <div className="flex flex-col items-center justify-center space-y-6">
          <ModernButton href="/chatbotUI">Start Chatbot</ModernButton>
          <ModernButton href="/profile">User Identity</ModernButton>
          <ModernButton href="/settings">System Config</ModernButton>
        </div>
      </div>

      <div 
        className="fixed bottom-0 left-0 w-full h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, hsla(0, 0%, 6%, 1) 0%, transparent 100%)'
        }}
      />

      <style jsx global>{`
        body {
          background: hsl(0 0% 6%);
        }

        @keyframes modernGlow {
          0%, 100% {
            text-shadow: 
              0 0 10px hsla(9, 70%, 50%, 0.8),
              0 0 20px hsla(9, 70%, 50%, 0.6),
              0 0 30px hsla(9, 70%, 50%, 0.4);
          }
          50% {
            text-shadow: 
              0 0 15px hsla(9, 70%, 50%, 1),
              0 0 25px hsla(9, 70%, 50%, 0.8),
              0 0 35px hsla(9, 70%, 50%, 0.6);
          }
        }

        .modern-title-glow {
          animation: modernGlow 3s ease-in-out infinite;
        }

        @keyframes subtlePulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.85;
          }
        }

        .text-2xl {
          animation: subtlePulse 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

