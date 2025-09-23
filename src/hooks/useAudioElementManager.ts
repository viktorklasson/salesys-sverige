import { useCallback } from 'react';

/**
 * Hook to manage Verto audio elements lifecycle
 * Ensures proper creation, monitoring and cleanup of audio elements
 */
export const useAudioElementManager = () => {

  const createAudioElements = useCallback(() => {
    console.log('🔧 Creating Verto audio elements...');
    
    // Remove existing elements to avoid conflicts
    const existingContainer = document.getElementById('verto-audio-container');
    if (existingContainer) {
      existingContainer.remove();
      console.log('🧹 Removed existing audio container');
    }

    // Create container
    const container = document.createElement('div');
    container.id = 'verto-audio-container';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '1px';
    container.style.height = '1px';

    // Create main audio element for remote stream
    const mainAudio = document.createElement('audio');
    mainAudio.id = 'main_audio';
    mainAudio.autoplay = true;
    (mainAudio as any).playsInline = true;
    mainAudio.controls = false;
    mainAudio.volume = 1.0;
    
    // Add event listeners for debugging
    mainAudio.addEventListener('loadedmetadata', () => {
      console.log('🎵 main_audio: metadata loaded');
    });
    
    mainAudio.addEventListener('canplay', () => {
      console.log('🎵 main_audio: can play');
    });
    
    mainAudio.addEventListener('play', () => {
      console.log('✅ main_audio: started playing');
    });
    
    mainAudio.addEventListener('pause', () => {
      console.log('⏸️ main_audio: paused');
    });
    
    // Monitor srcObject changes
    Object.defineProperty(mainAudio, 'srcObject', {
      get() { return this._srcObject; },
      set(value) {
        console.log('🎯 Setting srcObject on main_audio:', value ? 'MediaStream' : null);
        this._srcObject = value;
        if (value) {
          const tracks = value.getTracks();
          console.log('🎵 Stream tracks:', tracks.map(t => `${t.kind}:${t.enabled}:${t.readyState}`));
          
          // Try to play immediately
          this.play().then(() => {
            console.log('✅ Auto-play successful');
          }).catch(err => {
            console.warn('⚠️ Auto-play blocked:', err.message);
            
            // Add one-time click handler for user interaction
            const enableAudio = () => {
              this.play().then(() => {
                console.log('✅ Audio enabled after user interaction');
              }).catch(e => console.error('❌ Manual play failed:', e));
            };
            document.addEventListener('click', enableAudio, { once: true });
            document.addEventListener('touchstart', enableAudio, { once: true });
          });
        }
      }
    });
    
    // Create audio element for local stream
    const audioElement = document.createElement('audio');
    audioElement.id = 'audio_element';
    audioElement.autoplay = true;
    (audioElement as any).playsInline = true;
    audioElement.controls = false;
    audioElement.muted = true; // Local audio should be muted to avoid feedback

    // Add to container and DOM
    container.appendChild(mainAudio);
    container.appendChild(audioElement);
    document.body.appendChild(container);

    console.log('✅ Verto audio elements created successfully', {
      container: !!container,
      mainAudio: !!mainAudio,
      audioElement: !!audioElement,
      mainAudioInDOM: !!document.getElementById('main_audio'),
      audioElementInDOM: !!document.getElementById('audio_element')
    });

    return { container, mainAudio, audioElement };
  }, []);

  const ensureAudioElementsExist = useCallback(() => {
    const mainAudio = document.getElementById('main_audio');
    const audioElement = document.getElementById('audio_element');
    
    if (!mainAudio || !audioElement) {
      console.log('🔧 Audio elements missing, creating them...');
      return createAudioElements();
    } else {
      console.log('✅ Audio elements already exist');
      return {
        container: document.getElementById('verto-audio-container'),
        mainAudio: mainAudio as HTMLAudioElement,
        audioElement: audioElement as HTMLAudioElement
      };
    }
  }, [createAudioElements]);

  const cleanupAudioElements = useCallback(() => {
    console.log('🧹 Cleaning up Verto audio elements...');
    
    const container = document.getElementById('verto-audio-container');
    if (container) {
      // Stop all media streams before cleanup
      const mainAudio = container.querySelector('#main_audio') as HTMLAudioElement;
      const audioElement = container.querySelector('#audio_element') as HTMLAudioElement;
      
      [mainAudio, audioElement].forEach(audio => {
        if (audio?.srcObject) {
          const stream = audio.srcObject as MediaStream;
          stream.getTracks().forEach(track => {
            track.stop();
            console.log('🛑 Stopped track:', track.kind);
          });
        }
        if (audio) {
          audio.pause();
          audio.srcObject = null;
        }
      });
      
      container.remove();
      console.log('✅ Audio elements cleaned up successfully');
    } else {
      console.log('ℹ️ No audio container to clean up');
    }
  }, []);

  const getAudioElements = useCallback(() => {
    return {
      container: document.getElementById('verto-audio-container'),
      mainAudio: document.getElementById('main_audio') as HTMLAudioElement,
      audioElement: document.getElementById('audio_element') as HTMLAudioElement
    };
  }, []);

  return {
    createAudioElements,
    ensureAudioElementsExist, 
    cleanupAudioElements,
    getAudioElements
  };
};