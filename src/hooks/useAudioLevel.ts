import { useState, useEffect, useRef, useCallback } from 'react';

interface AudioLevelOptions {
  threshold?: number;
  smoothing?: number;
  fftSize?: number;
}

export function useAudioLevel(options: AudioLevelOptions = {}) {
  const {
    threshold = 0.1,
    smoothing = 0.8,
    fftSize = 256
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startListening = useCallback(async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setHasPermission(true);
      streamRef.current = stream;

      // Create audio context and analyser
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = fftSize;
      analyserRef.current.smoothingTimeConstant = smoothing;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      setIsListening(true);

      // Start analyzing audio levels
      const analyzeAudio = () => {
        if (!analyserRef.current) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate RMS (Root Mean Square) for audio level
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += (dataArray[i] / 255) ** 2;
        }
        const rms = Math.sqrt(sum / bufferLength);
        
        setAudioLevel(rms);
        setIsSpeaking(rms > threshold);

        animationFrameRef.current = requestAnimationFrame(analyzeAudio);
      };

      analyzeAudio();

    } catch (error) {
      console.error('Error accessing microphone:', error);
      setHasPermission(false);
    }
  }, [threshold, smoothing, fftSize]);

  const stopListening = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setIsListening(false);
    setIsSpeaking(false);
    setAudioLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    isSpeaking,
    audioLevel,
    hasPermission,
    startListening,
    stopListening
  };
}