import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PhoneOff, Minus } from 'lucide-react';
import { useAudioDevices } from '@/hooks/useAudioDevices';

interface CallState {
  status: 'idle' | 'connecting' | 'calling' | 'answered' | 'hangup' | 'other_hangup';
  callId?: string;
  startTime?: Date;
  phoneNumber?: string;
}

interface CallInterfaceProps {
  callState: CallState;
  onHangUp: () => void;
  onMinimize: () => void;
}

export function CallInterface({ callState, onHangUp, onMinimize }: CallInterfaceProps) {
  const [duration, setDuration] = useState(0);
  const { selectedOutputDevice, setAudioOutputDevice } = useAudioDevices();

  // Ensure audio elements exist before Verto needs them
  useEffect(() => {
    const createAudioElements = () => {
      // Remove existing elements to avoid duplicates
      const existingContainer = document.getElementById('verto-audio-container');
      if (existingContainer) {
        existingContainer.remove();
      }

      // Create container
      const container = document.createElement('div');
      container.id = 'verto-audio-container';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = '1px';
      container.style.height = '1px';

      // Create main audio element for remote stream
      const mainAudio = document.createElement('audio');
      mainAudio.id = 'main_audio';
      mainAudio.autoplay = true;
      (mainAudio as any).playsInline = true;
      mainAudio.controls = false;
      mainAudio.volume = 1.0;
      
      mainAudio.addEventListener('loadedmetadata', () => {
        console.log('🎵 main_audio: metadata loaded');
      });
      
      mainAudio.addEventListener('canplay', () => {
        console.log('🎵 main_audio: can play');
        if (mainAudio.srcObject) {
          mainAudio.play().catch(e => console.error('❌ main_audio play failed:', e));
        }
      });
      
      mainAudio.addEventListener('play', () => {
        console.log('✅ main_audio: PLAYING!');
      });

      // Create audio element for local stream  
      const audioElement = document.createElement('audio');
      audioElement.id = 'audio_element';
      audioElement.autoplay = true;
      (audioElement as any).playsInline = true;
      audioElement.controls = false;
      audioElement.muted = true;

      container.appendChild(mainAudio);
      container.appendChild(audioElement);
      document.body.appendChild(container);

      console.log('🔧 Audio elements created and added to document');

      // Monitor for srcObject changes
      Object.defineProperty(mainAudio, 'srcObject', {
        get() { return this._srcObject; },
        set(value) {
          console.log('🎯 Setting srcObject on main_audio:', value);
          this._srcObject = value;
          if (value) {
            console.log('🎵 Stream tracks:', value.getTracks().map(t => `${t.kind}:${t.enabled}`));
            
            // Try to play immediately
            this.play().then(() => {
              console.log('✅ Auto-play successful');
            }).catch(err => {
              console.error('❌ Auto-play blocked:', err);
              console.log('💡 Click anywhere to enable audio');
              
              // Add click handler for user interaction
              const enableAudio = () => {
                this.play().then(() => {
                  console.log('✅ Audio enabled after user interaction');
                  document.removeEventListener('click', enableAudio);
                }).catch(e => console.error('❌ Manual play failed:', e));
              };
              document.addEventListener('click', enableAudio);
            });
          }
        }
      });

      return { mainAudio, audioElement };
    };

    const audioElements = createAudioElements();

    // Apply selected audio device
    if (selectedOutputDevice) {
      setAudioOutputDevice(selectedOutputDevice, audioElements.mainAudio);
    }

    return () => {
      const container = document.getElementById('verto-audio-container');
      if (container) {
        container.remove();
      }
    };
  }, []);

  // Update audio device when selection changes
  useEffect(() => {
    const mainAudio = document.getElementById('main_audio') as HTMLAudioElement;
    if (mainAudio && selectedOutputDevice) {
      setAudioOutputDevice(selectedOutputDevice, mainAudio);
    }
  }, [selectedOutputDevice, setAudioOutputDevice]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (callState.status === 'answered' && callState.startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - callState.startTime!.getTime()) / 1000);
        setDuration(diff);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState.status, callState.startTime]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callState.status) {
      case 'connecting':
        return 'Kopplar upp...';
      case 'calling':
        return 'Ringer...';
      case 'answered':
        return 'Pågående samtal';
      case 'hangup':
        return 'Samtalet avslutat';
      case 'other_hangup':
        return 'Personen lade på';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (callState.status) {
      case 'connecting':
        return 'text-yellow-400';
      case 'calling':
        return 'text-blue-400';
      case 'answered':
        return 'text-green-400';
      case 'hangup':
        return 'text-red-400';
      case 'other_hangup':
        return 'text-orange-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      
      {/* Header with minimize button */}
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={onMinimize}
          className="hover:bg-muted"
        >
          <Minus className="h-4 w-4" />
        </Button>
      </div>

      {/* Main call interface */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center space-y-6 max-w-md">
          {/* Phone number */}
          <div className="space-y-2">
            <h1 className="text-3xl font-light">
              {callState.phoneNumber || 'Okänt nummer'}
            </h1>
            
            {/* Status */}
            <p className={`text-lg ${getStatusColor()}`}>
              {getStatusText()}
            </p>
          </div>

          {/* Call duration */}
          {callState.status === 'answered' && (
            <div className="text-2xl font-mono text-muted-foreground">
              {formatDuration(duration)}
            </div>
          )}

          {/* Loading animation for connecting */}
          {callState.status === 'connecting' && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Pulsing animation for calling */}
          {callState.status === 'calling' && (
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                <div className="absolute inset-0 w-16 h-16 bg-blue-600 rounded-full animate-pulse"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-8">
        <div className="flex justify-center">
          <Button
            onClick={onHangUp}
            variant="destructive"
            size="lg"
            className="rounded-full w-16 h-16 p-0"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}