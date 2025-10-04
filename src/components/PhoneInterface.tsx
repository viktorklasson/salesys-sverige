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

interface SalesysLoginData {
  username: string;
  password: string;
  domain: string;
  url: string;
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
  const [loginData, setLoginData] = useState<SalesysLoginData | null>(null);
  const [callState, setCallState] = useState<CallState>({ status: 'idle' });
  const [isLoading, setIsLoading] = useState(false);
  const parkCallIdRef = useRef<string | null>(null);
  const { toast } = useToast();
  
  const { verto, connect, disconnect, call, hangup } = useVerto();
  const { selectedOutputDevice, setAudioOutputDevice, audioDevices } = useAudioDevices();

  // Listen for Verto events
  useEffect(() => {
    const handleClientReady = () => {
      console.log('🚀 Client ready event - creating park call');
      if (verto) {
        const parkCall = call('park', {
          caller_id_name: null,
          caller_id_number: null
        });
        console.log('✅ Park call created:', parkCall);
      }
    };
    
    const handleParkReady = (e: CustomEvent) => {
      const { apiCallId } = e.detail;
      console.log('🅿️ Park call ready with API ID:', apiCallId);
      parkCallIdRef.current = apiCallId;
    };
    
    window.addEventListener('verto-client-ready', handleClientReady as EventListener);
    window.addEventListener('verto-park-ready', handleParkReady as EventListener);
    
    return () => {
      window.removeEventListener('verto-client-ready', handleClientReady as EventListener);
      window.removeEventListener('verto-park-ready', handleParkReady as EventListener);
    };
  }, [verto, call]);

  // Login to SaleSys EasyTelecom when component mounts
  useEffect(() => {
    loginToEasyTelecom();
  }, []);

  const loginToEasyTelecom = async () => {
    try {
      setIsLoading(true);
      console.log('Logging in to SaleSys EasyTelecom...');
      
      // Get bearer token from localStorage
      const bearerToken = localStorage.getItem('salesys_bearer_token');
      if (!bearerToken) {
        throw new Error('No authentication token found. Please log in first.');
      }
      
      const { data, error } = await supabase.functions.invoke('salesys-proxy', {
        body: {
          url: 'https://app.salesys.se/api/dial/easytelecom-v1/login',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${bearerToken}`
          }
        }
      });

      if (error) {
        console.error('Error logging in:', error);
        toast({
          title: "Error",
          description: "Failed to login to phone system",
          variant: "destructive",
        });
        return;
      }

      console.log('Login successful:', data);
      setLoginData(data);
      
      // Connect to Verto WebRTC
      await connectToVerto(data);
      
    } catch (error) {
      console.error('Error logging in:', error);
      toast({
        title: "Error",
        description: "Failed to login to phone system",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const connectToVerto = async (data: SalesysLoginData) => {
    try {
      console.log('Connecting to Verto...');
      
      // Ensure audio element exists
      let audioEl = document.getElementById('audio-stream') as HTMLAudioElement;
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = 'audio-stream';
        audioEl.autoplay = true;
        audioEl.hidden = true;
        document.body.appendChild(audioEl);
        console.log('✅ Created audio-stream element');
      }
      
      await connect({
        wsURL: data.url,
        login: `${data.username}@${data.domain}`,
        passwd: data.password,
        login_token: '',
        userVariables: {},
        ringFile: '',
        loginParams: {},
        tag: 'audio-stream'
      });

      setIsConnected(true);
      console.log('✅ Connected to Verto');
      
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
    if (!phoneNumber.trim() || !loginData) {
      toast({
        title: "Error",
        description: "Please enter a phone number and ensure system is connected",
        variant: "destructive",
      });
      return;
    }

    if (!parkCallIdRef.current) {
      toast({
        title: "Error",
        description: "Park call not ready. Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      setCallState({ status: 'calling', phoneNumber });
      
      console.log('📞 Making call via SaleSys API...');
      console.log('Using park call ID:', parkCallIdRef.current);
      console.log('Calling:', phoneNumber, 'from:', loginData.username);
      
      const { data, error } = await supabase.functions.invoke('salesys-proxy', {
        body: {
          url: 'https://app.salesys.se/api/dial/easytelecom-v1/call',
          method: 'POST',
          data: {
            destinationPhoneNumber: phoneNumber,
            callerPhoneNumber: loginData.username,
            easyTelecomUserCallId: parkCallIdRef.current
          }
        }
      });

      if (error) {
        console.error('❌ Error creating call:', error);
        throw new Error('Failed to create call');
      }

      console.log('✅ Call created successfully:', data);
      
      // Update state to answered after a moment
      setTimeout(() => {
        setCallState(prev => ({ 
          ...prev, 
          status: 'answered',
          startTime: new Date()
        }));
      }, 2000);

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


  const handleHangup = async () => {
    try {
      console.log('📞 Hanging up call...');
      
      hangup();
      
      setCallState({ status: 'hangup' });
      
      setTimeout(() => {
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
      setLoginData(null);
      setCallState({ status: 'idle' });
      
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
      if (isConnected) {
        disconnect();
      }
    };
  }, []);

  // Listen for Verto WebSocket events for better hangup handling
  useEffect(() => {
    const handleVertoHangup = (event: CustomEvent) => {
      console.log('🎯 Received Verto hangup event:', event.detail);
      const { callID } = event.detail;
      
      // Update call state to reflect hangup
      setCallState(prev => {
        if (prev.vertoCallId === callID) {
          console.log('📞 Updating call state to hangup due to Verto event');
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
                  {...{ onclick: "startIncomingCall()" } as any}
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