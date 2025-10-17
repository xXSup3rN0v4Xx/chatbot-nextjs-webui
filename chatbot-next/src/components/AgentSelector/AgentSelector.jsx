import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, RefreshCw, Trash2, Bot, Edit } from 'lucide-react'

export default function AgentSelector({ 
  currentAgentId, 
  onAgentChange,
  onAgentCreate,
  onAgentDelete
}) {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState(null)
  const [availableModels, setAvailableModels] = useState([])
  const [newAgent, setNewAgent] = useState({
    name: '',
    agent_type: 'corecoder',
    description: ''
  })

  // Load agents from API
  const loadAgents = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8001/agents/')
      if (response.ok) {
        const data = await response.json()
        setAgents(data)
      }
    } catch (error) {
      console.error('Failed to load agents:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load available models from websocket bridge
  const loadAvailableModels = async () => {
    try {
      const response = await fetch('http://localhost:2020/available_models')
      if (response.ok) {
        const data = await response.json()
        if (data.models && Array.isArray(data.models)) {
          setAvailableModels(data.models)
        }
      }
    } catch (error) {
      console.error('Failed to load models:', error)
      // Fallback models
      setAvailableModels(['qwen2.5-coder:3b', 'gemma2:4b', 'llama3.2'])
    }
  }

  useEffect(() => {
    loadAgents()
    loadAvailableModels()
  }, [])

  const handleCreateAgent = async () => {
    if (!newAgent.name.trim()) return

    try {
      const response = await fetch('http://localhost:8001/agents/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent)
      })

      if (response.ok) {
        const createdAgent = await response.json()
        setAgents([...agents, createdAgent])
        setIsCreateDialogOpen(false)
        setNewAgent({ name: '', agent_type: 'corecoder', description: '' })
        
        // Notify parent to switch to new agent
        if (onAgentCreate) {
          onAgentCreate(createdAgent.agent_id)
        }
      }
    } catch (error) {
      console.error('Failed to create agent:', error)
    }
  }

  const handleDeleteAgent = async (agentId) => {
    if (!confirm('Are you sure you want to delete this agent?')) return

    try {
      const response = await fetch(`http://localhost:8001/agents/${agentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Remove from local state
        setAgents(agents.filter(a => a.agent_id !== agentId))
        
        // Notify parent
        if (onAgentDelete) {
          onAgentDelete(agentId)
        }
        
        // Force reload to ensure sync
        await loadAgents()
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to delete agent:', response.status, errorData)
        alert(`Failed to delete agent: ${errorData.detail || response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to delete agent:', error)
      alert('Failed to delete agent. Check console for details.')
    }
  }

  const handleEditAgent = (agent) => {
    // Get the current ollama model from agent config
    const currentModel = agent.models?.large_language_model?.ollama?.instances?.[0]?.model || ''
    
    setEditingAgent({
      agent_id: agent.agent_id,
      name: agent.name || agent.agent_name,
      agent_type: agent.agent_type || 'corecoder',
      description: agent.description || '',
      model: currentModel
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveAgent = async () => {
    if (!editingAgent || !editingAgent.name.trim()) return

    try {
      // Update agent basic info and model
      const response = await fetch(`http://localhost:8001/agents/${editingAgent.agent_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingAgent.name,
          description: editingAgent.description,
          models: {
            large_language_model: {
              ollama: {
                instances: [{
                  model: editingAgent.model
                }]
              }
            }
          }
        })
      })

      if (response.ok) {
        // Reload agents to get updated data
        await loadAgents()
        setIsEditDialogOpen(false)
        setEditingAgent(null)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to update agent:', response.status, errorData)
        alert(`Failed to update agent: ${errorData.detail || response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to update agent:', error)
      alert('Failed to update agent. Check console for details.')
    }
  }

  return (
    <Card className="h-full bg-gray-900/95 border-2" style={{ borderColor: 'hsl(52 100% 55%)', transform: 'translateZ(0)', willChange: 'contents' }}>
      <CardHeader className="pb-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" style={{ color: 'hsl(52 100% 55%)' }} />
            <CardTitle className="text-lg text-white">Agents</CardTitle>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={loadAgents}
              disabled={loading}
              className="h-7 w-7 hover:bg-gray-700 non-draggable"
              style={{ color: 'hsl(52 100% 55%)' }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCreateDialogOpen(true)}
              className="h-7 w-7 hover:bg-gray-700 non-draggable"
              style={{ color: 'hsl(52 100% 55%)' }}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 overflow-y-auto" style={{ maxHeight: 'calc(100% - 60px)' }}>
        {agents.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No agents found</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateDialogOpen(true)}
              className="mt-4"
            >
              Create Your First Agent
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map(agent => (
              <div
                key={agent.agent_id}
                className={`p-3 rounded-lg border-2 transition-all cursor-pointer mb-2 ${
                  currentAgentId === agent.agent_id
                    ? 'border-yellow-400 shadow-lg shadow-yellow-400/20'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                style={{
                  backgroundColor: currentAgentId === agent.agent_id 
                    ? 'hsla(52, 100%, 55%, 0.1)' 
                    : 'hsl(0 0% 12%)',
                  borderColor: currentAgentId === agent.agent_id 
                    ? 'hsl(52 100% 55%)' 
                    : undefined
                }}
                onClick={() => onAgentChange && onAgentChange(agent.agent_id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white text-sm truncate">{agent.name}</h3>
                    <p className="text-xs mt-1" style={{ color: 'hsl(52 100% 70%)' }}>
                      {agent.agent_type || 'corecoder'}
                    </p>
                    {agent.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {agent.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditAgent(agent)
                      }}
                      className="h-7 w-7 hover:bg-yellow-500/20 non-draggable"
                      style={{ color: 'hsl(52 100% 55%)' }}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteAgent(agent.agent_id)
                      }}
                      className="h-7 w-7 hover:bg-red-500/20 hover:text-red-400 non-draggable"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create Agent Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="agent-name" className="text-gray-300">Agent Name</Label>
              <Input
                id="agent-name"
                value={newAgent.name}
                onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                placeholder="My Assistant"
                className="bg-gray-800 border-gray-700 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="agent-type" className="text-gray-300">Agent Type</Label>
              <Select
                value={newAgent.agent_type}
                onValueChange={(value) => setNewAgent({ ...newAgent, agent_type: value })}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="corecoder">CoreCoder</SelectItem>
                  <SelectItem value="example">Example/Multimodal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="agent-description" className="text-gray-300">Description (Optional)</Label>
              <Textarea
                id="agent-description"
                value={newAgent.description}
                onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                placeholder="What does this agent do?"
                className="bg-gray-800 border-gray-700 text-white mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAgent} disabled={!newAgent.name.trim()}>
              Create Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Agent Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Agent</DialogTitle>
          </DialogHeader>
          {editingAgent && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-agent-name" className="text-gray-300">Agent Name</Label>
                <Input
                  id="edit-agent-name"
                  value={editingAgent.name}
                  onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                  placeholder="Agent Name"
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-agent-model" className="text-gray-300">Ollama Model</Label>
                <Select
                  value={editingAgent.model}
                  onValueChange={(value) => setEditingAgent({ ...editingAgent, model: value })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {availableModels.map(model => (
                      <SelectItem key={model} value={model}>{model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-agent-description" className="text-gray-300">Description (Optional)</Label>
                <Textarea
                  id="edit-agent-description"
                  value={editingAgent.description}
                  onChange={(e) => setEditingAgent({ ...editingAgent, description: e.target.value })}
                  placeholder="What does this agent do?"
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false)
              setEditingAgent(null)
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveAgent} 
              disabled={!editingAgent || !editingAgent.name.trim()}
              style={{ backgroundColor: 'hsl(52 100% 55%)', color: 'black' }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
