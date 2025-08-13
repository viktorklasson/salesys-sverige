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

      // Check if all required scripts are loaded
      if (window.hasOwnProperty('jQuery') && 
          (window as any).jQuery?.toJSON && 
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

      // Load Verto after jQuery and jQuery JSON
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

      // Load scripts in sequence: jQuery -> jQuery JSON -> Verto
      loadJQuery()
        .then(() => loadJQueryJSON())
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