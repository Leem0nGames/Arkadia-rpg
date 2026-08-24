import { audioManager } from './audio/AudioManager';

// Re-export audioManager under the established 'sfx' namespace for full backward compatibility
export const sfx = audioManager;
export { audioManager };
