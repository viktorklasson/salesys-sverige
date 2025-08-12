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
  status: 'idle' | 'connecting' | 'calling' | 'answered' | 'hangup';
  callId?: string;
  startTime?: Date;
  phoneNumber?: string;
}

export function PhoneInterface() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [phoneLine, setPhoneLine] = useState<PhoneLineData | null>(null);
  const [callState, setCallState] = useState<CallState>({ status: 'idle' });
  const [isMinimized, setIsMinimized] = useState(false);
  const { toast } = useToast();
  const verto = useVerto();

  const createPhoneLine = async () => {
    try {
      setIsLoading(true);
      
      // Use Supabase function URL directly for callbacks
      const baseUrl = 'https://wtehqdaixoyqsrnocrbd.supabase.co/functions/v1';
      const eventCallbackUrl = `${baseUrl}/phone-events`;
      
      const { data, error } = await supabase.functions.invoke('telnect-create-phone', {
        body: { eventCallbackUrl }
      });

      if (error) throw error;
      
      setPhoneLine(data);
      return data;
    } catch (error: any) {
      console.error('Error creating phone line:', error);
      toast({
        title: "Fel",
        description: "Kunde inte skapa telefonlinje",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const makeCall = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Fel",
        description: "Ange ett telefonnummer",
        variant: "destructive"
      });
      return;
    }

    try {
      setCallState({ 
        status: 'connecting',
        phoneNumber: phoneNumber.trim()
      });

      // Request microphone access first
      console.log('Requesting microphone access...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone access granted');
        // Stop the stream immediately as Verto will handle it
        stream.getTracks().forEach(track => track.stop());
      } catch (micError) {
        console.error('Microphone access denied:', micError);
        toast({
          title: "Mikrofon behövs",
          description: "Tillåt mikrofonåtkomst för att ringa",
          variant: "destructive"
        });
        setCallState({ status: 'idle' });
        return;
      }

      // Create phone line if not exists
      let phoneLineData = phoneLine;
      if (!phoneLineData) {
        phoneLineData = await createPhoneLine();
      }

      let parkCallReady = false;
      let outboundCallId: string | null = null;

      // Initialize Verto
      console.log('Initializing Verto with:', {
        login: phoneLineData.username,
        domain: phoneLineData.domain,
        websocket: phoneLineData.websocket_url
      });

      await verto.initialize({
        login: phoneLineData.username,
        passwd: phoneLineData.password,
        socketUrl: phoneLineData.websocket_url,
        onConnected: () => {
          console.log('Verto connected successfully, making call to park');
          // Call "park" to establish WebRTC connection
          const parkCall = verto.makeCall({ destination: 'park' });
          console.log('Park call initiated:', parkCall);
        },
        onCallState: async (state: string) => {
          console.log('Verto call state changed to:', state);
          switch (state) {
            case 'trying':
              console.log('Park call is trying...');
              setCallState(prev => ({ ...prev, status: 'calling' }));
              break;
            case 'active':
              console.log('Call state active - parkCallReady:', parkCallReady);
              // Park call is now active, create outbound call
              if (!parkCallReady) {
                parkCallReady = true;
                console.log('Park call is active, now creating outbound call to:', phoneNumber.trim());
                
                try {
                  const baseUrl = 'https://wtehqdaixoyqsrnocrbd.supabase.co/functions/v1';
                  console.log('Making request to create outbound call...');
                  const { data: callData, error } = await supabase.functions.invoke('telnect-create-call', {
                    body: {
                      caller: '+46775893847',
                      number: phoneNumber.trim(),
                      notifyUrl: `${baseUrl}/call-events`
                    }
                  });

                  if (error) {
                    console.error('Error from telnect-create-call:', error);
                    throw error;
                  }
                  
                  outboundCallId = callData.id;
                  console.log('✅ Outbound call created successfully:', callData.id);
                  
                  // Wait for the outbound call to be answered before bridging
                  console.log('Outbound call created, waiting for answer to bridge...');
                  
                  setCallState(prev => ({ 
                    ...prev, 
                    callId: callData.id,
                    status: 'calling'
                  }));
                  
                  // Poll for call status to detect when it's answered
                  const pollCallStatus = async () => {
                    try {
                      // Check call status - when it shows as answered, bridge the calls
                      console.log('Checking if call was answered...');
                      
                      // For now, let's bridge immediately after a short delay
                      // In a real implementation, you'd poll the call status or use webhooks
                      setTimeout(async () => {
                        console.log('Attempting to bridge calls...');
                        try {
                          const { error: bridgeError } = await supabase.functions.invoke('telnect-call-action', {
                            body: {
                              callId: callData.id,
                              action: "answer"
                            }
                          });
                          
                          if (bridgeError) {
                            console.error('Bridge error:', bridgeError);
                          } else {
                            console.log('✅ Calls bridged successfully');
                            setCallState(prev => ({ 
                              ...prev, 
                              status: 'answered',
                              startTime: new Date()
                            }));
                          }
                        } catch (bridgeError) {
                          console.error('Error bridging calls:', bridgeError);
                        }
                      }, 3000); // Wait 3 seconds then bridge
                      
                    } catch (error) {
                      console.error('Error checking call status:', error);
                    }
                  };
                  
                  pollCallStatus();
                } catch (error) {
                  console.error('❌ Error creating outbound call:', error);
                  throw error;
                }
              } else {
                // Both calls are active, ready for bridging
                console.log('Both calls are now active - call answered');
                setCallState(prev => ({ 
                  ...prev, 
                  status: 'answered',
                  startTime: new Date()
                }));
              }
              break;
            case 'destroy':
              console.log('Call destroyed');
              setCallState({ status: 'hangup' });
              break;
            default:
              console.log('Unknown call state:', state);
          }
        }
      });

    } catch (error: any) {
      console.error('❌ Error in makeCall:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ringa upp: " + error.message,
        variant: "destructive"
      });
      setCallState({ status: 'idle' });
    }
  };

  const hangUpCall = async () => {
    try {
      verto.hangUp();

      if (callState.callId) {
        await supabase.functions.invoke('telnect-call-action', {
          body: {
            callId: callState.callId,
            action: 'hangup'
          }
        });
      }

      setCallState({ status: 'idle' });
    } catch (error) {
      console.error('Error hanging up:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      verto.destroy();
    };
  }, [verto]);

  // Show fullscreen call interface when in call
  if (callState.status !== 'idle' && !isMinimized) {
    return (
      <CallInterface
        callState={callState}
        onHangUp={hangUpCall}
        onMinimize={() => setIsMinimized(true)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Minimized call indicator */}
      {callState.status !== 'idle' && isMinimized && (
        <Card className="p-4 bg-primary/10 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {callState.status === 'calling' ? 'Ringer...' : 'Pågående samtal'}
              </span>
              {callState.phoneNumber && (
                <span className="text-sm text-muted-foreground">
                  {callState.phoneNumber}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsMinimized(false)}
              >
                Visa
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={hangUpCall}
              >
                <PhoneOff className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Phone interface */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Samtal</h3>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-3">
                <Radio className="h-8 w-8 animate-pulse text-primary" />
                <p className="text-sm text-muted-foreground">Kopplar upp dig...</p>
              </div>
            </div>
          )}

          {!isLoading && (
            <div className="space-y-4">
              <Input
                type="tel"
                placeholder="Telefonnummer (t.ex. +46701234567)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="text-lg"
              />
              
              <Button 
                onClick={makeCall}
                className="w-full"
                size="lg"
                disabled={!phoneNumber.trim() || callState.status !== 'idle'}
              >
                <PhoneCall className="h-5 w-5 mr-2" />
                Ring
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}