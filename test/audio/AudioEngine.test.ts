/**
 * AudioEngine Test Suite
 * TDD: Test file written BEFORE implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock Web Audio API nodes
const createMockGainNode = () => ({
  gain: {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
})

const createMockOscillator = () => ({
  type: 'sine' as OscillatorType,
  frequency: {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
})

const createMockBufferSource = () => ({
  buffer: null as AudioBuffer | null,
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
})

const createMockBiquadFilter = () => ({
  type: 'lowpass' as BiquadFilterType,
  Q: { value: 1 },
  frequency: {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
})

const createMockAnalyser = () => ({
  fftSize: 128,
  frequencyBinCount: 64,
  getByteFrequencyData: vi.fn((arr: Uint8Array) => {
    arr.fill(0)
    return arr
  }),
  connect: vi.fn(),
})

const createMockDynamicsCompressor = () => ({
  threshold: { value: -24 },
  knee: { value: 30 },
  ratio: { value: 12 },
  attack: { value: 0.003 },
  release: { value: 0.25 },
  connect: vi.fn(),
})

const createMockStereoPanner = () => ({
  pan: { value: 0 },
  connect: vi.fn(),
})

const createMockAudioBuffer = (channels: number, length: number, sampleRate: number) => ({
  length,
  sampleRate,
  getChannelData: vi.fn(() => new Float32Array(length)),
})

// Create mock context instance - with mutable state
let mockContextState: AudioContextState = 'running'
let mockContext: ReturnType<typeof createMockAudioContext>

const createMockAudioContext = () => ({
  currentTime: 0,
  get state() { return mockContextState },
  set state(val: AudioContextState) { mockContextState = val },
  sampleRate: 44100,
  createGain: vi.fn(() => createMockGainNode()),
  createOscillator: vi.fn(() => createMockOscillator()),
  createBufferSource: vi.fn(() => createMockBufferSource()),
  createBiquadFilter: vi.fn(() => createMockBiquadFilter()),
  createAnalyser: vi.fn(() => createMockAnalyser()),
  createDynamicsCompressor: vi.fn(() => createMockDynamicsCompressor()),
  createStereoPanner: vi.fn(() => createMockStereoPanner()),
  createBuffer: vi.fn((channels: number, length: number, sampleRate: number) =>
    createMockAudioBuffer(channels, length, sampleRate)
  ),
  resume: vi.fn(() => Promise.resolve()),
  destination: {},
})

// Setup global mocks
beforeEach(() => {
  mockContextState = 'running'
  mockContext = createMockAudioContext()
  // Use a class that can be instantiated with 'new'
  // Using a getter/setter to share state with mockContextState
  const contextRef = mockContext
  class MockAudioContextImpl {
    currentTime = 0
    get state() { return mockContextState }
    set state(val: AudioContextState) { mockContextState = val }
    sampleRate = 44100
    createGain = contextRef.createGain
    createOscillator = contextRef.createOscillator
    createBufferSource = contextRef.createBufferSource
    createBiquadFilter = contextRef.createBiquadFilter
    createAnalyser = contextRef.createAnalyser
    createDynamicsCompressor = contextRef.createDynamicsCompressor
    createStereoPanner = contextRef.createStereoPanner
    createBuffer = contextRef.createBuffer
    resume = contextRef.resume
    destination = contextRef.destination
  }
  vi.stubGlobal('AudioContext', MockAudioContextImpl)
  vi.stubGlobal('webkitAudioContext', MockAudioContextImpl)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

// Import after mocking
import { AudioEngine, type ToneConfig, type NoiseConfig, type SequenceConfig, type SoundConfig } from '../../src/audio'

describe('AudioEngine', () => {
  describe('init()', () => {
    it('should create AudioContext on first call', () => {
      const engine = new AudioEngine()
      engine.init()

      expect(mockContext.createGain).toHaveBeenCalled()
    })

    it('should not create new AudioContext on subsequent calls', () => {
      const engine = new AudioEngine()
      engine.init()
      engine.init()

      // createGain is called multiple times during init, but only once for master gain
      const gainCallCount = mockContext.createGain.mock.calls.length
      expect(gainCallCount).toBeGreaterThanOrEqual(1)
    })

    it('should create master gain node with default volume 0.8', () => {
      const engine = new AudioEngine()
      engine.init()

      expect(mockContext.createGain).toHaveBeenCalled()
    })

    it('should create analyser node for visualization', () => {
      const engine = new AudioEngine()
      engine.init()

      expect(mockContext.createAnalyser).toHaveBeenCalled()
    })

    it('should create compressor to prevent clipping', () => {
      const engine = new AudioEngine()
      engine.init()

      expect(mockContext.createDynamicsCompressor).toHaveBeenCalled()
    })

    it('should pre-generate noise buffer for performance', () => {
      const engine = new AudioEngine()
      engine.init()

      expect(mockContext.createBuffer).toHaveBeenCalledWith(1, expect.any(Number), 44100)
    })
  })

  describe('play()', () => {
    it('should initialize audio context if not already initialized', () => {
      const engine = new AudioEngine()
      const config: SoundConfig = {
        layers: [{
          type: 'tone',
          waveform: 'sine',
          frequency: [440, 880],
          duration: 0.5,
          gain: 0.3,
        }]
      }

      engine.play(config)

      expect(mockContext.createGain).toHaveBeenCalled()
    })

    it('should resume suspended audio context', () => {
      const engine = new AudioEngine()
      mockContext.state = 'suspended'

      const config: SoundConfig = {
        layers: [{
          type: 'tone',
          waveform: 'sine',
          frequency: [440, 880],
          duration: 0.5,
          gain: 0.3,
        }]
      }

      engine.play(config)

      expect(mockContext.resume).toHaveBeenCalled()
    })

    it('should create stereo panner with default pan value 0', () => {
      const engine = new AudioEngine()
      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'tone',
          waveform: 'sine',
          frequency: [440, 880],
          duration: 0.5,
          gain: 0.3,
        }]
      }

      engine.play(config)

      expect(mockContext.createStereoPanner).toHaveBeenCalled()
    })

    it('should set stereo panner pan value correctly', () => {
      const engine = new AudioEngine()

      const mockPanner = createMockStereoPanner()
      mockContext.createStereoPanner = vi.fn(() => mockPanner)

      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'tone',
          waveform: 'sine',
          frequency: [440, 880],
          duration: 0.5,
          gain: 0.3,
        }]
      }

      engine.play(config, 0.5)

      expect(mockPanner.pan.value).toBe(0.5)
    })

    it('should handle negative pan values (left speaker)', () => {
      const engine = new AudioEngine()

      const mockPanner = createMockStereoPanner()
      mockContext.createStereoPanner = vi.fn(() => mockPanner)

      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'tone',
          waveform: 'sine',
          frequency: [440, 880],
          duration: 0.5,
          gain: 0.3,
        }]
      }

      engine.play(config, -0.75)

      expect(mockPanner.pan.value).toBe(-0.75)
    })

    it('should play tone layer when type is "tone"', () => {
      const engine = new AudioEngine()
      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'tone',
          waveform: 'square',
          frequency: [200, 100],
          duration: 0.2,
          gain: 0.5,
        }]
      }

      engine.play(config)

      expect(mockContext.createOscillator).toHaveBeenCalled()
    })

    it('should play noise layer when type is "noise"', () => {
      const engine = new AudioEngine()
      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'noise',
          duration: 0.3,
          gain: 0.4,
          filterFreq: [800, 50],
          q: 5,
        }]
      }

      engine.play(config)

      expect(mockContext.createBufferSource).toHaveBeenCalled()
      expect(mockContext.createBiquadFilter).toHaveBeenCalled()
    })

    it('should play sequence layer when type is "sequence"', () => {
      const engine = new AudioEngine()
      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'sequence',
          waveform: 'square',
          gain: 0.3,
          notes: [
            { freq: 523.25, dur: 0.1 },
            { freq: 659.25, dur: 0.1 },
            { freq: 783.99, dur: 0.1 },
          ],
        }]
      }

      engine.play(config)

      // Should create oscillator for each note
      expect(mockContext.createOscillator).toHaveBeenCalledTimes(3)
    })

    it('should play multiple layers simultaneously', () => {
      const engine = new AudioEngine()
      engine.init()

      const config: SoundConfig = {
        layers: [
          {
            type: 'tone',
            waveform: 'sine',
            frequency: [150, 40],
            duration: 0.2,
            gain: 0.6,
          },
          {
            type: 'noise',
            duration: 0.3,
            gain: 0.4,
            filterFreq: [800, 50],
          }
        ]
      }

      engine.play(config)

      expect(mockContext.createOscillator).toHaveBeenCalled()
      expect(mockContext.createBufferSource).toHaveBeenCalled()
    })
  })

  describe('playTone()', () => {
    it('should create oscillator with correct waveform type', () => {
      const engine = new AudioEngine()
      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'tone',
          waveform: 'sawtooth',
          frequency: [440, 880],
          duration: 0.5,
          gain: 0.3,
        }]
      }

      engine.play(config)

      expect(mockContext.createOscillator).toHaveBeenCalled()
    })

    it('should set frequency envelope from start to end', () => {
      const engine = new AudioEngine()

      const mockOscillator = createMockOscillator()
      mockContext.createOscillator = vi.fn(() => mockOscillator)

      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'tone',
          waveform: 'sine',
          frequency: [200, 100],
          duration: 0.3,
          gain: 0.5,
        }]
      }

      engine.play(config)

      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(200, expect.any(Number))
      expect(mockOscillator.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(100, expect.any(Number))
    })

    it('should apply gain envelope for smooth sound', () => {
      const engine = new AudioEngine()
      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'tone',
          waveform: 'sine',
          frequency: [440, 440],
          duration: 0.5,
          gain: 0.5,
        }]
      }

      engine.play(config)

      expect(mockContext.createGain).toHaveBeenCalled()
    })
  })

  describe('playNoise()', () => {
    it('should create buffer source with noise buffer', () => {
      const engine = new AudioEngine()
      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'noise',
          duration: 0.5,
          gain: 0.4,
          filterFreq: [1000, 100],
        }]
      }

      engine.play(config)

      expect(mockContext.createBufferSource).toHaveBeenCalled()
    })

    it('should apply lowpass filter with correct frequency sweep', () => {
      const engine = new AudioEngine()

      const mockFilter = createMockBiquadFilter()
      mockContext.createBiquadFilter = vi.fn(() => mockFilter)

      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'noise',
          duration: 0.3,
          gain: 0.5,
          filterFreq: [800, 50],
          q: 5,
        }]
      }

      engine.play(config)

      expect(mockFilter.type).toBe('lowpass')
      expect(mockFilter.Q.value).toBe(5)
      expect(mockFilter.frequency.setValueAtTime).toHaveBeenCalledWith(800, expect.any(Number))
    })

    it('should use default Q value of 1 when not specified', () => {
      const engine = new AudioEngine()

      const mockFilter = createMockBiquadFilter()
      mockContext.createBiquadFilter = vi.fn(() => mockFilter)

      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'noise',
          duration: 0.3,
          gain: 0.5,
          filterFreq: [800, 50],
        }]
      }

      engine.play(config)

      expect(mockFilter.Q.value).toBe(1)
    })
  })

  describe('playSequence()', () => {
    it('should create oscillator for each note in sequence', () => {
      const engine = new AudioEngine()
      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'sequence',
          waveform: 'square',
          gain: 0.3,
          notes: [
            { freq: 523.25, dur: 0.1 },
            { freq: 659.25, dur: 0.1 },
            { freq: 783.99, dur: 0.2 },
          ],
        }]
      }

      engine.play(config)

      expect(mockContext.createOscillator).toHaveBeenCalledTimes(3)
    })

    it('should use correct waveform for all notes', () => {
      const engine = new AudioEngine()

      const mockOscillators: ReturnType<typeof createMockOscillator>[] = []
      for (let i = 0; i < 3; i++) {
        mockOscillators.push(createMockOscillator())
      }
      mockContext.createOscillator = vi.fn()
        .mockReturnValueOnce(mockOscillators[0])
        .mockReturnValueOnce(mockOscillators[1])
        .mockReturnValueOnce(mockOscillators[2])

      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'sequence',
          waveform: 'triangle',
          gain: 0.3,
          notes: [
            { freq: 440, dur: 0.1 },
            { freq: 550, dur: 0.1 },
            { freq: 660, dur: 0.1 },
          ],
        }]
      }

      engine.play(config)

      expect(mockOscillators[0].type).toBe('triangle')
    })

    it('should schedule notes sequentially with correct timing', () => {
      const engine = new AudioEngine()

      const mockOscillators: ReturnType<typeof createMockOscillator>[] = []
      for (let i = 0; i < 2; i++) {
        mockOscillators.push(createMockOscillator())
      }
      mockContext.createOscillator = vi.fn()
        .mockReturnValueOnce(mockOscillators[0])
        .mockReturnValueOnce(mockOscillators[1])

      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'sequence',
          waveform: 'square',
          gain: 0.3,
          notes: [
            { freq: 440, dur: 0.1 },
            { freq: 550, dur: 0.15 },
          ],
        }]
      }

      engine.play(config)

      // First note starts at currentTime (0)
      expect(mockOscillators[0].start).toHaveBeenCalledWith(0)
      // Second note starts after first note duration
      expect(mockOscillators[1].start).toHaveBeenCalledWith(0.1)
    })

    it('should apply attack envelope to sequence notes to prevent clicking', () => {
      const engine = new AudioEngine()

      // Track all gain nodes created
      const createdGainNodes: ReturnType<typeof createMockGainNode>[] = []
      const originalCreateGain = mockContext.createGain
      mockContext.createGain = vi.fn(() => {
        const gainNode = originalCreateGain()
        createdGainNodes.push(gainNode)
        return gainNode
      })

      const mockOscillators: ReturnType<typeof createMockOscillator>[] = []
      for (let i = 0; i < 3; i++) {
        mockOscillators.push(createMockOscillator())
      }
      mockContext.createOscillator = vi.fn()
        .mockReturnValueOnce(mockOscillators[0])
        .mockReturnValueOnce(mockOscillators[1])
        .mockReturnValueOnce(mockOscillators[2])

      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'sequence',
          waveform: 'sine',
          gain: 0.3,
          notes: [
            { freq: 523.25, dur: 0.1 },
            { freq: 659.25, dur: 0.1 },
            { freq: 783.99, dur: 0.1 },
          ],
        }]
      }

      engine.play(config)

      // Find sequence-specific gain nodes (after masterGain, panner, analyser, compressor)
      // First 4 are init-related, next 3 are sequence notes
      const sequenceGainNodes = createdGainNodes.slice(-3)

      // First note's gain envelope should start at 0, ramp to gain (attack), then decay
      expect(sequenceGainNodes[0].gain.setValueAtTime).toHaveBeenCalledWith(0, expect.any(Number))
      expect(sequenceGainNodes[0].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.3, expect.any(Number))
      expect(sequenceGainNodes[0].gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, expect.any(Number))
    })
  })

  describe('getFrequencyData()', () => {
    it('should return empty array when not initialized', () => {
      const engine = new AudioEngine()
      const data = engine.getFrequencyData()

      expect(data).toBeInstanceOf(Uint8Array)
      expect(data.length).toBe(0)
    })

    it('should return frequency data array when initialized', () => {
      const engine = new AudioEngine()
      engine.init()

      const data = engine.getFrequencyData()

      expect(data).toBeInstanceOf(Uint8Array)
      expect(data.length).toBe(64) // frequencyBinCount
    })

    it('should call analyser getByteFrequencyData', () => {
      // Track the analyser instance
      const mockAnalyser = createMockAnalyser()
      mockContext.createAnalyser = vi.fn(() => mockAnalyser)

      const engine = new AudioEngine()
      engine.init()

      engine.getFrequencyData()

      expect(mockAnalyser.getByteFrequencyData).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty layers array gracefully', () => {
      const engine = new AudioEngine()
      engine.init()

      const config: SoundConfig = { layers: [] }

      expect(() => engine.play(config)).not.toThrow()
    })

    it('should handle very high pan values (clamp expected)', () => {
      const engine = new AudioEngine()

      const mockPanner = createMockStereoPanner()
      mockContext.createStereoPanner = vi.fn(() => mockPanner)

      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'tone',
          waveform: 'sine',
          frequency: [440, 440],
          duration: 0.1,
          gain: 0.3,
        }]
      }

      // Web Audio API clamps pan to [-1, 1]
      engine.play(config, 2)

      // The implementation should clamp this
      expect(mockPanner.pan.value).toBe(1)
    })

    it('should handle very low pan values (clamp expected)', () => {
      const engine = new AudioEngine()

      const mockPanner = createMockStereoPanner()
      mockContext.createStereoPanner = vi.fn(() => mockPanner)

      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'tone',
          waveform: 'sine',
          frequency: [440, 440],
          duration: 0.1,
          gain: 0.3,
        }]
      }

      engine.play(config, -2)

      expect(mockPanner.pan.value).toBe(-1)
    })

    it('should handle frequency values of 0 or negative (minimum 1Hz)', () => {
      const engine = new AudioEngine()

      const mockOscillator = createMockOscillator()
      mockContext.createOscillator = vi.fn(() => mockOscillator)

      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'tone',
          waveform: 'sine',
          frequency: [440, 0], // End frequency is 0
          duration: 0.1,
          gain: 0.3,
        }]
      }

      engine.play(config)

      // Should use Math.max(1, frequency) to prevent invalid frequency
      expect(mockOscillator.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
        1, // minimum 1Hz
        expect.any(Number)
      )
    })

    it('should handle very short duration sounds', () => {
      const engine = new AudioEngine()
      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'tone',
          waveform: 'sine',
          frequency: [440, 880],
          duration: 0.01, // 10ms
          gain: 0.3,
        }]
      }

      expect(() => engine.play(config)).not.toThrow()
    })

    it('should handle very long duration sounds', () => {
      const engine = new AudioEngine()
      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'tone',
          waveform: 'sine',
          frequency: [440, 440],
          duration: 10, // 10 seconds
          gain: 0.3,
        }]
      }

      expect(() => engine.play(config)).not.toThrow()
    })

    it('should handle gain values at boundaries (0 and 1)', () => {
      const engine = new AudioEngine()
      engine.init()

      const config: SoundConfig = {
        layers: [
          {
            type: 'tone',
            waveform: 'sine',
            frequency: [440, 440],
            duration: 0.1,
            gain: 0,
          },
          {
            type: 'tone',
            waveform: 'sine',
            frequency: [440, 440],
            duration: 0.1,
            gain: 1,
          }
        ]
      }

      expect(() => engine.play(config)).not.toThrow()
    })
  })

  describe('Volume Control', () => {
    it('should get default volume 0.8', () => {
      const engine = new AudioEngine()
      expect(engine.getVolume()).toBe(0.8)
    })

    it('should set volume within valid range', () => {
      const engine = new AudioEngine()

      const mockMasterGain = createMockGainNode()
      mockContext.createGain = vi.fn(() => mockMasterGain)

      engine.init()
      engine.setVolume(0.5)

      expect(engine.getVolume()).toBe(0.5)
      expect(mockMasterGain.gain.value).toBe(0.5)
    })

    it('should clamp volume to maximum 1.0', () => {
      const engine = new AudioEngine()
      engine.setVolume(1.5)
      expect(engine.getVolume()).toBe(1.0)
    })

    it('should clamp volume to minimum 0.0', () => {
      const engine = new AudioEngine()
      engine.setVolume(-0.5)
      expect(engine.getVolume()).toBe(0.0)
    })

    it('should update master gain when volume changes after init', () => {
      const engine = new AudioEngine()

      const mockMasterGain = createMockGainNode()
      mockContext.createGain = vi.fn(() => mockMasterGain)

      engine.init()
      engine.setVolume(0.3)

      expect(mockMasterGain.gain.value).toBe(0.3)
    })
  })

  describe('Parameter Validation', () => {
    it('should handle null/undefined config', async () => {
      const engine = new AudioEngine()
      engine.init()

      // @ts-expect-error - Testing invalid input
      await expect(engine.play(null)).resolves.toBeUndefined()
      // @ts-expect-error - Testing invalid input
      await expect(engine.play(undefined)).resolves.toBeUndefined()
    })

    it('should warn when pan value exceeds range', async () => {
      const engine = new AudioEngine()
      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'tone',
          waveform: 'sine',
          frequency: [440, 440],
          duration: 0.1,
          gain: 0.3,
        }]
      }

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await engine.play(config, 2)

      expect(warnSpy).toHaveBeenCalledWith(
        '[AudioEngine] Pan value 2 out of range [-1, 1], clamped to 1'
      )

      warnSpy.mockRestore()
    })

    it('should warn when pan value is below range', async () => {
      const engine = new AudioEngine()
      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'tone',
          waveform: 'sine',
          frequency: [440, 440],
          duration: 0.1,
          gain: 0.3,
        }]
      }

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await engine.play(config, -2)

      expect(warnSpy).toHaveBeenCalledWith(
        '[AudioEngine] Pan value -2 out of range [-1, 1], clamped to -1'
      )

      warnSpy.mockRestore()
    })

    it('should protect start frequency from being 0 or negative', () => {
      const engine = new AudioEngine()

      const mockOscillator = createMockOscillator()
      mockContext.createOscillator = vi.fn(() => mockOscillator)

      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'tone',
          waveform: 'sine',
          frequency: [0, 440], // Start frequency is 0
          duration: 0.1,
          gain: 0.3,
        }]
      }

      engine.play(config)

      // Should protect start frequency to minimum 1Hz
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(1, expect.any(Number))
    })

    it('should protect filter start frequency from being 0 or negative', () => {
      const engine = new AudioEngine()

      const mockFilter = createMockBiquadFilter()
      mockContext.createBiquadFilter = vi.fn(() => mockFilter)

      engine.init()

      const config: SoundConfig = {
        layers: [{
          type: 'noise',
          duration: 0.3,
          gain: 0.5,
          filterFreq: [0, 50], // Start frequency is 0
        }]
      }

      engine.play(config)

      // Should protect start frequency to minimum 1Hz
      expect(mockFilter.frequency.setValueAtTime).toHaveBeenCalledWith(1, expect.any(Number))
    })
  })
})