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
      {/* Audio elements for Verto - must be accessible */}
      <div id="verto-phone-container" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}>
        <audio 
          id="main_audio" 
          autoPlay 
          playsInline 
          controls={false}
          ref={(el) => {
            if (el) {
              el.volume = 1.0;
              console.log('🎵 main_audio element created and ready');
            }
          }}
          onLoadedData={() => console.log('🎵 main_audio: loadeddata event')}
          onLoadStart={() => console.log('🎵 main_audio: loadstart event')}
          onLoadedMetadata={() => console.log('🎵 main_audio: metadata loaded')}
          onCanPlay={() => {
            console.log('🎵 main_audio: can play');
            const audio = document.getElementById('main_audio') as HTMLAudioElement;
            if (audio && audio.srcObject) {
              console.log('🎵 main_audio has srcObject, attempting play...');
              audio.play().catch(e => console.error('❌ main_audio play failed:', e));
            }
          }}
          onPlay={() => console.log('✅ main_audio: PLAYING!')}
          onPause={() => console.log('⏸️ main_audio: paused')}
          onError={(e) => console.error('❌ main_audio error:', e)}
        />
        
        <audio 
          id="audio_element" 
          autoPlay 
          playsInline 
          controls={false}
          muted
          ref={(el) => {
            if (el) {
              el.volume = 1.0;
            }
          }}
          onPlay={() => console.log('🎤 audio_element: playing (local stream)')}
        />
      </div>

      {/* Monitor for Verto trying to access audio elements */}
      <script dangerouslySetInnerHTML={{
        __html: `
          console.log('🔍 Monitoring audio elements...');
          
          // Override getElementById to catch Verto's lookups
          const originalGetElementById = document.getElementById.bind(document);
          document.getElementById = function(id) {
            const element = originalGetElementById(id);
            if (id.includes('audio') || id === 'main_audio' || id === 'audio_element') {
              console.log('🔍 Verto looking for element:', id, element ? '✅ found' : '❌ not found');
            }
            return element;
          };

          // Monitor srcObject changes
          const checkAudioElements = () => {
            const mainAudio = originalGetElementById('main_audio');
            const audioElement = originalGetElementById('audio_element');
            
            if (mainAudio) {
              Object.defineProperty(mainAudio, 'srcObject', {
                get() { return this._srcObject; },
                set(value) {
                  console.log('🎯 Setting srcObject on main_audio:', value);
                  this._srcObject = value;
                  if (value) {
                    console.log('🎵 Stream tracks:', value.getTracks().map(t => t.kind + ':' + t.enabled));
                    this.play().then(() => {
                      console.log('✅ Auto-play successful on main_audio');
                    }).catch(err => {
                      console.error('❌ Auto-play failed on main_audio:', err);
                      // Try user interaction
                      document.addEventListener('click', () => {
                        this.play().catch(e => console.error('❌ Manual play failed:', e));
                      }, { once: true });
                    });
                  }
                }
              });
            }
          };

          // Run immediately and after DOM updates
          checkAudioElements();
          setTimeout(checkAudioElements, 100);
        `
      }} />
      
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