import React, { useState, useRef } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Settings } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function AvatarCard() {
  const [avatarSource, setAvatarSource] = useState(null)
  const [avatarType, setAvatarType] = useState('image')
  const [avatarName, setAvatarName] = useState('')
  const [isSadTalkerActive, setIsSadTalkerActive] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAvatarSource(URL.createObjectURL(file))
      setAvatarType(file.type.startsWith('image/') ? 'image' : 'video')
    }
  }

  return (
    <Card className="w-full h-full bg-card text-foreground relative overflow-hidden">
      <CardContent className="flex flex-col items-center justify-center h-full p-2">
        <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-lg relative">
          {avatarSource ? (
            <>
              {avatarType === 'image' && (
                <img src={avatarSource} alt="Avatar" className="w-full h-full object-cover" />
              )}
              {avatarType === 'video' && (
                <video src={avatarSource} autoPlay loop muted className="w-full h-full object-cover" />
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span 
                className="text-3xl font-bold select-none"
                style={{ color: 'hsl(52 100% 55%)' }}
              >
                AVATAR
              </span>
            </div>
          )}
        </div>
        {avatarName && (
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 py-1 px-2 text-center"
               style={{ color: 'hsl(52 100% 55%)' }}>
            {avatarName}
          </div>
        )}
        <Dialog>
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
              <Settings size={16} />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card text-foreground border-accent">
            <DialogHeader>
              <DialogTitle style={{color: 'hsl(52 100% 55%)'}}>Avatar Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Avatar Name</label>
                <Input
                  value={avatarName}
                  onChange={(e) => setAvatarName(e.target.value)}
                  placeholder="Enter avatar name"
                  className="bg-card text-foreground border-accent non-draggable"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Select Avatar File (Image, GIF, or MP4)</label>
                <Input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileInput}
                  className="bg-card text-foreground border-accent non-draggable"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Activate SadTalker Lip Sync</label>
                <Switch
                  checked={isSadTalkerActive}
                  onCheckedChange={setIsSadTalkerActive}
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