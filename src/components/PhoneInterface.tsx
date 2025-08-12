import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Phone, PhoneCall, PhoneOff, Minus, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CallInterface } from './CallInterface';
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
  outboundCallId?: string;
  startTime?: Date;
  phoneNumber?: string;
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
    if (!phoneNumber.trim() || !isConnected) {
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

      // Step 1: Call "park" from Verto to get a call ID
      console.log('Calling park from Verto...');
      const vertoCall = await call('park', {
        caller_id_name: 'WebRTC User',
        caller_id_number: phoneLineData?.username || '',
        tag: 'verto-park-call'
      });

      console.log('Verto call created:', vertoCall);
      const vertoCallId = vertoCall.callID;

      // Step 2: Create outbound call via API
      console.log('Creating outbound call...');
      const { data: outboundCallData, error: outboundError } = await supabase.functions.invoke('telnect-create-call', {
        body: {
          caller: phoneLineData?.username || '',
          number: phoneNumber,
          notifyUrl: `${window.location.origin}/api/call-events`
        }
      });

      if (outboundError) {
        console.error('Error creating outbound call:', outboundError);
        throw new Error('Failed to create outbound call');
      }

      console.log('Outbound call created:', outboundCallData);
      const outboundCallId = outboundCallData.data?.id || outboundCallData.id;

      // Step 3: Bridge the two calls together
      console.log('Bridging calls...');
      const { data: bridgeData, error: bridgeError } = await supabase.functions.invoke('telnect-bridge-calls', {
        body: {
          vertoCallId: vertoCallId,
          outboundCallId: outboundCallId
        }
      });

      if (bridgeError) {
        console.error('Error bridging calls:', bridgeError);
        throw new Error('Failed to bridge calls');
      }

      console.log('Calls bridged successfully:', bridgeData);

      // Update call state
      setCallState({
        status: 'calling',
        vertoCallId: vertoCallId,
        outboundCallId: outboundCallId,
        phoneNumber: phoneNumber
      });

      // Start polling for call status
      startCallStatusPolling(outboundCallId);

      toast({
        title: "Success",
        description: "Call initiated successfully",
      });

    } catch (error) {
      console.error('Error making call:', error);
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

  const startCallStatusPolling = (callId: string) => {
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
          setCallState(prev => ({ 
            ...prev, 
            status: 'answered',
            startTime: new Date()
          }));
          stopCallStatusPolling();
        } else if (['hangup', 'failed', 'completed'].includes(callInfo.status)) {
          setCallState(prev => ({ 
            ...prev, 
            status: 'hangup'
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
      if (callState.vertoCallId) {
        await hangup(callState.vertoCallId);
      }
      
      if (callState.outboundCallId) {
        await supabase.functions.invoke('telnect-call-action', {
          body: {
            callId: callState.outboundCallId,
            action: 'hangup'
          }
        });
      }

      setCallState({ status: 'idle' });
      stopCallStatusPolling();
      
      toast({
        title: "Call ended",
        description: "Call has been terminated",
      });
    } catch (error) {
      console.error('Error hanging up:', error);
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

  return (
    <div className="space-y-4">
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