import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PhoneOff, Minus } from 'lucide-react';
import { useAudioDevices } from '@/hooks/useAudioDevices';
import { useAudioElementManager } from '@/hooks/useAudioElementManager';

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
  const { ensureAudioElementsExist, cleanupAudioElements } = useAudioElementManager();

  // Ensure audio elements exist when call interface mounts
  useEffect(() => {
    console.log('🎯 CallInterface mounted, ensuring audio elements exist...');
    const audioElements = ensureAudioElementsExist();
    
    // Apply selected audio device
    if (selectedOutputDevice && audioElements.mainAudio) {
      setAudioOutputDevice(selectedOutputDevice, audioElements.mainAudio);
    }

    // Cleanup when component unmounts
    return () => {
      console.log('🧹 CallInterface unmounting...');
      // Don't cleanup here as the call might still be active
      // Cleanup will be handled by hangup process
    };
  }, [ensureAudioElementsExist, selectedOutputDevice, setAudioOutputDevice]);

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