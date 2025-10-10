'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import AvatarCard from '@/components/AvatarCard/AvatarCard'
import ChatSection from '@/components/ChatSection/ChatSection'
import AudioVisualizer from '@/components/AudioVisualizer/AudioVisualizer'
import { useToast } from '@/hooks/use-toast'
import { ToastProvider } from '@/components/ui/toast'
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Settings, User, Plus, X, Mic, Smile, Eye, Image, Volume2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const ResponsiveGridLayout = WidthProvider(Responsive)

export default function EnhancedChatInterface() {
  // Layout State
  const [layout, setLayout] = useState([
    { i: 'audioVisualizer', x: 0, y: 0, w: 3, h: 4 },
    { i: 'avatar', x: 0, y: 4, w: 3, h: 7 },
    { i: 'chat', x: 3, y: 0, w: 6, h: 12 },
  ])

  // App State
  const [selectedModel, setSelectedModel] = useState('')
  const [availableModels, setAvailableModels] = useState([])
  const [chatHistory, setChatHistory] = useState([])
  const [streamingMessage, setStreamingMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isDarkTheme, setIsDarkTheme] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [ollamaApiUrl, setOllamaApiUrl] = useState('http://localhost:11434')
  const [userName, setUserName] = useState('')
  const [commandResult, setCommandResult] = useState(null)

  // New state for audio and speech recognition
  const [userAudioData, setUserAudioData] = useState(new Float32Array(0))
  const [llmAudioData, setLlmAudioData] = useState(new Float32Array(0))
  const [isSpeechRecognitionActive, setIsSpeechRecognitionActive] = useState(false)
  const [isSpeechGenerationActive, setIsSpeechGenerationActive] = useState(false)
  
  // New feature states for side panel
  const [isVisionActive, setIsVisionActive] = useState(false)
  const [isImageGenerationActive, setIsImageGenerationActive] = useState(false)
  const [isAvatarLipSyncActive, setIsAvatarLipSyncActive] = useState(false)

  // Side panel state
  const [showSidePanel, setShowSidePanel] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  // WebSocket References
  const ws = useRef(null)
  const audioWs = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const isComponentMounted = useRef(true)
  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY = 2000

  // UI Components Config
  const [availableComponents] = useState([
    { id: 'avatar', name: 'Avatar' },
    { id: 'chat', name: 'Chat' },
    { id: 'audioVisualizer', name: 'Audio Visualizer' },
  ])

  const { toast } = useToast()

  const setupWebSocket = useCallback(() => {
    // Generate a unique agent ID if not already stored
    const agentId = localStorage.getItem('agentId') || 
                   `agent-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('agentId', agentId);
  
    if (ws.current?.readyState === WebSocket.CONNECTING) return;
    if (ws.current?.readyState === WebSocket.OPEN) return;
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) return;
  
    try {
      ws.current = new WebSocket(`ws://localhost:2020/ws/${agentId}`)
      
      ws.current.onopen = () => {
        if (!isComponentMounted.current) return
        setIsConnected(true)
        reconnectAttemptsRef.current = 0
        toast({
          title: "Connected",
          description: "WebSocket connection established",
        })
      }
      
      ws.current.onmessage = (event) => {
        if (!isComponentMounted.current) return
        try {
          const message = JSON.parse(event.data)
          
          // Batch updates during drag operations to reduce re-renders
          const updateState = () => {
            switch (message.type) {
              case 'chat_message':
                setChatHistory(prev => [...prev, { 
                  role: 'user', 
                  content: message.content 
                }])
                break
              case 'chat_response':
                if (message.is_stream) {
                  // Handle streaming message
                  setStreamingMessage(message.content)
                } else {
                  // Handle complete message
                  setChatHistory(prev => [...prev, { 
                    role: 'assistant', 
                    content: message.content 
                  }])
                  setStreamingMessage('')
                }
                break
              case 'command_result':
                setCommandResult(message.content)
                setChatHistory(prev => [...prev, { 
                  role: 'system', 
                  content: message.content 
                }])
                break
              case 'error':
                toast({
                  title: "Error",
                  description: message.content,
                  variant: "destructive"
                })
                break
            }
          }

          // Defer updates during drag operations for smoother performance
          if (isDragging) {
            requestAnimationFrame(updateState)
          } else {
            updateState()
          }
        } catch (error) {
          console.error('Error processing message:', error)
        }
      }

      ws.current.onclose = (event) => {
        if (!isComponentMounted.current) return
        setIsConnected(false)
        
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            setupWebSocket()
          }, RECONNECT_DELAY)
        } else {
          toast({
            title: "Connection Failed",
            description: "Maximum reconnection attempts reached. Please refresh the page.",
            variant: "destructive",
          })
        }
      }

      ws.current.onerror = (error) => {
        if (!isComponentMounted.current) return
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Error creating WebSocket:', error)
    }
  }, [toast, isDragging])

  const setupAudioWebSocket = useCallback(() => {
    const agentId = localStorage.getItem('agentId');
    
    audioWs.current = new WebSocket(`ws://localhost:2020/audio-stream/${agentId}`)
    audioWs.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      // Throttle audio data updates during drag operations for better performance
      const updateAudioData = () => {
        if (data.user_audio_data) {
          setUserAudioData(new Float32Array(data.user_audio_data))
        }
        if (data.llm_audio_data) {
          setLlmAudioData(new Float32Array(data.llm_audio_data))
        }
      }

      if (isDragging) {
        // Reduce update frequency during drag
        if (Math.random() < 0.3) { // Only update 30% of the time during drag
          requestAnimationFrame(updateAudioData)
        }
      } else {
        updateAudioData()
      }
    }
    audioWs.current.onerror = (error) => {
      console.error('Audio WebSocket error:', error)
    }
    audioWs.current.onclose = () => {
      console.log('Audio WebSocket closed')
    }
  }, [isDragging])

  useEffect(() => {
    setupWebSocket()
    setupAudioWebSocket()
    fetchAvailableModels()
    loadConfig()

    return () => {
      if (ws.current) {
        ws.current.close()
      }
      if (audioWs.current) {
        audioWs.current.close()
      }
    }
  }, [setupWebSocket, setupAudioWebSocket])

  const sendMessage = useCallback((type, content) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      toast({
        title: "Error", 
        description: "Not connected to server",
        variant: "destructive",
      })
      return
    }
  
    try {
      ws.current.send(JSON.stringify({
        type: type,
        content: content
      }))
      
      setStreamingMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
    }
  }, [toast])

  const getMessageColor = (role, color) => {
    switch (role) {
      case 'user':
        return 'bg-blue-500 text-white'
      case 'assistant':
        return color ? `bg-[${color}] text-white` : 'bg-green-500 text-white'
      case 'system':
        return 'bg-gray-500 text-white'
      default:
        return 'bg-gray-300 text-black'
    }
  }
  
  const fetchAvailableModels = async () => {
    try {
      const response = await fetch('http://localhost:2020/available_models')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setAvailableModels(data.models || [])
    } catch (error) {
      console.error('Error fetching available models:', error)
      toast({
        title: "Error",
        description: `Failed to fetch available models: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const handleModelChange = async (value) => {
    setSelectedModel(value)
    try {
      const response = await fetch('http://localhost:2020/set_model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: value }),
      })
      
      if (!response.ok) throw new Error('Failed to set model')
      
      toast({
        title: "Model Changed",
        description: `Model set to ${value}`,
      })
    } catch (error) {
      console.error('Error setting model:', error)
      toast({
        title: "Error",
        description: "Failed to set model",
        variant: "destructive",
      })
    }
  }

  const handleLayoutChange = useCallback((newLayout) => {
    setLayout(newLayout)
  }, [])

  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleDragStop = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Memoized components to prevent unnecessary re-renders during drag
  const MemoizedChatSection = useMemo(() => 
    memo(() => (
      <ChatSection
        selectedModel={selectedModel}
        availableModels={availableModels}
        onModelChange={handleModelChange}
        sendMessage={sendMessage}
        chatHistory={chatHistory}
        streamingMessage={streamingMessage}
        isConnected={isConnected}
        commandResult={commandResult}
      />
    )), [selectedModel, availableModels, handleModelChange, sendMessage, chatHistory, streamingMessage, isConnected, commandResult]
  )

  const MemoizedAvatarCard = useMemo(() => memo(() => <AvatarCard />), [])

  const MemoizedAudioVisualizer = useMemo(() => 
    memo(({ audioData, isUserAudio }) => (
      <AudioVisualizer 
        audioData={audioData} 
        isDarkTheme={isDarkTheme}
        isUserAudio={isUserAudio}
      />
    )), [isDarkTheme]
  )

  const saveConfig = useCallback(() => {
    const config = {
      layout,
      isDarkTheme,
      ollamaApiUrl,
      userName,
    }
    localStorage.setItem('chatConfig', JSON.stringify(config))
    toast({
      title: "Configuration Saved",
      description: "Your settings have been saved.",
    })
  }, [layout, isDarkTheme, ollamaApiUrl, userName, toast])

  const loadConfig = useCallback(() => {
    const savedConfig = localStorage.getItem('chatConfig')
    if (savedConfig) {
      const config = JSON.parse(savedConfig)
      setLayout(config.layout || layout)
      setIsDarkTheme(config.isDarkTheme)
      setOllamaApiUrl(config.ollamaApiUrl || ollamaApiUrl)
      setUserName(config.userName || '')
    }
  }, [])

  // Smart hover detection for side panel
  const isOverCard = useCallback((x, y) => {
    // Check if cursor is over any grid layout card
    const cards = document.querySelectorAll('[data-grid]')
    for (let card of cards) {
      const rect = card.getBoundingClientRect()
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return true
      }
    }
    return false
  }, [])

  const handleHoverTrigger = useCallback((e) => {
    const { clientX, clientY } = e
    // Only show panel when hovering over the pull tab trigger area
    const isInTriggerArea = clientX > window.innerWidth - 32 && clientY > 96 && clientY < 144 // Pull tab area
    const isOverCardArea = isOverCard(clientX, clientY)
    
    if (isInTriggerArea && !isOverCardArea) {
      setShowSidePanel(true)
    }
  }, [isOverCard])

  // Global mouse position tracking - separate logic for show/hide
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
      
      // Only hide if mouse is completely away from the panel area
      if (showSidePanel) {
        const isOverSidePanel = e.clientX > window.innerWidth - 80 && e.clientY > 64
        if (!isOverSidePanel) {
          setShowSidePanel(false)
        }
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [showSidePanel])



  const addComponent = useCallback((componentId) => {
    setLayout(prev => [...prev, { i: componentId, x: 0, y: Infinity, w: 6, h: 6 }])
  }, [])

  const removeComponent = useCallback((componentId) => {
    setLayout(prev => prev.filter(item => item.i !== componentId))
  }, [])

  const toggleSpeechRecognition = useCallback(() => {
    setIsSpeechRecognitionActive(prev => !prev)
    sendMessage('command', isSpeechRecognitionActive ? '/speech_rec off' : '/speech_rec on')
  }, [isSpeechRecognitionActive, sendMessage])

  const toggleSpeechGeneration = useCallback(() => {
    setIsSpeechGenerationActive(prev => !prev)
    sendMessage('command', isSpeechGenerationActive ? '/speech_gen off' : '/speech_gen on')
  }, [isSpeechGenerationActive, sendMessage])

  const toggleVision = useCallback(() => {
    setIsVisionActive(prev => !prev)
    sendMessage('command', isVisionActive ? '/vision_off' : '/vision_on')
  }, [isVisionActive, sendMessage])

  const toggleImageGeneration = useCallback(() => {
    setIsImageGenerationActive(prev => !prev)
    sendMessage('command', isImageGenerationActive ? '/image_gen_off' : '/image_gen_on')
  }, [isImageGenerationActive, sendMessage])

  const toggleAvatarLipSync = useCallback(() => {
    setIsAvatarLipSyncActive(prev => !prev)
    sendMessage('command', isAvatarLipSyncActive ? '/avatar_sync_off' : '/avatar_sync_on')
  }, [isAvatarLipSyncActive, sendMessage])

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'S') {
        toggleSpeechRecognition()
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [toggleSpeechRecognition])

  return (
    <ToastProvider>
      {/* Fixed Top Header Bar */}
      <div 
        className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, hsl(0 0% 11%) 0%, hsl(0 0% 8%) 100%)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid hsl(52 100% 55% / 0.3)',
          boxShadow: '0 4px 20px hsl(0 0% 0% / 0.5)'
        }}
      >
        <h1 
          className="text-2xl font-bold select-none tracking-wide"
          style={{
            color: 'hsl(52 100% 55%)',
            textShadow: `
              0 0 5px hsl(52 100% 55% / 0.8),
              0 0 10px hsl(52 100% 55% / 0.6),
              0 0 15px hsl(52 100% 55% / 0.4),
              0 0 20px hsl(52 100% 55% / 0.2)
            `,
            animation: 'glowPulse 3s ease-in-out infinite alternate'
          }}
        >
          Chatbot-Nextjs-WebUI
        </h1>
      </div>

      <div className="h-screen w-full pt-20 p-4 bg-background text-foreground font-mono">
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={40}
          onLayoutChange={handleLayoutChange}
          onDragStart={handleDragStart}
          onDragStop={handleDragStop}
          onResizeStart={handleDragStart}
          onResizeStop={handleDragStop}
          isDraggable
          isResizable
          draggableCancel=".non-draggable"
          useCSSTransforms={true}
          compactType="vertical"
          preventCollision={false}
          margin={[8, 8]}
          containerPadding={[0, 0]}
          resizeHandles={['se']}
          transformScale={1}
        >
          {layout.map(item => (
            <div key={item.i} className="overflow-hidden">
              {item.i === 'avatar' && <MemoizedAvatarCard />}
              {item.i === 'chat' && <MemoizedChatSection />}
              {item.i === 'audioVisualizer' && (
                <div className="flex h-full">
                  <div className="flex-1 mr-1">
                    <MemoizedAudioVisualizer 
                      audioData={userAudioData} 
                      isUserAudio={true}
                    />
                  </div>
                  <div className="flex-1 ml-1">
                    <MemoizedAudioVisualizer 
                      audioData={llmAudioData} 
                      isUserAudio={false}
                    />
                  </div>
                </div>
              )}
              <Button
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center non-draggable"
                style={{
                  width: '28px',
                  height: '28px',
                  padding: '0'
                }}
                onClick={() => removeComponent(item.i)}
              >
                <X size={16} />
              </Button>
            </div>
          ))}
        </ResponsiveGridLayout>

        {/* Arrow Tab Indicator */}
        <div 
          className={`fixed top-24 right-0 z-40 transition-all duration-300 ease-in-out ${
            showSidePanel ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
          }`}
          style={{
            width: '24px',
            height: '48px',
            background: 'linear-gradient(135deg, hsl(52 100% 55%) 0%, hsl(52 100% 50%) 100%)',
            clipPath: 'polygon(0 20%, 100% 0, 100% 100%, 0 80%)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
          }}
          onMouseEnter={handleHoverTrigger}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="text-xs font-bold transform -rotate-90"
              style={{ color: 'hsl(0 0% 15%)', fontSize: '10px' }}
            >
              ◀
            </div>
          </div>
        </div>

        {/* Hidden Side Panel */}
        <div 
          className={`fixed top-0 right-0 h-full w-20 z-50 transition-all duration-300 ease-in-out ${
            showSidePanel ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          }`}
          onMouseEnter={() => {
            setShowSidePanel(true)
          }}
          style={{
            background: 'linear-gradient(90deg, transparent 0%, hsl(0 0% 11%) 25%, hsl(0 0% 11%) 100%)',
            backdropFilter: 'blur(8px)',
            borderLeft: '1px solid hsl(52 100% 55% / 0.2)'
          }}
        >
          <div className="absolute top-0 right-4 h-full flex flex-col items-center justify-start pt-16 gap-4">
            <Button
              className="rounded-full hover:opacity-90 hover:scale-110 transition-all duration-200 flex items-center justify-center shadow-lg"
              style={{
                backgroundColor: 'hsl(52 100% 55%)',
                color: 'hsl(0 0% 15%)',
                width: '48px',
                height: '48px',
                padding: '0'
              }}
              onClick={() => setIsProfileOpen(true)}
            >
              <User size={22} />
            </Button>

            <Button
              className="rounded-full hover:opacity-90 hover:scale-110 transition-all duration-200 flex items-center justify-center shadow-lg"
              style={{
                backgroundColor: isSpeechRecognitionActive ? 'hsl(120 60% 45%)' : 'hsl(52 100% 55%)',
                color: 'hsl(0 0% 15%)',
                width: '48px',
                height: '48px',
                padding: '0'
              }}
              onClick={toggleSpeechRecognition}
            >
              <Mic size={22} />
            </Button>

            <Button
              className="rounded-full hover:opacity-90 hover:scale-110 transition-all duration-200 flex items-center justify-center shadow-lg"
              style={{
                backgroundColor: isSpeechGenerationActive ? 'hsl(120 60% 45%)' : 'hsl(52 100% 55%)',
                color: 'hsl(0 0% 15%)',
                width: '48px',
                height: '48px',
                padding: '0'
              }}
              onClick={toggleSpeechGeneration}
            >
              <Volume2 size={22} />
            </Button>

            <Button
              className="rounded-full hover:opacity-90 hover:scale-110 transition-all duration-200 flex items-center justify-center shadow-lg"
              style={{
                backgroundColor: isVisionActive ? 'hsl(120 60% 45%)' : 'hsl(52 100% 55%)',
                color: 'hsl(0 0% 15%)',
                width: '48px',
                height: '48px',
                padding: '0'
              }}
              onClick={toggleVision}
            >
              <Eye size={22} />
            </Button>

            <Button
              className="rounded-full hover:opacity-90 hover:scale-110 transition-all duration-200 flex items-center justify-center shadow-lg"
              style={{
                backgroundColor: isImageGenerationActive ? 'hsl(120 60% 45%)' : 'hsl(52 100% 55%)',
                color: 'hsl(0 0% 15%)',
                width: '48px',
                height: '48px',
                padding: '0'
              }}
              onClick={toggleImageGeneration}
            >
              <Image size={22} />
            </Button>

            <Button
              className="rounded-full hover:opacity-90 hover:scale-110 transition-all duration-200 flex items-center justify-center shadow-lg"
              style={{
                backgroundColor: isAvatarLipSyncActive ? 'hsl(120 60% 45%)' : 'hsl(52 100% 55%)',
                color: 'hsl(0 0% 15%)',
                width: '48px',
                height: '48px',
                padding: '0'
              }}
              onClick={toggleAvatarLipSync}
            >
              <Smile size={22} />
            </Button>
            
            <Button
              className="rounded-full hover:opacity-90 hover:scale-110 transition-all duration-200 flex items-center justify-center shadow-lg"
              style={{
                backgroundColor: 'hsl(52 100% 55%)',
                color: 'hsl(0 0% 15%)',
                width: '48px',
                height: '48px',
                padding: '0'
              }}
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings size={22} />
            </Button>
          </div>
        </div>

        {/* Hover trigger area - specifically for the pull tab */}
        <div 
          className="fixed top-24 right-0 w-8 h-12 bg-transparent z-40"
          onMouseEnter={handleHoverTrigger}
        />

        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className={`${isDarkTheme ? 'bg-gray-800 text-green-400' : 'bg-white text-gray-900'}`}>
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <Switch
                  id="dark-mode"
                  checked={isDarkTheme}
                  onCheckedChange={setIsDarkTheme}
                />
              </div>
              <div>
                <Label htmlFor="ollama-api">Ollama API URL</Label>
                <Input
                  id="ollama-api"
                  value={ollamaApiUrl}
                  onChange={(e) => setOllamaApiUrl(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Add Component</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {availableComponents.map(component => (
                    <Button
                      key={component.id}
                      onClick={() => addComponent(component.id)}
                      className="w-full"
                    >
                      <Plus size={16} className="mr-2" />
                      {component.name}
                    </Button>
                  ))}
                </div>
              </div>
              <Button onClick={saveConfig}>Save Configuration</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
          <DialogContent className={`${isDarkTheme ? 'bg-gray-800 text-green-400' : 'bg-white text-gray-900'}`}>
            <DialogHeader>
              <DialogTitle>User Profile</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col space-y-4">
              <div>
                <Label htmlFor="user-name">Name</Label>
                <Input
                  id="user-name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button onClick={() => {
                saveConfig()
                setIsProfileOpen(false)
              }}>
                Save Profile
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {!isConnected && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md">
            {reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS
              ? "Connection failed. Please refresh the page."
              : "WebSocket disconnected. Attempting to reconnect..."}
          </div>
        )}
      </div>
    </ToastProvider>
  )
}