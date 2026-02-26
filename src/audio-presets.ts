/**
 * SonicForge - 游戏音效预设配置
 * 项目的具体音效定义，与核心引擎分离以便复用
 */

import type { SoundConfig } from './audio'

/**
 * UI 交互音效
 */
export const UI_SOUNDS: Record<string, SoundConfig> = {
  click: {
    layers: [{
      type: 'tone',
      waveform: 'sine',
      frequency: [800, 1200],
      duration: 0.1,
      gain: 0.3
    }]
  },
  confirm: {
    layers: [{
      type: 'tone',
      waveform: 'sine',
      frequency: [800, 1600],
      duration: 0.15,
      gain: 0.3
    }]
  },
  cancel: {
    layers: [{
      type: 'tone',
      waveform: 'triangle',
      frequency: [600, 300],
      duration: 0.2,
      gain: 0.3
    }]
  }
}

/**
 * 武器音效
 */
export const WEAPON_SOUNDS: Record<string, SoundConfig> = {
  vulcan: {
    layers: [{
      type: 'tone',
      waveform: 'square',
      frequency: [400, 150],
      duration: 0.1,
      gain: 0.3
    }]
  },
  laser: {
    layers: [{
      type: 'tone',
      waveform: 'sawtooth',
      frequency: [800, 1200],
      duration: 0.2,
      gain: 0.2
    }]
  },
  missile: {
    layers: [{
      type: 'tone',
      waveform: 'triangle',
      frequency: [150, 50],
      duration: 0.4,
      gain: 0.5
    }]
  },
  wave: {
    layers: [{
      type: 'tone',
      waveform: 'sine',
      frequency: [300, 800],
      duration: 0.3,
      gain: 0.4
    }]
  },
  plasma: {
    layers: [{
      type: 'tone',
      waveform: 'square',
      frequency: [100, 50],
      duration: 0.3,
      gain: 0.4
    }]
  },
  tesla: {
    layers: [{
      type: 'sequence',
      waveform: 'square',
      notes: [
        { freq: 1500, dur: 0.05 },
        { freq: 2000, dur: 0.05 },
        { freq: 1500, dur: 0.05 }
      ],
      gain: 0.2
    }]
  },
  magma: {
    layers: [{
      type: 'tone',
      waveform: 'sawtooth',
      frequency: [200, 80],
      duration: 0.4,
      gain: 0.4
    }]
  },
  shuriken: {
    layers: [{
      type: 'tone',
      waveform: 'triangle',
      frequency: [1000, 600],
      duration: 0.15,
      gain: 0.3
    }]
  }
}

/**
 * 爆炸音效
 */
export const EXPLOSION_SOUNDS: Record<string, SoundConfig> = {
  small: {
    layers: [
      {
        type: 'tone',
        waveform: 'sine',
        frequency: [150, 40],
        duration: 0.2,
        gain: 0.6
      },
      {
        type: 'noise',
        duration: 0.3,
        gain: 0.4,
        filterFreq: [800, 50],
        q: 5
      }
    ]
  },
  large: {
    layers: [
      {
        type: 'tone',
        waveform: 'sine',
        frequency: [120, 30],
        duration: 0.3,
        gain: 0.8
      },
      {
        type: 'noise',
        duration: 0.8,
        gain: 0.5,
        filterFreq: [600, 20],
        q: 8
      },
      {
        type: 'tone',
        waveform: 'sawtooth',
        frequency: [100, 10],
        duration: 0.5,
        gain: 0.3
      }
    ]
  }
}

/**
 * 受击音效
 */
export const HIT_SOUNDS: Record<string, SoundConfig> = {
  shield: {
    layers: [{
      type: 'tone',
      waveform: 'sine',
      frequency: [1200, 2400],
      duration: 0.05,
      gain: 0.3
    }]
  },
  hull: {
    layers: [
      {
        type: 'noise',
        duration: 0.1,
        gain: 0.5,
        filterFreq: [400, 50],
        q: 3
      },
      {
        type: 'tone',
        waveform: 'triangle',
        frequency: [150, 40],
        duration: 0.1,
        gain: 0.6
      }
    ]
  }
}

/**
 * 游戏状态音效
 */
export const GAME_SOUNDS: Record<string, SoundConfig> = {
  powerup: {
    layers: [{
      type: 'sequence',
      waveform: 'sine',
      notes: [
        { freq: 523.25, dur: 0.1 },
        { freq: 659.25, dur: 0.1 },
        { freq: 783.99, dur: 0.1 },
        { freq: 1046.50, dur: 0.2 }
      ],
      gain: 0.3
    }]
  },
  levelup: {
    layers: [{
      type: 'sequence',
      waveform: 'square',
      notes: [
        { freq: 523.25, dur: 0.12 },
        { freq: 659.25, dur: 0.12 },
        { freq: 783.99, dur: 0.12 }
      ],
      gain: 0.3
    }]
  },
  victory: {
    layers: [{
      type: 'sequence',
      waveform: 'square',
      notes: [
        { freq: 261.63, dur: 0.15 },
        { freq: 329.63, dur: 0.15 },
        { freq: 392.00, dur: 0.15 },
        { freq: 523.25, dur: 0.4 }
      ],
      gain: 0.3
    }]
  },
  defeat: {
    layers: [{
      type: 'sequence',
      waveform: 'sawtooth',
      notes: [
        { freq: 300, dur: 0.2 },
        { freq: 250, dur: 0.2 },
        { freq: 200, dur: 0.2 },
        { freq: 150, dur: 0.4 }
      ],
      gain: 0.3
    }]
  },
  bossWarning: {
    layers: [
      {
        type: 'tone',
        waveform: 'sawtooth',
        frequency: [300, 900],
        duration: 0.6,
        gain: 0.3
      },
      {
        type: 'tone',
        waveform: 'sine',
        frequency: [80, 40],
        duration: 0.8,
        gain: 0.6
      }
    ]
  }
}

/**
 * 完整的音效配置对象（向后兼容）
 */
export const AUDIO_CONFIG = {
  ui: UI_SOUNDS,
  weapon: WEAPON_SOUNDS,
  explosion: EXPLOSION_SOUNDS,
  hit: HIT_SOUNDS,
  game: GAME_SOUNDS
} as const

export type AudioConfig = typeof AUDIO_CONFIG
