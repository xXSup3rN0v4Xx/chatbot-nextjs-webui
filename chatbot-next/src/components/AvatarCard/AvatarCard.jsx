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
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const fileInputRef = useRef(null)
  const dialogOpenTimeRef = useRef(0)
  const allowCloseRef = useRef(false)

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAvatarSource(URL.createObjectURL(file))
      setAvatarType(file.type.startsWith('image/') ? 'image' : 'video')
    }
  }

  return (
    <>
    <Card className="w-full h-full bg-card text-foreground relative" style={{ transform: 'translateZ(0)', willChange: 'contents' }}>
      <CardContent className="flex flex-col items-center justify-center h-full p-2 overflow-hidden">
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
              {/* Debug state indicator */}
              {isDialogOpen && (
                <div style={{position: 'absolute', top: 0, left: 0, background: 'red', color: 'white', padding: '4px', fontSize: '10px', zIndex: 99999}}>
                  Dialog State: OPEN
                </div>
              )}
            </div>
          )}
        </div>
        {avatarName && (
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 py-1 px-2 text-center"
               style={{ color: 'hsl(52 100% 55%)' }}>
            {avatarName}
          </div>
        )}
      </CardContent>
      
      {/* Settings Button - positioned in bottom-right corner as part of card border */}
      <button
        type="button"
        className="non-draggable avatar-settings-trigger"
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
          console.log('=== AVATAR SETTINGS BUTTON CLICKED ===');
          console.log('Current isDialogOpen state:', isDialogOpen);
          dialogOpenTimeRef.current = Date.now();
          allowCloseRef.current = false;
          // Use setTimeout to ensure state update happens after event completes
          setTimeout(() => {
            console.log('Setting isDialogOpen to true');
            setIsDialogOpen(true);
          }, 0);
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Avatar settings button pointer down');
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(52 100% 60%)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(52 100% 55%)'}
      >
        <Settings size={16} />
      </button>
        
        <Dialog 
          open={isDialogOpen} 
          onOpenChange={(open) => {
            console.log('AvatarCard Dialog onOpenChange called with:', open, 'allowClose:', allowCloseRef.current)
            // Only allow closing if explicitly allowed (X button or ESC pressed)
            if (!open) {
              if (allowCloseRef.current) {
                console.log('Allowing dialog close - explicitly requested');
                setIsDialogOpen(false);
                allowCloseRef.current = false;
              } else {
                console.log('BLOCKING dialog close - not explicitly requested');
              }
            } else {
              console.log('Dialog opening');
              setIsDialogOpen(true);
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
                    console.log('Avatar X button clicked - allowing close');
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
              console.log('AvatarCard: ESC pressed - closing')
              allowCloseRef.current = true;
              setIsDialogOpen(false)
            }}
            onPointerDownOutside={(e) => {
              console.log('Avatar dialog: onPointerDownOutside triggered', e.target);
              // Always prevent default - dialog should only close via X button or ESC
              e.preventDefault();
            }}
            onInteractOutside={(e) => {
              console.log('Avatar dialog: onInteractOutside triggered', e.target);
              // Always prevent default - dialog should only close via X button or ESC
              e.preventDefault();
            }}
          >
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
    </Card>
    </>
  )
}