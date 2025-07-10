import { useRef, useCallback } from 'react';

interface VertoConfig {
  login: string;
  passwd: string;
  socketUrl: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onCallState?: (state: string) => void;
}

interface VertoCall {
  destination: string;
  callerId?: string;
}

export function useVerto() {
  const vertoRef = useRef<any>(null);
  const isLoadedRef = useRef(false);

  const loadVertoScript = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (isLoadedRef.current) {
        resolve();
        return;
      }

      // Check if script is already loaded
      if (window.hasOwnProperty('Verto')) {
        isLoadedRef.current = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/gh/freeswitch/verto-client/dist/verto.min.js';
      script.onload = () => {
        isLoadedRef.current = true;
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load Verto script'));
      };
      document.head.appendChild(script);
    });
  }, []);

  const initialize = useCallback(async (config: VertoConfig) => {
    try {
      await loadVertoScript();
      
      // @ts-ignore - Verto is loaded dynamically
      const verto = new window.Verto({
        login: config.login,
        passwd: config.passwd,
        socketUrl: config.socketUrl,
        tag: 'verto-phone-container',
        ringFile: null,
        onWSConnect: () => {
          console.log('Verto WebSocket connected');
          config.onConnected?.();
        },
        onWSClose: () => {
          console.log('Verto WebSocket closed');
          config.onDisconnected?.();
        },
        onDialogState: (dialog: any) => {
          console.log('Verto dialog state:', dialog.state);
          config.onCallState?.(dialog.state.name);
        },
        onmessage: (verto: any, dialog: any, msg: any, data: any) => {
          console.log('Verto message:', msg, data);
        }
      });

      vertoRef.current = verto;
      return verto;
    } catch (error) {
      console.error('Error initializing Verto:', error);
      throw error;
    }
  }, [loadVertoScript]);

  const makeCall = useCallback((call: VertoCall) => {
    if (!vertoRef.current) {
      throw new Error('Verto not initialized');
    }

    return vertoRef.current.newCall({
      destination_number: call.destination,
      caller_id_name: call.callerId || 'WebRTC User',
      caller_id_number: call.callerId || 'anonymous'
    });
  }, []);

  const hangUp = useCallback(() => {
    if (vertoRef.current) {
      vertoRef.current.hangup();
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
    }
  }, []);

  return {
    initialize,
    makeCall,
    hangUp,
    answer,
    destroy,
    isConnected: !!vertoRef.current
  };
}