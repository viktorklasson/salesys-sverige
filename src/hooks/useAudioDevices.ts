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
      
      // Create a test audio element with a longer audio file
      const testAudio = document.createElement('audio');
      // Use a longer test tone (5 seconds of 440Hz sine wave)
      testAudio.src = 'data:audio/wav;base64,UklGRlAxAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSwxAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcAz2Y4OzkdCUFLYPX+tiDNwgVaLTp559TEAxPru/wuGUeCZGTzvPEfCMELYDN9daLOggSaLPp56dVEgxKoeHwwmAcAz6Y3+zmdyMGKoLR+NeLOggTaLTo56dWEglGn+LwwWAcBTyZ3+vmeScFKILM99iJOwcVaLXo5aFVEgxIouHwwGEcBDqX3+njeSUFKoHM9tiNOAcVZ7Xo4KJUEgxKpOLvwGEcBjiU3uvh';
      testAudio.autoplay = false;
      testAudio.volume = 0.3; // Moderate volume test
      testAudio.controls = false;
      
      // Set duration to 5 seconds
      testAudio.loop = false;
      
      if (selectedOutputDevice && 'setSinkId' in testAudio) {
        await (testAudio as any).setSinkId(selectedOutputDevice);
        console.log('Test audio sink ID set to:', selectedOutputDevice);
      }
      
      // Add event listeners for better feedback
      testAudio.addEventListener('loadeddata', () => {
        console.log('Test audio loaded, duration:', testAudio.duration);
      });
      
      testAudio.addEventListener('ended', () => {
        console.log('Test audio finished playing');
        testAudio.remove();
      });
      
      testAudio.addEventListener('error', (e) => {
        console.error('Test audio error:', e);
        testAudio.remove();
      });
      
      // Play the test audio
      testAudio.play().then(() => {
        console.log('Test audio started playing - you should hear 5 seconds of audio');
        
        // Auto-remove after 6 seconds as fallback
        setTimeout(() => {
          if (testAudio.parentNode) {
            testAudio.remove();
          }
        }, 6000);
      }).catch(error => {
        console.error('Test audio play failed:', error);
        testAudio.remove();
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