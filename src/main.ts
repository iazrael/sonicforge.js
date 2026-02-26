import { AudioEngine } from './audio'
import { AUDIO_CONFIG } from './audio-presets'

// Demo: SonicForge Audio Engine
// This demonstrates the basic usage of the audio engine

const audio = new AudioEngine()

// Initialize on first user interaction
document.addEventListener('click', () => {
  audio.init()
  console.log('SonicForge Audio Engine initialized')
}, { once: true })

// Export for use in other modules
export { audio, AUDIO_CONFIG }