import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Volume2, RefreshCw } from 'lucide-react';
import { useAudioDevices } from '@/hooks/useAudioDevices';
import { toast } from '@/components/ui/use-toast';

interface AudioDeviceSelectorProps {
  className?: string;
}

export const AudioDeviceSelector: React.FC<AudioDeviceSelectorProps> = ({ className }) => {
  const { 
    audioDevices, 
    selectedOutputDevice, 
    setAudioOutputDevice, 
    loadAudioDevices,
    testAudioOutput,
    isLoading 
  } = useAudioDevices();

  // Feature detection for choosing audio output (not supported on iOS Safari)
  const supportsOutputSelection = typeof (HTMLMediaElement.prototype as any).setSinkId === 'function';
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Fallback test tone using WebAudio API (works on Safari/iOS)
  const playWebAudioBeep = async () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        toast({ description: 'WebAudio not supported in this browser.' });
        return;
      }
      const ctx = new AudioCtx();
      await ctx.resume();
      const duration = 1.2;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.05);
      osc.onended = () => {
        try { ctx.close(); } catch {}
      };
    } catch (err) {
      console.error('WebAudio test tone failed', err);
      toast({ variant: 'destructive', description: 'Failed to play test tone.' });
    }
  };
  const handleDeviceChange = async (deviceId: string) => {
    await setAudioOutputDevice(deviceId);
  };

  const handleRefresh = () => {
    loadAudioDevices();
  };

  const handleTestAudio = async () => {
    if (!supportsOutputSelection || isIOS) {
      if (!supportsOutputSelection) {
        toast({ description: 'Output selection not supported in this browser. Playing test tone via default output.' });
      }
      await playWebAudioBeep();
      return;
    }

    testAudioOutput();
  };

  return (
    <Card className={`p-4 ${className}`}>
        <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Volume2 className="h-4 w-4" />
            <h3 className="text-sm font-medium">Audio Output</h3>
          </div>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTestAudio}
              disabled={isLoading || (supportsOutputSelection ? !selectedOutputDevice : false)}
              title="Test audio output"
            >
              🔊
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              title="Refresh devices"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Select
            value={selectedOutputDevice}
            onValueChange={handleDeviceChange}
            disabled={isLoading || !supportsOutputSelection || audioDevices.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue 
                placeholder={
                  !supportsOutputSelection
                    ? "Audio output selection not supported on this browser"
                    : isLoading 
                      ? "Loading devices..." 
                      : audioDevices.length === 0 
                        ? "No audio devices found" 
                        : "Select audio output"
                } 
              />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              {audioDevices.map((device) => (
                <SelectItem 
                  key={device.deviceId} 
                  value={device.deviceId}
                  className="hover:bg-muted"
                >
                  {device.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!supportsOutputSelection && (
            <p className="text-xs text-muted-foreground">
              Your browser doesn’t support choosing audio outputs (e.g., Safari on iOS). Using the default output. Use the test button to verify sound.
            </p>
          )}

          {supportsOutputSelection && audioDevices.length === 0 && !isLoading && (
            <p className="text-xs text-muted-foreground">
              No audio output devices found. Please check your system settings.
            </p>
          )}

          {supportsOutputSelection && selectedOutputDevice && (
            <p className="text-xs text-muted-foreground">
              Selected: {audioDevices.find(d => d.deviceId === selectedOutputDevice)?.label}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};