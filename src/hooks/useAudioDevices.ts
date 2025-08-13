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
      
      // Check if setSinkId is supported
      const testAudio = document.createElement('audio');
      if (!('setSinkId' in testAudio)) {
        console.warn('setSinkId not supported in this browser');
        return;
      }
      
      // Set the sink ID on the provided audio element
      if (audioElement) {
        try {
          await (audioElement as any).setSinkId(deviceId);
          console.log('Audio output device set successfully on provided element');
        } catch (error) {
          console.error('Error setting sink ID on provided element:', error);
        }
      }
      
      // Set it on all audio elements that might be used by Verto
      const audioElements = [
        document.getElementById('main_audio'),
        document.getElementById('audio_element'),
        document.getElementById('verto-audio'),
        document.getElementById('remote-audio'),
        ...Array.from(document.querySelectorAll('audio'))
      ].filter(Boolean) as HTMLAudioElement[];
      
      console.log('Found audio elements:', audioElements.length);
      
      for (const audio of audioElements) {
        try {
          await (audio as any).setSinkId(deviceId);
          console.log('Audio output device set on element:', audio.id || 'unnamed');
        } catch (error) {
          console.error('Error setting sink ID on element:', audio.id, error);
        }
      }
      
    } catch (error) {
      console.error('Error setting audio output device:', error);
    }
  };

  const testAudioOutput = async () => {
    try {
      console.log('Testing audio output...');
      
      // Create a test audio element
      const testAudio = document.createElement('audio');
      testAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcAz2Y4OzkdCUFLYPX+tiDNwgVaLTp559TEAxPru/wuGUeCZGTzvPEfCME';
      testAudio.autoplay = true;
      testAudio.volume = 0.1; // Low volume test
      
      if (selectedOutputDevice && 'setSinkId' in testAudio) {
        await (testAudio as any).setSinkId(selectedOutputDevice);
        console.log('Test audio sink ID set to:', selectedOutputDevice);
      }
      
      testAudio.play().then(() => {
        console.log('Test audio played successfully');
        setTimeout(() => {
          testAudio.remove();
        }, 1000);
      }).catch(error => {
        console.error('Test audio play failed:', error);
      });
      
    } catch (error) {
      console.error('Error testing audio output:', error);
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
    testAudioOutput,
    isLoading
  };
};