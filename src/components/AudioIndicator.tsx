import React, { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudioLevel } from '@/hooks/useAudioLevel';
import { cn } from '@/lib/utils';

export function AudioIndicator() {
  const [userEnabled, setUserEnabled] = useState(false);
  const { 
    isListening, 
    isSpeaking, 
    audioLevel, 
    hasPermission, 
    startListening, 
    stopListening 
  } = useAudioLevel({
    threshold: 0.05, // Lower threshold for better sensitivity
    smoothing: 0.8,
    fftSize: 256
  });

  const handleToggle = async () => {
    if (isListening) {
      stopListening();
      setUserEnabled(false);
    } else {
      await startListening();
      setUserEnabled(true);
    }
  };

  // Don't show anything if permission was explicitly denied
  if (hasPermission === false) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      {/* Audio level indicator */}
      {isListening && (
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-sm transition-all duration-200",
          isSpeaking 
            ? "bg-green-500/20 border border-green-500/30" 
            : "bg-background/80 border border-border/50"
        )}>
          {/* Audio level bars */}
          <div className="flex items-end gap-px h-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 transition-all duration-100 rounded-sm",
                  audioLevel * 10 > i + 1 
                    ? isSpeaking 
                      ? "bg-green-500 h-full" 
                      : "bg-primary h-2"
                    : "bg-muted h-1"
                )}
              />
            ))}
          </div>
          
          {/* Speaking indicator */}
          {isSpeaking && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>
      )}

      {/* Toggle button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        className={cn(
          "h-8 w-8 p-0 backdrop-blur-sm transition-all duration-200",
          isListening 
            ? "bg-primary/10 border-primary/30 hover:bg-primary/20" 
            : "bg-background/80 border-border/50 hover:bg-background"
        )}
      >
        {isListening ? (
          <Mic className="h-4 w-4 text-primary" />
        ) : (
          <MicOff className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
}