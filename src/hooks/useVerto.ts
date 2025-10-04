import { useRef, useCallback, useState } from 'react';

interface VertoConfig {
  wsURL: string;
  login: string;
  passwd: string;
  login_token: string;
  userVariables: any;
  ringFile: string;
  loginParams: any;
  tag: string;
}

interface VertoCall {
  destination: string;
  caller_id_name?: string;
  caller_id_number?: string;
  tag?: string;
}

export function useVerto() {
  const vertoRef = useRef<any>(null);
  const isLoadedRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);

  // Helper functions for audio element management
  const ensureAudioElementsExist = useCallback(() => {
    console.log('🔧 Ensuring audio elements exist...');
    
    let container = document.getElementById('verto-audio-container');
    if (!container) {
      console.log('🔧 Creating audio container...');
      container = document.createElement('div');
      container.id = 'verto-audio-container';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = '1px';
      container.style.height = '1px';
      document.body.appendChild(container);
    }

    let mainAudio = document.getElementById('main_audio') as HTMLAudioElement;
    if (!mainAudio) {
      console.log('🔧 Creating main_audio element...');
      mainAudio = document.createElement('audio');
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
      
      container.appendChild(mainAudio);
    }

    let audioElement = document.getElementById('audio_element') as HTMLAudioElement;
    if (!audioElement) {
      console.log('🔧 Creating audio_element...');
      audioElement = document.createElement('audio');
      audioElement.id = 'audio_element';
      audioElement.autoplay = true;
      (audioElement as any).playsInline = true;
      audioElement.controls = false;
      audioElement.muted = true;
      
      container.appendChild(audioElement);
    }

    console.log('✅ Audio elements ready:', {
      container: !!container,
      mainAudio: !!mainAudio,
      audioElement: !!audioElement
    });
    
    return { container, mainAudio, audioElement };
  }, []);

  const cleanupAudioElements = useCallback(() => {
    console.log('🧹 Cleaning up audio elements...');
    const container = document.getElementById('verto-audio-container');
    if (container) {
      container.remove();
      console.log('✅ Audio elements cleaned up');
    }
  }, []);

  const loadScripts = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (isLoadedRef.current) {
        resolve();
        return;
      }

      // Check if all required scripts are loaded
      if (window.hasOwnProperty('jQuery') && 
          (window as any).jQuery?.toJSON && 
          (window as any).assureMediaInputId &&
          ((window as any).jQuery?.verto || (window as any).$?.verto)) {
        isLoadedRef.current = true;
        resolve();
        return;
      }

      // Load jQuery first
      const loadJQuery = () => {
        return new Promise<void>((jQueryResolve, jQueryReject) => {
          if (window.hasOwnProperty('jQuery')) {
            jQueryResolve();
            return;
          }

          const jqueryScript = document.createElement('script');
          jqueryScript.src = '/jquery-2.1.1.min.js';
          jqueryScript.onload = () => {
            console.log('jQuery loaded successfully');
            jQueryResolve();
          };
          jqueryScript.onerror = () => {
            jQueryReject(new Error('Failed to load jQuery script'));
          };
          document.head.appendChild(jqueryScript);
        });
      };

      // Load jQuery JSON plugin after jQuery
      const loadJQueryJSON = () => {
        return new Promise<void>((jsonResolve, jsonReject) => {
          if ((window as any).jQuery?.toJSON) {
            jsonResolve();
            return;
          }

          const jsonScript = document.createElement('script');
          jsonScript.src = '/jquery.json-2.4.min.js';
          jsonScript.onload = () => {
            console.log('jQuery JSON plugin loaded successfully');
            jsonResolve();
          };
          jsonScript.onerror = () => {
            jsonReject(new Error('Failed to load jQuery JSON plugin'));
          };
          document.head.appendChild(jsonScript);
        });
      };

      // Load Media Device ID after jQuery JSON
      const loadMediaDeviceId = () => {
        return new Promise<void>((mediaResolve, mediaReject) => {
          if ((window as any).assureMediaInputId) {
            mediaResolve();
            return;
          }

          const mediaScript = document.createElement('script');
          mediaScript.src = '/media-device-id.min.js';
          mediaScript.onload = () => {
            console.log('Media Device ID loaded successfully');
            mediaResolve();
          };
          mediaScript.onerror = () => {
            mediaReject(new Error('Failed to load Media Device ID script'));
          };
          document.head.appendChild(mediaScript);
        });
      };

      // Load Verto after all dependencies
      const loadVerto = () => {
        return new Promise<void>((vertoResolve, vertoReject) => {
          if ((window as any).jQuery?.verto || (window as any).$?.verto) {
            vertoResolve();
            return;
          }

          const vertoScript = document.createElement('script');
          vertoScript.src = '/verto.min.js';
          vertoScript.onload = () => {
            console.log('Verto loaded successfully');
            isLoadedRef.current = true;
            vertoResolve();
          };
          vertoScript.onerror = () => {
            vertoReject(new Error('Failed to load Verto script'));
          };
          document.head.appendChild(vertoScript);
        });
      };

      // Load scripts in sequence: jQuery -> jQuery JSON -> Media Device ID -> Verto
      loadJQuery()
        .then(() => loadJQueryJSON())
        .then(() => loadMediaDeviceId())
        .then(() => loadVerto())
        .then(() => resolve())
        .catch((error) => reject(error));
    });
  }, []);

  const connect = useCallback(async (config: VertoConfig) => {
    try {
      await loadScripts();
      
      
      // Debug what's available on window and jQuery
      console.log('Window jQuery:', typeof (window as any).jQuery);
      console.log('jQuery.verto:', typeof (window as any).jQuery?.verto);
      console.log('$.verto:', typeof (window as any).$?.verto);
      
      // Try to find Verto constructor - it's typically under jQuery
      const VertoConstructor = (window as any).jQuery?.verto || (window as any).$?.verto;
      if (!VertoConstructor) {
        throw new Error('Verto constructor not found. Make sure verto.min.js is loaded properly.');
      }

      const verto = new VertoConstructor({
        login: config.login,
        passwd: config.passwd,
        socketUrl: config.wsURL,
        iceServers: true,
        tag: config.tag,
        ringFile: config.ringFile,
        onWSLogin: () => {
          console.log('✅ Verto WebSocket logged in');
          setIsConnected(true);
        },
        onWSClose: () => {
          console.log('❌ Verto WebSocket closed');
          setIsConnected(false);
        },
        onDialogState: (dialog: any) => {
          console.log('🎯 Verto dialog state change:', {
            state: dialog.state,
            stateName: dialog.state?.name,
            callID: dialog.callID,
            destination: dialog.params?.destination_number,
            variables: dialog.params?.variables
          });
          
          // Check if state is 'active' for park call and extract the API call ID
          const stateName = dialog.state?.name || dialog.state;
          const VertoConstructor = (window as any).jQuery?.verto || (window as any).$?.verto;
          const isActive = stateName === 'active' || 
                          (VertoConstructor?.enum?.state && dialog.state === VertoConstructor.enum.state.active);
          
          if (isActive && dialog.params?.destination_number === 'park') {
            const apiCallId = dialog.params?.variables?.verto_svar_api_callid;
            if (apiCallId) {
              console.log('🅿️ Park call is ACTIVE with API ID:', apiCallId);
              
              // Store on verto instance
              if (vertoRef.current) {
                vertoRef.current.parkCallId = apiCallId;
                vertoRef.current.parkDialog = dialog;
              }
              
              // Dispatch event with the API call ID
              window.dispatchEvent(new CustomEvent('verto-park-ready', { 
                detail: { apiCallId, dialog } 
              }));
            }
          }
          
          // Handle dialog state changes
          if (isActive) {
            console.log('✅ Call is active');
            ensureAudioElementsExist();
          }
          
          if (stateName === 'hangup') {
            console.log('📞 Call hangup detected');
            window.dispatchEvent(new CustomEvent('verto-hangup', { 
              detail: { callID: dialog.callID, dialog } 
            }));
          }
          
          if (stateName === 'destroy') {
            console.log('💀 Call destroyed');
          }
        },
        onRemoteStream: (stream: any) => {
          console.log('🎵 Remote stream received:', stream);
        },
        onMessage: (verto: any, dialog: any, msg: any) => {
          console.log('📨 Verto onMessage:', msg, dialog);
          
          // Create park call when client is ready
          if (msg.name === 'clientReady') {
            console.log('🚀 Client ready - creating park call');
            window.dispatchEvent(new CustomEvent('verto-client-ready'));
          }
        },
        onEvent: (verto: any, event: any, data: any) => {
          console.log('📡 Verto onEvent:', event, data);
        }
      });

      vertoRef.current = verto;
      return verto;
    } catch (error) {
      console.error('Error connecting to Verto:', error);
      throw error;
    }
  }, [loadScripts]);

  const disconnect = useCallback(() => {
    if (vertoRef.current) {
      vertoRef.current.logout();
      vertoRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const call = useCallback((destination: string, options: any = {}) => {
    if (!vertoRef.current) {
      throw new Error('Verto not connected');
    }

    console.log('Creating call with Verto:', { destination, options });
    
    try {
      const callResult = vertoRef.current.newCall({
        destination_number: destination,
        caller_id_name: options.caller_id_name || null,
        caller_id_number: options.caller_id_number || null,
        useStereo: false,
        useVideo: false
      });
      
      console.log('Verto newCall result:', callResult);
      
      return callResult;
    } catch (error) {
      console.error('Error creating Verto call:', error);
      throw error;
    }
  }, []);

  const hangup = useCallback((callId?: string) => {
    if (vertoRef.current) {
      if (callId) {
        // Hangup specific call
        vertoRef.current.hangup(callId);
      } else {
        // Hangup current call
        vertoRef.current.hangup();
      }
    }
  }, []);

  const answer = useCallback(() => {
    if (vertoRef.current) {
      vertoRef.current.answer();
    }
  }, []);

  const destroy = useCallback(() => {
    if (vertoRef.current) {
      vertoRef.current.logout();
      vertoRef.current = null;
      setIsConnected(false);
    }
  }, []);

  return {
    verto: vertoRef.current,
    connect,
    disconnect,
    call,
    hangup,
    answer,
    destroy,
    isConnected
  };
}