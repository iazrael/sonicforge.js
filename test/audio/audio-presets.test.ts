/**
 * audio-presets Test Suite
 * TDD: Test file written BEFORE implementation
 */

import { describe, it, expect } from 'vitest'

import {
  AUDIO_CONFIG,
  UI_SOUNDS,
  WEAPON_SOUNDS,
  EXPLOSION_SOUNDS,
  HIT_SOUNDS,
  GAME_SOUNDS,
  type AudioConfig
} from '../../src/audio-presets'

describe('AUDIO_CONFIG', () => {
  describe('UI sound effects', () => {
    it('should have click sound configuration', () => {
      expect(UI_SOUNDS.click).toBeDefined()
      expect(UI_SOUNDS.click.layers).toBeInstanceOf(Array)
      expect(UI_SOUNDS.click.layers[0].type).toBe('tone')
    })

    it('should have confirm sound configuration', () => {
      expect(UI_SOUNDS.confirm).toBeDefined()
      expect(UI_SOUNDS.confirm.layers[0].type).toBe('tone')
    })

    it('should have cancel sound configuration', () => {
      expect(UI_SOUNDS.cancel).toBeDefined()
      expect(UI_SOUNDS.cancel.layers[0].type).toBe('tone')
    })

    it('should use appropriate waveforms for UI sounds', () => {
      expect(UI_SOUNDS.click.layers[0].type === 'tone' && UI_SOUNDS.click.layers[0].waveform).toBe('sine')
      expect(UI_SOUNDS.cancel.layers[0].type === 'tone' && UI_SOUNDS.cancel.layers[0].waveform).toBe('triangle')
    })
  })

  describe('Weapon sound effects', () => {
    it('should have vulcan weapon sound', () => {
      expect(WEAPON_SOUNDS.vulcan).toBeDefined()
      expect(WEAPON_SOUNDS.vulcan.layers[0].type).toBe('tone')
      expect(WEAPON_SOUNDS.vulcan.layers[0].type === 'tone' && WEAPON_SOUNDS.vulcan.layers[0].waveform).toBe('square')
    })

    it('should have laser weapon sound', () => {
      expect(WEAPON_SOUNDS.laser).toBeDefined()
      expect(WEAPON_SOUNDS.laser.layers[0].type === 'tone' && WEAPON_SOUNDS.laser.layers[0].waveform).toBe('sawtooth')
    })

    it('should have missile weapon sound with low frequency', () => {
      expect(WEAPON_SOUNDS.missile).toBeDefined()
      const layer = WEAPON_SOUNDS.missile.layers[0]
      if (layer.type === 'tone') {
        expect(layer.frequency[0]).toBeLessThan(200)
      }
    })

    it('should have wave weapon sound', () => {
      expect(WEAPON_SOUNDS.wave).toBeDefined()
    })

    it('should have plasma weapon sound', () => {
      expect(WEAPON_SOUNDS.plasma).toBeDefined()
    })

    it('should have tesla weapon sound with sequence type', () => {
      expect(WEAPON_SOUNDS.tesla).toBeDefined()
      const layer = WEAPON_SOUNDS.tesla.layers[0]
      expect(layer.type).toBe('sequence')
      if (layer.type === 'sequence') {
        expect(layer.notes.length).toBeGreaterThan(0)
      }
    })

    it('should have magma weapon sound', () => {
      expect(WEAPON_SOUNDS.magma).toBeDefined()
    })

    it('should have shuriken weapon sound', () => {
      expect(WEAPON_SOUNDS.shuriken).toBeDefined()
    })
  })

  describe('Explosion sound effects', () => {
    it('should have small explosion with multi-layer design', () => {
      expect(EXPLOSION_SOUNDS.small).toBeDefined()
      expect(EXPLOSION_SOUNDS.small.layers.length).toBeGreaterThanOrEqual(1)
    })

    it('should have large explosion with multiple layers', () => {
      expect(EXPLOSION_SOUNDS.large).toBeDefined()
      expect(EXPLOSION_SOUNDS.large.layers.length).toBeGreaterThanOrEqual(2)
    })

    it('should use noise layer in explosions for realistic sound', () => {
      const smallLayers = EXPLOSION_SOUNDS.small.layers
      const hasNoiseLayer = smallLayers.some(layer => layer.type === 'noise')
      expect(hasNoiseLayer).toBe(true)
    })

    it('should have appropriate Q value for noise filter', () => {
      const noiseLayer = EXPLOSION_SOUNDS.small.layers.find(l => l.type === 'noise')
      if (noiseLayer && noiseLayer.type === 'noise') {
        expect(noiseLayer.q).toBeGreaterThanOrEqual(1)
        expect(noiseLayer.q).toBeLessThanOrEqual(20)
      }
    })
  })

  describe('Hit sound effects', () => {
    it('should have shield hit sound with high frequency', () => {
      expect(HIT_SOUNDS.shield).toBeDefined()
      const layer = HIT_SOUNDS.shield.layers[0]
      if (layer.type === 'tone') {
        expect(layer.frequency[0]).toBeGreaterThan(1000)
      }
    })

    it('should have hull hit sound with noise and tone layers', () => {
      expect(HIT_SOUNDS.hull).toBeDefined()
      expect(HIT_SOUNDS.hull.layers.length).toBe(2)

      const hasNoise = HIT_SOUNDS.hull.layers.some(l => l.type === 'noise')
      const hasTone = HIT_SOUNDS.hull.layers.some(l => l.type === 'tone')
      expect(hasNoise).toBe(true)
      expect(hasTone).toBe(true)
    })
  })

  describe('Game state sound effects', () => {
    it('should have powerup sound with ascending sequence', () => {
      expect(GAME_SOUNDS.powerup).toBeDefined()
      const layer = GAME_SOUNDS.powerup.layers[0]
      if (layer.type === 'sequence') {
        expect(layer.notes.length).toBeGreaterThan(1)
      }
    })

    it('should have levelup sound', () => {
      expect(GAME_SOUNDS.levelup).toBeDefined()
    })

    it('should have victory sound', () => {
      expect(GAME_SOUNDS.victory).toBeDefined()
    })

    it('should have defeat sound with descending pattern', () => {
      expect(GAME_SOUNDS.defeat).toBeDefined()
      const layer = GAME_SOUNDS.defeat.layers[0]
      if (layer.type === 'sequence') {
        expect(layer.notes.length).toBeGreaterThan(1)
      }
    })

    it('should have boss warning sound with multi-layer', () => {
      expect(GAME_SOUNDS.bossWarning).toBeDefined()
      expect(GAME_SOUNDS.bossWarning.layers.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Type safety and structure', () => {
    it('should have valid gain values between 0 and 1', () => {
      const validateGain = (config: { layers: Array<{ gain: number }> }): void => {
        config.layers.forEach((layer) => {
          expect(layer.gain).toBeGreaterThanOrEqual(0)
          expect(layer.gain).toBeLessThanOrEqual(1)
        })
      }

      validateGain(UI_SOUNDS.click)
      validateGain(WEAPON_SOUNDS.vulcan)
      validateGain(EXPLOSION_SOUNDS.large)
    })

    it('should have valid duration values (positive)', () => {
      const validateDuration = (config: { layers: Array<{ duration?: number }> }): void => {
        config.layers.forEach((layer) => {
          if (layer.duration !== undefined) {
            expect(layer.duration).toBeGreaterThan(0)
          }
        })
      }

      validateDuration(UI_SOUNDS.click)
      validateDuration(WEAPON_SOUNDS.laser)
      validateDuration(EXPLOSION_SOUNDS.small)
    })

    it('should have valid waveform types', () => {
      const validWaveforms = ['sine', 'square', 'sawtooth', 'triangle']

      const validateWaveform = (config: { layers: Array<{ type: string; waveform?: string }> }): void => {
        config.layers.forEach((layer) => {
          if (layer.waveform) {
            expect(validWaveforms).toContain(layer.waveform)
          }
        })
      }

      validateWaveform(UI_SOUNDS.click)
      validateWaveform(WEAPON_SOUNDS.vulcan)
      validateWaveform(GAME_SOUNDS.powerup)
    })

    it('should have valid frequency arrays for tones', () => {
      const validateFrequency = (config: { layers: Array<{ type: string; frequency?: [number, number] }> }): void => {
        config.layers.forEach((layer) => {
          if (layer.type === 'tone' && layer.frequency) {
            expect(layer.frequency).toBeInstanceOf(Array)
            expect(layer.frequency.length).toBe(2)
            expect(layer.frequency[0]).toBeGreaterThan(0)
            expect(layer.frequency[1]).toBeGreaterThan(0)
          }
        })
      }

      validateFrequency(UI_SOUNDS.click)
      validateFrequency(WEAPON_SOUNDS.vulcan)
    })

    it('should have valid filterFreq arrays for noise', () => {
      const noiseLayer = EXPLOSION_SOUNDS.small.layers.find(l => l.type === 'noise')
      if (noiseLayer && noiseLayer.type === 'noise') {
        expect(noiseLayer.filterFreq).toBeInstanceOf(Array)
        expect(noiseLayer.filterFreq.length).toBe(2)
        expect(noiseLayer.filterFreq[0]).toBeGreaterThan(0)
        expect(noiseLayer.filterFreq[1]).toBeGreaterThan(0)
      }
    })

    it('should export AudioConfig type', () => {
      const config: AudioConfig = AUDIO_CONFIG
      expect(config).toBe(AUDIO_CONFIG)
    })
  })

  describe('Musical notes in sequences', () => {
    it('should use valid note frequencies (Hz)', () => {
      const validateNotes = (config: { layers: Array<{ type: string; notes?: Array<{ freq: number; dur: number }> }> }): void => {
        config.layers.forEach((layer) => {
          if (layer.type === 'sequence' && layer.notes) {
            layer.notes.forEach((note) => {
              expect(note.freq).toBeGreaterThan(20)
              expect(note.freq).toBeLessThan(20000)
              expect(note.dur).toBeGreaterThan(0)
            })
          }
        })
      }

      validateNotes(GAME_SOUNDS.powerup)
      validateNotes(WEAPON_SOUNDS.tesla)
    })

    it('should have powerup using C major chord progression', () => {
      const layer = GAME_SOUNDS.powerup.layers[0]
      if (layer.type === 'sequence') {
        expect(layer.notes[0].freq).toBeCloseTo(523.25, 0)
        expect(layer.notes[1].freq).toBeCloseTo(659.25, 0)
        expect(layer.notes[2].freq).toBeCloseTo(783.99, 0)
        expect(layer.notes[3].freq).toBeCloseTo(1046.50, 0)
      }
    })
  })

  describe('Module exports', () => {
    it('should export all sound categories', () => {
      expect(UI_SOUNDS).toBeDefined()
      expect(WEAPON_SOUNDS).toBeDefined()
      expect(EXPLOSION_SOUNDS).toBeDefined()
      expect(HIT_SOUNDS).toBeDefined()
      expect(GAME_SOUNDS).toBeDefined()
    })

    it('should have AUDIO_CONFIG as combined object', () => {
      expect(AUDIO_CONFIG.ui).toBe(UI_SOUNDS)
      expect(AUDIO_CONFIG.weapon).toBe(WEAPON_SOUNDS)
      expect(AUDIO_CONFIG.explosion).toBe(EXPLOSION_SOUNDS)
      expect(AUDIO_CONFIG.hit).toBe(HIT_SOUNDS)
      expect(AUDIO_CONFIG.game).toBe(GAME_SOUNDS)
    })
  })
})
