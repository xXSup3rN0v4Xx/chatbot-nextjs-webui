import React, { useRef, useEffect, useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { dracula } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import { Copy, Check, Paperclip, X, Send, File, FileCode, FileImage } from 'lucide-react'
import { Eye, Code } from 'lucide-react'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { InlineMath, BlockMath } from 'react-katex'

import 'katex/dist/katex.min.css'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Format timestamp to relative time
const formatTimestamp = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default function ChatSection({ 
  selectedModel, 
  availableModels, 
  onModelChange, 
  sendMessage, 
  chatHistory,
  streamingMessage,
  isConnected,
  commandResult
}) {
  // Debug logging
  useEffect(() => {
    console.log('ChatSection render - selectedModel:', selectedModel)
    console.log('ChatSection render - availableModels:', availableModels)
    console.log('ChatSection render - chatHistory length:', chatHistory?.length)
    console.log('ChatSection render - chatHistory:', chatHistory)
  }, [selectedModel, availableModels, chatHistory])
  
  const [message, setMessage] = useState('')
  const chatContainerRef = useRef(null)
  const [currentStream, setCurrentStream] = useState({ role: 'assistant', content: '' })
  const [copiedStates, setCopiedStates] = useState({})
  const [attachedFiles, setAttachedFiles] = useState([]) // Files attached to current message
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current
      const isNearBottom = scrollHeight - chatContainerRef.current.scrollTop <= clientHeight + 100
      
      if (isNearBottom) {
        chatContainerRef.current.scrollTop = scrollHeight
      }
    }
  }, [chatHistory, currentStream])

  useEffect(() => {
    if (streamingMessage) {
      setCurrentStream(prev => ({
        role: 'assistant',
        content: prev.content + streamingMessage
      }))
    } else {
      setCurrentStream({ role: 'assistant', content: '' })
    }
  }, [streamingMessage])

  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedStates(prev => ({ ...prev, [id]: true }))
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [id]: false }))
      }, 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    const newFiles = []

    for (const file of files) {
      try {
        const extension = file.name.split('.').pop().toLowerCase()
        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(extension)
        
        if (isImage) {
          // Handle image files - convert to base64
          const reader = new FileReader()
          const base64Promise = new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
          
          const base64 = await base64Promise
          newFiles.push({
            name: file.name,
            content: base64,
            type: 'image',
            size: file.size,
            preview: base64 // For thumbnail display
          })
        } else {
          // Handle text/code files
          const text = await file.text()
          newFiles.push({
            name: file.name,
            content: text,
            language: getLanguageFromExtension(extension),
            type: 'code',
            size: file.size
          })
        }
      } catch (err) {
        console.error(`Error reading file ${file.name}:`, err)
      }
    }

    // Add to attached files instead of opening dialog
    setAttachedFiles([...attachedFiles, ...newFiles])
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachedFile = (index) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index))
  }

  const getLanguageFromExtension = (ext) => {
    const languageMap = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      rb: 'ruby',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      php: 'php',
      html: 'html',
      css: 'css',
      json: 'json',
      yml: 'yaml',
      yaml: 'yaml',
      md: 'markdown',
      sql: 'sql',
      sh: 'bash',
      bash: 'bash',
      rs: 'rust',
      go: 'go',
      swift: 'swift',
      kt: 'kotlin',
    }
    return languageMap[ext] || 'plaintext'
  }

  const handleSend = async () => {
    if (!isConnected) return
    
    // Handle case with attached files
    if (attachedFiles.length > 0) {
      const userMessage = message.trim()
      let fullMessage = userMessage
      
      // Process each attached file
      for (const file of attachedFiles) {
        if (file.type === 'image') {
          // For images, use vision API
          try {
            const response = await fetch('http://localhost:8000/api/v1/multimodal/vision', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                image: file.content,
                prompt: userMessage || "Describe this image in detail.",
              }),
            })
            
            if (response.ok) {
              const data = await response.json()
              fullMessage += `\n\n[Image: ${file.name}]\n${data.description || data.response}`
            }
          } catch (err) {
            console.error('Vision API error:', err)
            fullMessage += `\n\n[Image: ${file.name}] (Could not analyze)`
          }
        } else {
          // For code files, prepend the content
          fullMessage += `\n\n\`\`\`${file.language}\n// File: ${file.name}\n${file.content}\n\`\`\``
        }
      }
      
      sendMessage('chat_message', fullMessage)
      setMessage('')
      setAttachedFiles([])
    } else if (message.trim()) {
      // Regular message without files
      if (message.startsWith('/')) {
        sendMessage('command', message.trim())
      } else {
        sendMessage('chat_message', message.trim())
      }
      setMessage('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getMessageStyle = (msg) => {
    const baseStyle = "inline-block p-4 rounded-lg whitespace-pre-wrap break-words max-w-[80%] shadow-md relative group "
    
    switch(msg.role) {
      case 'user':
        // Rust orange/red like close button
        return baseStyle + 'text-white'
      case 'assistant':
        // Banana yellow like UI theme
        return baseStyle + 'text-gray-900'
      case 'system':
      default:
        return baseStyle + 'bg-amber-500 text-white'
    }
  }

  const getMessageBackgroundStyle = (msg) => {
    switch(msg.role) {
      case 'user':
        return { backgroundColor: '#ef4444' } // Rust red
      case 'assistant':
        return { backgroundColor: 'hsl(52 100% 55%)' } // Banana yellow
      case 'system':
      default:
        return { backgroundColor: '#f59e0b' } // Amber for system messages
    }
  }

  const CopyButton = ({ text, id }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 bg-black bg-opacity-20 hover:bg-opacity-30"
            onClick={() => handleCopy(text, id)}
          >
            {copiedStates[id] ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copiedStates[id] ? 'Copied!' : 'Copy message'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  const MarkdownContent = ({ content }) => {
    const [showRawLatex, setShowRawLatex] = useState({})
  
    const renderLatexContent = (text, id) => {
      // First, escape any literal backslashes that aren't part of LaTeX
      let processedText = text
  
      // Pattern to match LaTeX expressions including escaped delimiters
      const latexPattern = /(?:\\\[[\s\S]*?\\\]|\\\(.*?\\\)|\$\$[\s\S]*?\$\$|\$[^\n$]*?\$)/g
      const parts = []
      let lastIndex = 0
      let match
  
      while ((match = latexPattern.exec(processedText)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
          parts.push(processedText.slice(lastIndex, match.index))
        }
  
        const fullMatch = match[0]
        const isBlock = fullMatch.startsWith('\\[') || fullMatch.startsWith('$$')
        let latex
  
        if (fullMatch.startsWith('\\[')) {
          latex = fullMatch.slice(2, -2).trim()
        } else if (fullMatch.startsWith('$$')) {
          latex = fullMatch.slice(2, -2).trim()
        } else if (fullMatch.startsWith('\\(')) {
          latex = fullMatch.slice(2, -2).trim()
        } else {
          latex = fullMatch.slice(1, -1).trim()
        }
  
        const latexId = `${id}-latex-${match.index}`
        const showRaw = showRawLatex[latexId]
  
        parts.push(
          <span 
            key={latexId} 
            className="relative group inline-flex items-center"
          >
            <span className={`
              ${isBlock ? 'block my-4' : 'inline-block'} 
              latex-wrapper 
              hover:bg-opacity-10 
              hover:bg-blue-500 
              rounded 
              px-1
              ${isBlock ? 'w-full text-center' : ''}
            `}>
              {showRaw ? (
                <code className="bg-black bg-opacity-20 px-1 py-0.5 rounded text-sm font-mono">
                  {fullMatch}
                </code>
              ) : (
                isBlock ? (
                  <div className="text-blue-300">
                    <BlockMath math={latex} />
                  </div>
                ) : (
                  <span className="text-blue-300">
                    <InlineMath math={latex} />
                  </span>
                )
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={`
                        absolute -right-7 top-1/2 transform -translate-y-1/2
                        opacity-0 group-hover:opacity-100 transition-opacity
                        p-1 rounded-full bg-gray-800/50 hover:bg-gray-700/50
                        border border-gray-600/30 shadow-lg
                      `}
                      onClick={() => setShowRawLatex(prev => ({
                        ...prev,
                        [latexId]: !prev[latexId]
                      }))}
                    >
                      {showRaw ? (
                        <Eye className="h-3 w-3 text-gray-300" />
                      ) : (
                        <Code className="h-3 w-3 text-gray-300" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {showRaw ? 'Show rendered' : 'Show LaTeX'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>
          </span>
        )
  
        lastIndex = match.index + fullMatch.length
      }
  
      // Add remaining text
      if (lastIndex < processedText.length) {
        parts.push(processedText.slice(lastIndex))
      }
  
      return parts
    }
  
    return (
      <ReactMarkdown
        className="prose prose-invert max-w-none"
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => {
            if (typeof children === 'string') {
              const id = Math.random().toString(36).substr(2, 9)
              return <p className="mb-1">{renderLatexContent(children, id)}</p>
            }
            return <p className="mb-1">{children}</p>
          },
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''
            const codeId = `code-${Math.random().toString(36).substr(2, 9)}`
            
            return !inline ? (
              <div className="relative group">
                <SyntaxHighlighter
                  style={dracula}
                  language={language}
                  PreTag="div"
                  className="rounded-lg"
                  showLineNumbers={true}
                  customStyle={{
                    margin: 0,
                    borderRadius: '0.5rem',
                    fontSize: '0.9em',
                  }}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
                <CopyButton 
                  text={String(children)} 
                  id={codeId}
                />
              </div>
            ) : (
              <code
                className="bg-black bg-opacity-20 px-1 py-0.5 rounded text-sm"
                {...props}
              >
                {children}
              </code>
            )
          },
          pre: ({ children }) => <div className="overflow-x-auto">{children}</div>,
        }}
      >
        {content}
      </ReactMarkdown>
    )
  }

  return (
    <Card className="w-full h-full flex flex-col bg-card text-foreground font-mono" style={{ transform: 'translateZ(0)', willChange: 'contents' }}>
      {/* Model Selection at the top */}
      <div className="p-3 border-b non-draggable" style={{ borderColor: 'hsl(52 100% 55%)' }}>
        <Select value={selectedModel} onValueChange={onModelChange}>
          <SelectTrigger 
            className="w-full bg-card text-foreground non-draggable" 
            style={{ borderColor: 'hsl(52 100% 55%)' }}
            data-no-dnd="true"
            onClick={(e) => {
              e.stopPropagation()
              console.log('SelectTrigger clicked, current model:', selectedModel)
              console.log('Available models:', availableModels)
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <SelectValue placeholder="Select Model" />
          </SelectTrigger>
          <SelectContent 
            className="bg-card text-foreground non-draggable z-[99999]" 
            style={{ borderColor: 'hsl(52 100% 55%)' }}
            data-no-dnd="true"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {availableModels && availableModels.length > 0 ? (
              availableModels.map((model) => (
                <SelectItem 
                  key={model} 
                  value={model}
                  className="non-draggable"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {model}
                </SelectItem>
              ))
            ) : (
              <div className="p-2 text-sm text-muted-foreground">No models available</div>
            )}
          </SelectContent>
        </Select>
      </div>

      <CardContent 
        className="flex-grow overflow-y-auto p-4 scroll-smooth" 
        ref={chatContainerRef}
      >
        <div className="flex flex-col space-y-4">
          {chatHistory.map((msg, index) => (
            <div 
              key={`msg-${index}`}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={getMessageStyle(msg)} style={getMessageBackgroundStyle(msg)}>
                <MarkdownContent content={msg.content} />
                <CopyButton 
                  text={msg.content}
                  id={`msg-${index}`}
                />
              </div>
              {msg.timestamp && (
                <span className="text-xs text-gray-500 mt-1 px-2">
                  {formatTimestamp(msg.timestamp)}
                </span>
              )}
            </div>
          ))}
          
          {currentStream.content && (
            <div className="flex justify-start">
              <div className={getMessageStyle(currentStream)} style={getMessageBackgroundStyle(currentStream)}>
                <MarkdownContent content={currentStream.content} />
                <CopyButton 
                  text={currentStream.content}
                  id="current-stream"
                />
              </div>
            </div>
          )}
          
          {commandResult && (
            <div className="flex justify-start">
              <div className={getMessageStyle({ role: 'system' })} style={getMessageBackgroundStyle({ role: 'system' })}>
                <MarkdownContent content={commandResult} />
                <CopyButton 
                  text={commandResult}
                  id="command-result"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <div className="border-t" style={{ borderColor: 'hsl(52 100% 55%)' }}>
        {/* File Attachment Bar - Above Input */}
        {attachedFiles.length > 0 && (
          <div className="p-2 bg-gray-900/50 border-b" style={{ borderColor: 'hsl(52 100% 55% / 0.3)' }}>
            <div className="flex items-center gap-2 flex-wrap">
              {attachedFiles.map((file, index) => (
                <div
                  key={index}
                  className="relative group flex items-center gap-2 bg-gray-800 rounded-lg p-2 border-2"
                  style={{ borderColor: 'hsl(52 100% 55% / 0.5)' }}
                >
                  {file.type === 'image' ? (
                    // Image thumbnail
                    <div className="flex items-center gap-2">
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs text-green-400 font-medium truncate max-w-[150px]">
                          {file.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                  ) : (
                    // Code file icon
                    <div className="flex items-center gap-2">
                      <FileCode className="w-8 h-8 text-green-400" />
                      <div className="flex flex-col">
                        <span className="text-xs text-green-400 font-medium truncate max-w-[150px]">
                          {file.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {file.language} • {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                  )}
                  {/* Remove button */}
                  <button
                    onClick={() => removeAttachedFile(index)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors non-draggable"
                    style={{ zIndex: 10 }}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Input Area */}
        <div className="p-4 flex items-center gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={attachedFiles.length > 0 ? "Add a message (optional)..." : "Please type your message and press Enter to send"}
            className="flex-grow bg-gray-800 text-green-400 border-green-400 non-draggable"
            disabled={!isConnected}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 hover:bg-gray-700 non-draggable flex-shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4 text-green-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Upload code file</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
            accept=".js,.jsx,.ts,.tsx,.py,.rb,.java,.cpp,.c,.cs,.php,.html,.css,.json,.yml,.yaml,.md,.sql,.sh,.bash,.rs,.go,.swift,.kt,.png,.jpg,.jpeg,.gif,.bmp,.webp,.svg"
          />
          <Button 
            onClick={handleSend}
            className={`bg-green-600 text-white hover:bg-green-700 non-draggable flex-shrink-0 ${
              (!isConnected || (message.trim() === '' && attachedFiles.length === 0)) && 'opacity-50 cursor-not-allowed'
            }`}
            disabled={!isConnected || (message.trim() === '' && attachedFiles.length === 0)}
          >
            Send
          </Button>
        </div>
      </div>
    </Card>
  )
}