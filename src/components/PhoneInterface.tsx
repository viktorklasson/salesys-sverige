import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Phone, PhoneCall, PhoneOff, Minus, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CallInterface } from './CallInterface';
import { AudioDeviceSelector } from './AudioDeviceSelector';
import { useAudioDevices } from '@/hooks/useAudioDevices';
import { useVerto } from '@/hooks/useVerto';

interface PhoneLineData {
  username: string;
  password: string;
  domain: string;
  websocket_url: string;
  expires: string;
}

interface CallState {
  status: 'idle' | 'connecting' | 'calling' | 'answered' | 'hangup' | 'other_hangup';
  callId?: string;
  vertoCallId?: string;
  vertoApiCallId?: string; // The API call ID from verto
  outboundCallId?: string;
  startTime?: Date;
  phoneNumber?: string;
  vertoCallRef?: any; // Reference to the verto call dialog
}

export const PhoneInterface: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [phoneLineData, setPhoneLineData] = useState<PhoneLineData | null>(null);
  const [callState, setCallState] = useState<CallState>({ status: 'idle' });
  const [isLoading, setIsLoading] = useState(false);
  const statusPollingRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  const { verto, connect, disconnect, call, hangup } = useVerto();
  const { selectedOutputDevice, setAudioOutputDevice, audioDevices } = useAudioDevices();

  // Ensure Verto tag containers exist and auto-play any audio elements Verto injects
  const ensureTagContainer = (id: string) => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      el.style.width = '1px';
      el.style.height = '1px';
      document.body.appendChild(el);
      console.log(`🔧 Created Verto tag container #${id}`);
    }

    // Observe for audio elements and force proper playback behavior
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach(async (node) => {
          if (node instanceof HTMLAudioElement) {
            const audio = node as HTMLAudioElement;
            console.log(`🎧 Detected Verto-injected <audio> in #${id}`, audio);
            (audio as any).playsInline = true;
            audio.autoplay = true;
            audio.muted = false;
            audio.volume = 1.0;

            // Try assign sink if supported and selected
            if (selectedOutputDevice && typeof (audio as any).setSinkId === 'function') {
              try {
                await (audio as any).setSinkId(selectedOutputDevice);
                console.log('✅ Applied sinkId to Verto audio:', selectedOutputDevice);
              } catch (e) {
                console.warn('⚠️ Failed to set sinkId on Verto audio:', e);
              }
            }

            const tryPlay = () => audio.play().catch(() => {});
            audio.addEventListener('canplay', tryPlay);
            tryPlay();

            const enableAudio = () => {
              audio.play().catch(() => {});
            };
            document.addEventListener('click', enableAudio, { once: true });
            document.addEventListener('touchstart', enableAudio, { once: true });
          }
        });
      });
    });

    observer.observe(el, { childList: true, subtree: true });
    return el;
  };

  // Create phone line when component mounts
  useEffect(() => {
    createPhoneLine();
  }, []);

  const createPhoneLine = async () => {
    try {
      setIsLoading(true);
      console.log('Creating phone line...');
      
      const { data, error } = await supabase.functions.invoke('telnect-create-phone', {
        body: {
          allow_features: ['inbound', 'outbound', 'websocket'],
          type: 'dynamic',
          max_expire: 86400
        }
      });

      if (error) {
        console.error('Error creating phone line:', error);
        toast({
          title: "Error",
          description: "Failed to create phone line",
          variant: "destructive",
        });
        return;
      }

      console.log('Phone line created:', data);
      setPhoneLineData(data);
      
      // Connect to Verto WebRTC
      await connectToVerto(data);
      
    } catch (error) {
      console.error('Error creating phone line:', error);
      toast({
        title: "Error",
        description: "Failed to create phone line",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const connectToVerto = async (phoneData: PhoneLineData) => {
    try {
      console.log('Connecting to Verto...');

      // Ensure tag container exists for Verto to attach its media elements
      ensureTagContainer('phone-interface');
      
      await connect({
        wsURL: phoneData.websocket_url,
        login: phoneData.username,
        passwd: phoneData.password,
        login_token: '',
        userVariables: {},
        ringFile: 'https://s3.amazonaws.com/evolux-files/ringtone/ringtone_us_uk.mp3',
        loginParams: {},
        tag: 'phone-interface'
      });

      setIsConnected(true);
      console.log('Connected to Verto');
      
    } catch (error) {
      console.error('Error connecting to Verto:', error);
      toast({
        title: "Error",
        description: "Failed to connect to WebRTC",
        variant: "destructive",
      });
    }
  };

  const handleCall = async () => {
    if (!phoneNumber.trim() || !phoneLineData) {
      toast({
        title: "Error",
        description: "Please enter a phone number and ensure WebRTC is connected",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      setCallState({ status: 'connecting' });
      
      console.log('🎯 Starting call process...');
      
      // STEP 1: Ensure audio elements exist BEFORE any WebRTC operations
      console.log('🔧 Ensuring audio elements exist BEFORE Verto operations...');
      
      const createAudioElements = () => {
        // Remove existing elements to avoid conflicts
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

        // Create main audio element for remote stream - MUST exist before Verto call
        const mainAudio = document.createElement('audio');
        mainAudio.id = 'main_audio';
        mainAudio.autoplay = true;
        (mainAudio as any).playsInline = true;
        mainAudio.controls = false;
        mainAudio.volume = 1.0;
        
        // Monitor srcObject changes for debugging
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
                document.addEventListener('click', enableAudio, { once: true });
              });
            }
          }
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

        console.log('✅ Audio elements created and ready:', {
          mainAudio: document.getElementById('main_audio'),
          audioElement: document.getElementById('audio_element')
        });

        return { mainAudio, audioElement };
      };

      // Create audio elements first
      const audioElements = createAudioElements();
      
      // STEP 2: Set audio output device if selected
      if (selectedOutputDevice && 'setSinkId' in audioElements.mainAudio) {
        try {
          await (audioElements.mainAudio as any).setSinkId(selectedOutputDevice);
          console.log('✅ Audio output device set:', selectedOutputDevice);
        } catch (audioError) {
          console.error('❌ Failed to set audio device:', audioError);
        }
      }

      // STEP 3: Create WebRTC session via Verto
      console.log('📞 Creating Verto WebRTC call...');

      // Ensure call tag exists for this specific call
      ensureTagContainer('verto-webrtc-call');

      const vertoCall = call('park', {
        caller_id_name: 'WebRTC User',
        caller_id_number: phoneLineData?.username || '',
        tag: 'verto-webrtc-call'
      });

      console.log('📞 Verto call created:', vertoCall);
      
      // Get the callID from the Verto dialog object
      const vertoCallId = vertoCall?.callID;
      if (!vertoCallId) {
        throw new Error('Failed to get Verto call ID - WebRTC session creation failed');
      }
      
      console.log('🆔 Verto call ID extracted:', vertoCallId);

      // STEP 4: Create outbound call via Telnect API
      console.log('📞 Creating outbound call via Telnect...');
      const { data: outboundCallData, error: outboundError } = await supabase.functions.invoke('telnect-create-call', {
        body: {
          caller: phoneLineData?.username || '',
          number: phoneNumber,
          notifyUrl: `${window.location.origin}/api/call-events`
        }
      });

      if (outboundError) {
        console.error('❌ Error creating outbound call:', outboundError);
        throw new Error('Failed to create outbound call');
      }

      console.log('✅ Outbound call created:', outboundCallData);
      const outboundCallId = outboundCallData.data?.id || outboundCallData.id;

      // Update call state with both call IDs and store verto call reference
      setCallState({
        status: 'calling',
        vertoCallId: vertoCallId,
        outboundCallId: outboundCallId,
        phoneNumber: phoneNumber,
        vertoCallRef: vertoCall
      });

      // STEP 5: Start polling for call status - bridging will happen when call is answered
      startCallStatusPolling(outboundCallId, vertoCall);

      toast({
        title: "Success",
        description: "Call initiated successfully",
      });

    } catch (error) {
      console.error('❌ Error making call:', error);
      setCallState({ status: 'idle' });
      toast({
        title: "Error",
        description: error.message || "Failed to make call",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startCallStatusPolling = (callId: string, vertoCall: any) => {
    // Clear any existing polling
    if (statusPollingRef.current) {
      clearInterval(statusPollingRef.current);
    }

    statusPollingRef.current = setInterval(async () => {
      try {
        const { data: callInfo, error } = await supabase.functions.invoke('telnect-get-call', {
          body: { callId: callId }
        });

        if (error) {
          console.error('Error polling call status:', error);
          return;
        }

        console.log('Call status:', callInfo.status);
        
        if (callInfo.status === 'answered') {
          console.log('✅ Call answered, initiating bridge...');
          
          try {
            // Add a small delay to ensure both calls are ready for bridging
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log('🌉 Bridging calls - Outbound ID:', callId, 'Verto ID:', vertoCall?.callID);
            
            // Bridge the calls using the verto call ID and outbound call ID
            const { data: bridgeResult, error: bridgeError } = await supabase.functions.invoke('telnect-call-action', {
              body: {
                callId: callId, // The outbound call that will be bridged 
                action: 'bridge',
                bridgeCallId: vertoCall?.callID // Use the verto call ID directly
              }
            });
            
            if (bridgeError) {
              console.error('❌ Error bridging calls:', bridgeError);
              
              // Retry bridging once after a longer delay
              console.log('🔄 Retrying bridge after delay...');
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const { data: retryResult, error: retryError } = await supabase.functions.invoke('telnect-call-action', {
                body: {
                  callId: callId,
                  action: 'bridge',
                  bridgeCallId: vertoCall?.callID
                }
              });
              
              if (retryError) {
                console.error('❌ Retry bridge also failed:', retryError);
                toast({
                  title: "Bridge Warning",
                  description: "Calls connected but bridging had issues",
                  variant: "destructive",
                });
              } else {
                console.log('✅ Bridge retry successful:', retryResult);
              }
            } else {
              console.log('✅ Calls bridged successfully on first attempt:', bridgeResult);
            }
          } catch (bridgeError) {
            console.error('❌ Failed to bridge calls:', bridgeError);
            toast({
              title: "Bridge Error",
              description: "Calls may not be properly connected",
              variant: "destructive",
            });
          }

          // Update call state to answered regardless of bridge status
          setCallState(prev => ({ 
            ...prev, 
            status: 'answered',
            startTime: new Date()
          }));
          stopCallStatusPolling();
        } else if (['hangup', 'failed', 'completed'].includes(callInfo.status)) {
          console.log('📞 Call ended with status:', callInfo.status);
          setCallState(prev => ({ 
            ...prev, 
            status: 'other_hangup'
          }));
          stopCallStatusPolling();
        }
      } catch (error) {
        console.error('Error polling call status:', error);
      }
    }, 2000); // Poll every 2 seconds
  };

  const stopCallStatusPolling = () => {
    if (statusPollingRef.current) {
      clearInterval(statusPollingRef.current);
      statusPollingRef.current = null;
    }
  };

  const handleHangup = async () => {
    try {
      console.log('📞 Initiating hangup process...');
      
      // First hangup the WebRTC call via Verto
      if (callState.vertoCallId) {
        console.log('📞 Hanging up Verto call:', callState.vertoCallId);
        await hangup(callState.vertoCallId);
      }
      
      // Then hangup the Telnect call
      if (callState.outboundCallId) {
        console.log('📞 Hanging up Telnect call:', callState.outboundCallId);
        const { data, error } = await supabase.functions.invoke('telnect-call-action', {
          body: {
            callId: callState.outboundCallId,
            action: 'hangup'
          }
        });
        
        if (error) {
          console.error('❌ Error hanging up Telnect call:', error);
        } else {
          console.log('✅ Telnect call hangup successful:', data);
        }
      }

      // Update UI immediately
      setCallState({ status: 'hangup' });
      stopCallStatusPolling();
      
      // Clean up audio elements after a short delay
      setTimeout(() => {
        const container = document.getElementById('verto-audio-container');
        if (container) {
          container.remove();
          console.log('🧹 Audio elements cleaned up after hangup');
        }
        
        // Reset to idle after showing hangup status
        setCallState({ status: 'idle' });
      }, 2000);
      
      toast({
        title: "Call ended",
        description: "Call has been terminated",
      });
    } catch (error) {
      console.error('❌ Error hanging up:', error);
      
      // Force cleanup even if there was an error
      setCallState({ status: 'idle' });
      stopCallStatusPolling();
      
      toast({
        title: "Call ended",
        description: "Call terminated (with errors)",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setIsConnected(false);
      setPhoneLineData(null);
      setCallState({ status: 'idle' });
      stopCallStatusPolling();
      
      toast({
        title: "Disconnected",
        description: "WebRTC connection closed",
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCallStatusPolling();
      if (isConnected) {
        disconnect();
      }
    };
  }, []);

  // Listen for Verto WebSocket events for better hangup handling
  useEffect(() => {
    const handleVertoHangup = (event: CustomEvent) => {
      console.log('🎯 Received Verto hangup event:', event.detail);
      const { callID, dialog } = event.detail;
      
      // Update call state to reflect hangup
      setCallState(prev => {
        if (prev.vertoCallId === callID) {
          console.log('📞 Updating call state to hangup due to Verto event');
          stopCallStatusPolling();
          return { status: 'other_hangup' };
        }
        return prev;
      });
    };

    const handleVertoBye = (event: CustomEvent) => {
      console.log('🎯 Received Verto bye event:', event.detail);
      const { callID } = event.detail;
      
      // Update call state to reflect bye
      setCallState(prev => {
        if (prev.vertoCallId === callID) {
          console.log('👋 Updating call state to hangup due to bye event');
          stopCallStatusPolling();
          return { status: 'other_hangup' };
        }
        return prev;
      });
    };

    // Listen for custom Verto events
    window.addEventListener('verto-hangup', handleVertoHangup as EventListener);
    window.addEventListener('verto-bye', handleVertoBye as EventListener);

    return () => {
      window.removeEventListener('verto-hangup', handleVertoHangup as EventListener);
      window.removeEventListener('verto-bye', handleVertoBye as EventListener);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Phone className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Phone Interface</h2>
            </div>

            {/* Connection Status */}
            <div className="mb-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm">
                  {isConnected ? 'WebRTC Connected' : 'WebRTC Disconnected'}
                </span>
              </div>
            </div>

            {/* Phone Number Input */}
            <div className="mb-4">
              <Input
                type="tel"
                placeholder="Enter phone number (e.g., +46701234567)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={!isConnected || callState.status !== 'idle'}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              {callState.status === 'idle' ? (
                <Button
                  onClick={handleCall}
                  disabled={!isConnected || !phoneNumber.trim() || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Connecting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <PhoneCall className="h-4 w-4" />
                      <span>Call</span>
                    </div>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleHangup}
                  variant="destructive"
                  className="flex-1"
                >
                  <div className="flex items-center space-x-2">
                    <PhoneOff className="h-4 w-4" />
                    <span>Hang Up</span>
                  </div>
                </Button>
              )}

              <Button
                onClick={handleDisconnect}
                variant="outline"
                disabled={!isConnected}
              >
                <Radio className="h-4 w-4" />
              </Button>
            </div>

            {/* Call Status */}
            {callState.status !== 'idle' && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  Status: <span className="font-medium">{callState.status}</span>
                </div>
                {callState.phoneNumber && (
                  <div className="text-sm text-gray-600">
                    Number: <span className="font-medium">{callState.phoneNumber}</span>
                  </div>
                )}
                {callState.startTime && (
                  <div className="text-sm text-gray-600">
                    Started: <span className="font-medium">{callState.startTime.toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Audio Device Selector */}
        <div className="lg:col-span-1">
          <AudioDeviceSelector />
        </div>
      </div>

      {/* Call Interface */}
      {callState.status === 'answered' && (
        <CallInterface
          callState={callState}
          onHangUp={handleHangup}
          onMinimize={() => setCallState(prev => ({ ...prev, status: 'idle' }))}
        />
      )}
    </div>
  );
};