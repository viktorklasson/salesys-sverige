import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Volume2, RefreshCw } from 'lucide-react';
import { useAudioDevices } from '@/hooks/useAudioDevices';

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

  const handleDeviceChange = async (deviceId: string) => {
    await setAudioOutputDevice(deviceId);
  };

  const handleRefresh = () => {
    loadAudioDevices();
  };

  const handleTestAudio = () => {
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
              disabled={isLoading || !selectedOutputDevice}
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
            disabled={isLoading || audioDevices.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue 
                placeholder={
                  isLoading 
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

          {audioDevices.length === 0 && !isLoading && (
            <p className="text-xs text-muted-foreground">
              No audio output devices found. Please check your system settings.
            </p>
          )}

          {selectedOutputDevice && (
            <p className="text-xs text-muted-foreground">
              Selected: {audioDevices.find(d => d.deviceId === selectedOutputDevice)?.label}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};