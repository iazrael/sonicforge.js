# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
# Development
npm run dev              # Start Vite dev server

# Testing
npm test                 # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:coverage    # Run tests with coverage report

# Build
npm run build            # TypeScript compilation + Vite build
npm run lint             # Run ESLint
```

**Running a single test:**
```bash
npm test -- --run -t "test name"
npm test -- --run test/audio/AudioEngine.test.ts
```

## Project Architecture

SonicForge v2 is a **programmatic game audio synthesis engine** for web games. All sound effects are generated in real-time using Web Audio API - no audio files required.

### Core Components

```
src/audio/
├── AudioEngine.ts    # Core engine: Web Audio API wrapper
├── types.ts          # TypeScript type definitions
└── index.ts          # Module exports

src/audio-presets.ts  # Pre-built sound library (UI, weapons, explosions, etc.)
src/main.ts           # Entry point / demo usage
```

### Audio Flow Architecture

```
AudioEngine.init()
    │
    ├─→ AudioContext creation
    ├─→ MasterGain (0.8 default volume)
    ├─→ DynamicsCompressor (prevents clipping from multiple sounds)
    ├─→ Analyser (for visualization)
    └─→ NoiseBuffer (pre-generated for performance)

AudioEngine.play(config, pan)
    │
    ├─→ StereoPanner (spatial positioning: -1 left → 1 right)
    └─→ For each layer:
        ├─→ Tone (oscillator with frequency sweep + gain envelope)
        ├─→ Noise (filtered noise buffer for explosions/impacts)
        └─→ Sequence (note sequences for melodies/jingles)
```

### Key Design Patterns

1. **Layer-based composition**: Each sound effect combines multiple layers (tone + noise + sequence)
2. **ADSR-like envelopes**: Fast attack (10ms), exponential decay prevents clicking/popping
3. **Frequency protection**: All frequencies use `Math.max(1, freq)` - Web Audio's `exponentialRampToValueAtTime` throws on 0
4. **Async AudioContext**: `play()` is async - awaits `ctx.resume()` to handle browser autoplay policies

### Sound Preset Structure

```typescript
// Single tone (weapon shoots, UI clicks)
{ type: 'tone', waveform: 'sine', frequency: [800, 1200], duration: 0.1, gain: 0.3 }

// Noise (explosions, impacts)
{ type: 'noise', duration: 0.3, gain: 0.4, filterFreq: [800, 50], q: 5 }

// Sequence (powerups, victory jingles)
{ type: 'sequence', waveform: 'square', gain: 0.3, notes: [{ freq: 523.25, dur: 0.1 }, ...] }
```

### Important Implementation Notes

- **Sequence notes** need 5ms attack envelope to prevent clicking between notes
- **Frequency arrays** are `[start, end]` - used for sweeps (not static pitches)
- **Pan values** are clamped to `[-1, 1]` with console warnings
- **AudioContext** must resume on user interaction (browser autoplay policy)
- **DynamicsCompressor** settings: threshold -24dB, ratio 12:1 prevents clipping

### Testing

- **Vitest + jsdom** with full Web Audio API mocking
- **Coverage threshold**: 80% (currently at 100% statements/functions/lines)
- **Mock pattern**: All Web Audio nodes are mocked before importing AudioEngine
- Tests verify audio graph structure, not actual sound output

### Path Aliases

`@/*` maps to `src/*` (configured in both vite.config.ts and tsconfig.json)
