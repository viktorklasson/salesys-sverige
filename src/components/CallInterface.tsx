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

  // Set audio output device when component mounts or device changes
  useEffect(() => {
    const audioElements = [
      document.getElementById('main_audio'),
      document.getElementById('audio_element'),
      document.getElementById('verto-audio'),
      document.getElementById('remote-audio')
    ].filter(Boolean) as HTMLAudioElement[];
    
    if (audioElements.length > 0 && selectedOutputDevice) {
      console.log('Setting audio output device on call interface:', selectedOutputDevice);
      audioElements.forEach(audioElement => {
        setAudioOutputDevice(selectedOutputDevice, audioElement);
      });
    }
  }, [selectedOutputDevice, setAudioOutputDevice]);

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
      {/* Verto audio elements - multiple IDs that Verto library may use */}
      <div id="verto-phone-container" className="hidden">
        <audio 
          id="main_audio" 
          autoPlay 
          playsInline 
          controls={false}
          style={{ display: 'none' }}
          onLoadedMetadata={() => console.log('Main audio: metadata loaded')}
          onCanPlay={() => console.log('Main audio: can play')}
          onPlay={() => console.log('Main audio: started playing')}
          onVolumeChange={() => console.log('Main audio: volume changed')}
          onError={(e) => console.error('Main audio error:', e)}
        />
        <audio 
          id="audio_element" 
          autoPlay 
          playsInline 
          controls={false}
          style={{ display: 'none' }}
          onLoadedMetadata={() => console.log('Audio element: metadata loaded')}
          onCanPlay={() => console.log('Audio element: can play')}
          onPlay={() => console.log('Audio element: started playing')}
          onError={(e) => console.error('Audio element error:', e)}
        />
        {/* Additional Verto-specific audio elements */}
        <audio 
          id="verto-audio" 
          autoPlay 
          playsInline 
          controls={false}
          style={{ display: 'none' }}
        />
        <audio 
          id="remote-audio" 
          autoPlay 
          playsInline 
          controls={false}
          style={{ display: 'none' }}
        />
      </div>
      
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