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

  const loadScripts = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (isLoadedRef.current) {
        resolve();
        return;
      }

      // Check if both jQuery and Verto are already loaded
      if (window.hasOwnProperty('jQuery') && window.hasOwnProperty('Verto')) {
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

      // Load Verto after jQuery
      const loadVerto = () => {
        return new Promise<void>((vertoResolve, vertoReject) => {
          if (window.hasOwnProperty('Verto')) {
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

      // Load scripts in sequence
      loadJQuery()
        .then(() => loadVerto())
        .then(() => resolve())
        .catch((error) => reject(error));
    });
  }, []);

  const connect = useCallback(async (config: VertoConfig) => {
    try {
      await loadScripts();
      
      // @ts-ignore - Verto is loaded dynamically
      const verto = new window.Verto({
        login: config.login,
        passwd: config.passwd,
        socketUrl: config.wsURL,
        tag: config.tag,
        ringFile: config.ringFile,
        onWSConnect: () => {
          console.log('Verto WebSocket connected');
          setIsConnected(true);
        },
        onWSClose: () => {
          console.log('Verto WebSocket closed');
          setIsConnected(false);
        },
        onDialogState: (dialog: any) => {
          console.log('Verto dialog state:', dialog.state);
        },
        onmessage: (verto: any, dialog: any, msg: any, data: any) => {
          console.log('Verto message:', msg, data);
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

    return vertoRef.current.newCall({
      destination_number: destination,
      caller_id_name: options.caller_id_name || 'WebRTC User',
      caller_id_number: options.caller_id_number || 'anonymous',
      tag: options.tag || 'default'
    });
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