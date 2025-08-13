import { useState, useEffect } from 'react';

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export const useAudioDevices = () => {
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedOutputDevice, setSelectedOutputDevice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const loadAudioDevices = async () => {
    try {
      setIsLoading(true);
      
      // Request permissions first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get all media devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      // Filter for audio output devices
      const audioOutputDevices = devices
        .filter(device => device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Audio Output ${device.deviceId.slice(0, 8)}`,
          kind: device.kind as MediaDeviceKind
        }));

      console.log('Available audio output devices:', audioOutputDevices);
      setAudioDevices(audioOutputDevices);
      
      // Set first device as default if none selected
      if (audioOutputDevices.length > 0 && !selectedOutputDevice) {
        const defaultDevice = audioOutputDevices[0].deviceId;
        setSelectedOutputDevice(defaultDevice);
        console.log('Set default audio output device:', defaultDevice);
      }
      
    } catch (error) {
      console.error('Error loading audio devices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setAudioOutputDevice = async (deviceId: string, audioElement?: HTMLAudioElement) => {
    try {
      console.log('Setting audio output device:', deviceId);
      setSelectedOutputDevice(deviceId);
      
      // Set the sink ID on the audio element if provided
      if (audioElement && 'setSinkId' in audioElement) {
        await (audioElement as any).setSinkId(deviceId);
        console.log('Audio output device set successfully');
      } else {
        console.warn('setSinkId not supported or audio element not provided');
      }
      
      // Also set it on the main audio element if it exists
      const mainAudio = document.getElementById('main_audio') as HTMLAudioElement;
      if (mainAudio && 'setSinkId' in mainAudio) {
        await (mainAudio as any).setSinkId(deviceId);
        console.log('Main audio output device set successfully');
      }
      
    } catch (error) {
      console.error('Error setting audio output device:', error);
    }
  };

  useEffect(() => {
    loadAudioDevices();
    
    // Listen for device changes
    const handleDeviceChange = () => {
      console.log('Audio devices changed, reloading...');
      loadAudioDevices();
    };
    
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);

  return {
    audioDevices,
    selectedOutputDevice,
    setAudioOutputDevice,
    loadAudioDevices,
    isLoading
  };
};