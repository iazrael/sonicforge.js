# SonicForge - 游戏音效引擎技术实施文档

## 目录
1. [项目概述](#1-项目概述)
2. [架构设计](#2-架构设计)
3. [核心模块实现](#3-核心模块实现)
4. [音效配置规范](#4-音效配置规范)
5. [开发工具链](#5-开发工具链)
6. [性能优化](#6-性能优化)
7. [集成指南](#7-集成指南)
8. [附录](#8-附录)

---

## 1. 项目概述

### 1.1 项目背景
SonicForge 是一个基于 Web Audio API 的纯代码音效合成引擎，专为竖版太空射击游戏设计。无需外部音频文件，所有音效通过算法实时生成，显著降低游戏包体积。

### 1.2 核心特性
- **零依赖**: 纯原生 Web Audio API 实现
- **JSON 驱动**: 所有音效参数可配置化
- **实时合成**: 支持波形、噪声、序列三种合成模式
- **空间音频**: 支持立体声定位
- **可视化调试**: 内置音效实验室工具

### 1.3 技术栈
- **核心**: Web Audio API
- **语言**: TypeScript / JavaScript
- **构建**: Vite

---

## 2. 架构设计

### 2.1 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        游戏逻辑层                            │
│                   (调用 engine.play())                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                      AudioEngine                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  SimpleTone │  │   NoiseGen  │  │   SequencePlayer    │  │
│  │   (单音)     │  │  (噪声生成)  │  │     (序列播放)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    AudioContext                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  MasterGain │  │  Analyser   │  │ DynamicsCompressor  │  │
│  │  (主音量)    │  │  (频谱分析)  │  │      (压限器)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 模块职责

| 模块 | 职责 | 关键类/函数 |
|------|------|------------|
| 核心引擎 | 音频上下文管理、路由调度 | `AudioEngine` |
| 合成器 | 波形生成与处理 | `OscillatorNode`, `BiquadFilterNode` |
| 配置系统 | 音效参数定义与解析 | `AUDIO_CONFIG` |
| 调试工具 | 实时参数调整与预览 | `SynthLab` |

---

## 3. 核心模块实现

### 3.1 基础引擎 (AudioEngine.ts)

```typescript
/**
 * SonicForge - 核心音频引擎
 * 基于 Web Audio API 的音效合成器
 */

interface ToneConfig {
  type: 'tone';
  waveform: OscillatorType;
  frequency: [number, number]; // [起始频率, 结束频率]
  duration: number;
  gain: number;
}

interface NoiseConfig {
  type: 'noise';
  duration: number;
  gain: number;
  filterFreq: [number, number]; // [起始截止频率, 结束截止频率]
  q?: number; // 滤波器 Q 值 (0-20)
}

interface SequenceConfig {
  type: 'sequence';
  waveform: OscillatorType;
  gain: number;
  notes: Array<{ freq: number; dur: number }>;
}

type LayerConfig = ToneConfig | NoiseConfig | SequenceConfig;

interface SoundConfig {
  layers: LayerConfig[];
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  /**
   * 初始化音频引擎
   * 必须在用户交互后调用（浏览器安全策略）
   */
  init(): void {
    if (this.ctx) return;

    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    // 主增益节点
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;

    // 频谱分析器（用于可视化）
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128;

    // 压限器 - 防止多音效叠加导致的削波失真
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    // 音频路由
    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // 预生成噪声缓存
    this.noiseBuffer = this.createNoiseBuffer();
  }

  /**
   * 创建白噪声缓冲区
   */
  private createNoiseBuffer(): AudioBuffer {
    const buffer = this.ctx!.createBuffer(
      1,
      this.ctx!.sampleRate * 2,
      this.ctx!.sampleRate
    );
    const output = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * 播放音效
   * @param config 音效配置对象
   * @param pan 立体声位置 (-1 左 ~ 1 右)
   */
  play(config: SoundConfig, pan: number = 0): void {
    if (!this.ctx) this.init();
    if (this.ctx!.state === 'suspended') this.ctx!.resume();

    const startTime = this.ctx!.currentTime;
    const layers = config.layers || [config as any];

    // 创建声像定位节点
    const panner = this.ctx!.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(this.masterGain!);

    layers.forEach((layer) => {
      switch (layer.type) {
        case 'tone':
          this.playTone(layer, startTime, panner);
          break;
        case 'noise':
          this.playNoise(layer, startTime, panner);
          break;
        case 'sequence':
          this.playSequence(layer, startTime, panner);
          break;
      }
    });
  }

  /**
   * 播放单音（扫频）
   */
  private playTone(
    config: ToneConfig,
    startTime: number,
    destination: AudioNode
  ): void {
    const { waveform, frequency, duration, gain } = config;

    const osc = this.ctx!.createOscillator();
    const gainNode = this.ctx!.createGain();

    osc.type = waveform;

    // 频率包络：从起始频率扫到结束频率
    osc.frequency.setValueAtTime(frequency[0], startTime);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(1, frequency[1]),
      startTime + duration
    );

    // 增益包络：ADSR 简化版（快速启动，指数衰减）
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      startTime + duration
    );

    osc.connect(gainNode);
    gainNode.connect(destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
  }

  /**
   * 播放噪声（用于爆炸、冲击效果）
   */
  private playNoise(
    config: NoiseConfig,
    startTime: number,
    destination: AudioNode
  ): void {
    const { duration, gain, filterFreq, q = 1 } = config;

    const source = this.ctx!.createBufferSource();
    source.buffer = this.noiseBuffer;

    // 低通滤波器：塑造噪声质感
    const filter = this.ctx!.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = q;

    // 滤波器频率扫频：从高频快速降到低频（模拟爆炸衰减）
    filter.frequency.setValueAtTime(filterFreq[0], startTime);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(1, filterFreq[1]),
      startTime + duration
    );

    // 增益包络
    const gainNode = this.ctx!.createGain();
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      startTime + duration
    );

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(destination);

    source.start(startTime);
    source.stop(startTime + duration + 0.1);
  }

  /**
   * 播放序列（旋律/琶音）
   */
  private playSequence(
    config: SequenceConfig,
    startTime: number,
    destination: AudioNode
  ): void {
    const { waveform, gain, notes } = config;
    let timeOffset = 0;

    notes.forEach((note) => {
      const osc = this.ctx!.createOscillator();
      const gainNode = this.ctx!.createGain();

      osc.type = waveform;
      osc.frequency.setValueAtTime(note.freq, startTime + timeOffset);

      gainNode.gain.setValueAtTime(gain, startTime + timeOffset);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        startTime + timeOffset + note.dur
      );

      osc.connect(gainNode);
      gainNode.connect(destination);

      osc.start(startTime + timeOffset);
      osc.stop(startTime + timeOffset + note.dur);

      timeOffset += note.dur;
    });
  }

  /**
   * 获取频谱分析数据（用于可视化）
   */
  getFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }
}
```

### 3.2 音效配置文件 (audio-config.ts)

```typescript
/**
 * 音效配置字典
 * 所有游戏音效在此定义，便于统一管理和调优
 */

export const AUDIO_CONFIG = {
  // ==================== UI 交互音效 ====================
  ui: {
    click: {
      layers: [{
        type: 'tone' as const,
        waveform: 'sine',
        frequency: [800, 1200],
        duration: 0.1,
        gain: 0.3
      }]
    },
    confirm: {
      layers: [{
        type: 'tone' as const,
        waveform: 'sine',
        frequency: [800, 1600],
        duration: 0.15,
        gain: 0.3
      }]
    },
    cancel: {
      layers: [{
        type: 'tone' as const,
        waveform: 'triangle',
        frequency: [600, 300],
        duration: 0.2,
        gain: 0.3
      }]
    }
  },

  // ==================== 武器发射音效 ====================
  weapon: {
    // 火神炮 - 快速、尖锐
    vulcan: {
      layers: [{
        type: 'tone' as const,
        waveform: 'square',
        frequency: [400, 150],
        duration: 0.1,
        gain: 0.3
      }]
    },
    // 激光 - 持续、高频
    laser: {
      layers: [{
        type: 'tone' as const,
        waveform: 'sawtooth',
        frequency: [800, 1200],
        duration: 0.2,
        gain: 0.2
      }]
    },
    // 导弹 - 低频、长音
    missile: {
      layers: [{
        type: 'tone' as const,
        waveform: 'triangle',
        frequency: [150, 50],
        duration: 0.4,
        gain: 0.5
      }]
    },
    // 波动炮 - 正弦波扫频
    wave: {
      layers: [{
        type: 'tone' as const,
        waveform: 'sine',
        frequency: [300, 800],
        duration: 0.3,
        gain: 0.4
      }]
    },
    // 等离子 - 厚重
    plasma: {
      layers: [{
        type: 'tone' as const,
        waveform: 'square',
        frequency: [100, 50],
        duration: 0.3,
        gain: 0.4
      }]
    },
    // 特斯拉 - 电击序列
    tesla: {
      layers: [{
        type: 'sequence' as const,
        waveform: 'square',
        notes: [
          { freq: 1500, dur: 0.05 },
          { freq: 2000, dur: 0.05 },
          { freq: 1500, dur: 0.05 }
        ],
        gain: 0.2
      }]
    },
    // 熔岩炮 - 锯齿波低频
    magma: {
      layers: [{
        type: 'tone' as const,
        waveform: 'sawtooth',
        frequency: [200, 80],
        duration: 0.4,
        gain: 0.4
      }]
    },
    // 手里剑 - 快速三角波
    shuriken: {
      layers: [{
        type: 'tone' as const,
        waveform: 'triangle',
        frequency: [1000, 600],
        duration: 0.15,
        gain: 0.3
      }]
    }
  },

  // ==================== 爆炸与受击音效 ====================
  explosion: {
    // 小型爆炸
    small: {
      layers: [
        {
          type: 'tone' as const,
          waveform: 'sine',
          frequency: [150, 40],
          duration: 0.2,
          gain: 0.6
        },
        {
          type: 'noise' as const,
          duration: 0.3,
          gain: 0.4,
          filterFreq: [800, 50],
          q: 5
        }
      ]
    },
    // 大型爆炸 - 三层复合
    large: {
      layers: [
        // 核心冲击
        {
          type: 'tone' as const,
          waveform: 'sine',
          frequency: [120, 30],
          duration: 0.3,
          gain: 0.8
        },
        // 爆炸主体（噪声）
        {
          type: 'noise' as const,
          duration: 0.8,
          gain: 0.5,
          filterFreq: [600, 20],
          q: 8
        },
        // 机械碎片（锯齿波）
        {
          type: 'tone' as const,
          waveform: 'sawtooth',
          frequency: [100, 10],
          duration: 0.5,
          gain: 0.3
        }
      ]
    }
  },

  // ==================== 受击音效 ====================
  hit: {
    // 护盾受击 - 高频能量感
    shield: {
      layers: [{
        type: 'tone' as const,
        waveform: 'sine',
        frequency: [1200, 2400],
        duration: 0.05,
        gain: 0.3
      }]
    },
    // 船体受击 - 金属撞击
    hull: {
      layers: [
        {
          type: 'noise' as const,
          duration: 0.1,
          gain: 0.5,
          filterFreq: [400, 50],
          q: 3
        },
        {
          type: 'tone' as const,
          waveform: 'triangle',
          frequency: [150, 40],
          duration: 0.1,
          gain: 0.6
        }
      ]
    }
  },

  // ==================== 游戏状态音效 ====================
  game: {
    // 获得道具 - 上行琶音
    powerup: {
      layers: [{
        type: 'sequence' as const,
        waveform: 'sine',
        notes: [
          { freq: 523.25, dur: 0.1 }, // C5
          { freq: 659.25, dur: 0.1 }, // E5
          { freq: 783.99, dur: 0.1 }, // G5
          { freq: 1046.50, dur: 0.2 } // C6
        ],
        gain: 0.3
      }]
    },
    // 升级 - 短促上行
    levelup: {
      layers: [{
        type: 'sequence' as const,
        waveform: 'square',
        notes: [
          { freq: 523.25, dur: 0.12 },
          { freq: 659.25, dur: 0.12 },
          { freq: 783.99, dur: 0.12 }
        ],
        gain: 0.3
      }]
    },
    // 胜利 - 完整和弦
    victory: {
      layers: [{
        type: 'sequence' as const,
        waveform: 'square',
        notes: [
          { freq: 261.63, dur: 0.15 }, // C4
          { freq: 329.63, dur: 0.15 }, // E4
          { freq: 392.00, dur: 0.15 }, // G4
          { freq: 523.25, dur: 0.4 }   // C5
        ],
        gain: 0.3
      }]
    },
    // 失败 - 下行
    defeat: {
      layers: [{
        type: 'sequence' as const,
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
    // Boss 警告 - 低频压迫感
    bossWarning: {
      layers: [
        {
          type: 'tone' as const,
          waveform: 'sawtooth',
          frequency: [300, 900],
          duration: 0.6,
          gain: 0.3
        },
        {
          type: 'tone' as const,
          waveform: 'sine',
          frequency: [80, 40],
          duration: 0.8,
          gain: 0.6
        }
      ]
    }
  }
} as const;

// 类型导出
export type AudioConfig = typeof AUDIO_CONFIG;
```

---

## 4. 音效配置规范

### 4.1 配置结构说明

每个音效配置遵循以下结构：

```typescript
{
  layers: [
    {
      type: 'tone' | 'noise' | 'sequence',
      // tone/sequence 特有
      waveform: 'sine' | 'square' | 'sawtooth' | 'triangle',
      // tone 特有
      frequency: [startFreq, endFreq],
      // sequence 特有
      notes: [{ freq: number, dur: number }],
      // noise 特有
      filterFreq: [startFreq, endFreq],
      q: number, // 滤波器共振 (0-20)
      // 通用
      duration: number, // 秒
      gain: number // 0.0 - 1.0
    }
  ]
}
```

### 4.2 波形选择指南

| 波形 | 特点 | 适用场景 |
|------|------|----------|
| `sine` | 纯净、圆润 | 护盾、能量、UI |
| `square` | 8-bit 感、明亮 | 激光、经典射击 |
| `sawtooth` | 锋利、饱满 | 爆炸、冲击、警报 |
| `triangle` | 柔和、厚实 | 引擎、低频武器 |

### 4.3 频率设计参考

| 频率范围 | 听感 | 应用场景 |
|----------|------|----------|
| 20-60 Hz | 超低频震动 | BOSS 登场、重型爆炸 |
| 60-200 Hz | 低频冲击 | 爆炸主体、船体受击 |
| 200-500 Hz | 中低频 | 导弹、引擎轰鸣 |
| 500-2000 Hz | 中频 | 大多数武器、UI |
| 2000+ Hz | 高频 | 护盾、激光、警报 |

---

## 5. 开发工具链

### 5.1 音效实验室 (SynthLab)

提供一个完整的 HTML 调试工具，支持实时参数调整和预设管理。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>SonicForge Lab - 音效实验室</title>
  <style>
    :root {
      --bg: #0d1117;
      --card: #161b22;
      --accent: #58a6ff;
      --text: #c9d1d9;
      --border: #30363d;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      display: flex;
      height: 100vh;
    }
    #editor {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      border-right: 1px solid var(--border);
    }
    #preview {
      width: 400px;
      padding: 20px;
      background: #010409;
      display: flex;
      flex-direction: column;
    }
    .layer-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 15px;
    }
    .layer-card h4 {
      margin: 0 0 10px 0;
      color: var(--accent);
      display: flex;
      justify-content: space-between;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .field { margin-bottom: 8px; }
    label {
      display: block;
      font-size: 12px;
      margin-bottom: 4px;
      color: #8b949e;
    }
    input, select {
      width: 100%;
      background: var(--bg);
      border: 1px solid var(--border);
      color: white;
      padding: 6px;
      border-radius: 4px;
    }
    button {
      background: #238636;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      margin-right: 8px;
    }
    button.secondary {
      background: #21262d;
      border: 1px solid var(--border);
      color: var(--text);
    }
    button:hover { opacity: 0.8; }
    .remove-btn {
      color: #f85149;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
    }
    pre {
      background: var(--card);
      padding: 10px;
      border-radius: 6px;
      font-size: 12px;
      flex: 1;
      overflow: auto;
      border: 1px solid var(--border);
    }
    canvas {
      background: #000;
      width: 100%;
      height: 100px;
      border-radius: 4px;
      margin-bottom: 10px;
    }
    .preset-manager {
      margin-top: 20px;
      padding: 15px;
      background: #21262d;
      border-radius: 6px;
      border: 1px solid var(--border);
    }
    .preset-tag {
      background: var(--border);
      color: var(--accent);
      padding: 5px 12px;
      border-radius: 15px;
      font-size: 13px;
      cursor: pointer;
      border: 1px solid #444;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin: 4px;
    }
    .preset-tag:hover { background: #444; }
    .note-row {
      display: flex;
      gap: 5px;
      margin-bottom: 5px;
      align-items: center;
    }
    .note-row input { flex: 1; }
  </style>
</head>
<body>
  <div id="editor">
    <h2>🚀 SonicForge Lab</h2>
    <div style="margin-bottom: 20px;">
      <button onclick="playCurrent()">🔊 播放测试</button>
      <button class="secondary" onclick="addLayer('tone')">+ 波形层</button>
      <button class="secondary" onclick="addLayer('noise')">+ 噪声层</button>
      <button class="secondary" onclick="addLayer('sequence')">+ 序列层</button>
    </div>
    <div id="layers-container"></div>

    <div class="preset-manager">
      <h3 style="margin-top:0">📁 预设库</h3>
      <div style="display: flex; gap: 10px; margin-bottom: 10px;">
        <input type="text" id="preset-name" placeholder="预设名称" style="flex: 1;">
        <button onclick="savePreset()">保存</button>
      </div>
      <div id="preset-list"></div>
      <button class="secondary" onclick="exportLibrary()" style="margin-top:10px">📥 导出全部</button>
    </div>
  </div>

  <div id="preview">
    <canvas id="visualizer"></canvas>
    <h3>配置 JSON</h3>
    <pre id="json-display"></pre>
    <button class="secondary" onclick="copyJSON()">📋 复制配置</button>
  </div>

<script>
// ==================== 核心引擎 ====================
class AudioEngine {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.noiseBuffer = this.createNoiseBuffer();
  }

  createNoiseBuffer() {
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  play(config) {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = this.ctx.currentTime;
    const layers = config.layers || [config];

    layers.forEach(layer => {
      if (layer.type === 'sequence') this.playSequence(layer, now);
      else if (layer.type === 'noise') this.playNoise(layer, now);
      else this.playTone(layer, now);
    });
  }

  playTone(cfg, startTime) {
    const { waveform = 'sine', frequency = [440, 440], duration = 0.5, gain = 0.5 } = cfg;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = waveform;
    osc.frequency.setValueAtTime(frequency[0], startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, frequency[1]), startTime + duration);
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(gain, startTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(g); g.connect(this.masterGain);
    osc.start(startTime); osc.stop(startTime + duration);
  }

  playNoise(cfg, startTime) {
    const { duration = 0.5, gain = 0.5, filterFreq = [1000, 100], q = 1 } = cfg;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = q;
    f.frequency.setValueAtTime(filterFreq[0], startTime);
    f.frequency.exponentialRampToValueAtTime(Math.max(1, filterFreq[1]), startTime + duration);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(gain, startTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    src.connect(f); f.connect(g); g.connect(this.masterGain);
    src.start(startTime); src.stop(startTime + duration + 0.1);
  }

  playSequence(cfg, startTime) {
    let offset = 0;
    cfg.notes.forEach(note => {
      this.playTone({
        waveform: cfg.waveform,
        frequency: [note.freq, note.freq],
        duration: note.dur,
        gain: cfg.gain || 0.3
      }, startTime + offset);
      offset += note.dur;
    });
  }

  getFrequencyData() {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }
}

// ==================== UI 逻辑 ====================
const engine = new AudioEngine();
let currentConfig = { layers: [] };
let presetLibrary = {};

// 初始化
addLayer('tone');
loadLibrary();

function addLayer(type) {
  let layer;
  if (type === 'sequence') {
    layer = {
      type: 'sequence',
      waveform: 'square',
      gain: 0.3,
      notes: [
        { freq: 523.25, dur: 0.1 },
        { freq: 659.25, dur: 0.1 },
        { freq: 783.99, dur: 0.2 }
      ]
    };
  } else if (type === 'noise') {
    layer = {
      type: 'noise',
      duration: 0.5,
      gain: 0.5,
      filterFreq: [800, 100],
      q: 5
    };
  } else {
    layer = {
      type: 'tone',
      waveform: 'sine',
      frequency: [440, 880],
      duration: 0.3,
      gain: 0.5
    };
  }
  currentConfig.layers.push(layer);
  renderLayers();
}

function removeLayer(index) {
  currentConfig.layers.splice(index, 1);
  renderLayers();
}

function updateValue(layerIndex, key, subKey, val) {
  const layer = currentConfig.layers[layerIndex];
  const value = (key === 'waveform' || key === 'type') ? val : parseFloat(val);
  if (subKey !== null) layer[key][subKey] = value;
  else layer[key] = value;
  updateJSON();
}

function addNote(layerIndex) {
  currentConfig.layers[layerIndex].notes.push({ freq: 440, dur: 0.1 });
  renderLayers();
}

function removeNote(layerIndex, noteIndex) {
  currentConfig.layers[layerIndex].notes.splice(noteIndex, 1);
  renderLayers();
}

function updateNote(layerIndex, noteIndex, field, val) {
  currentConfig.layers[layerIndex].notes[noteIndex][field] = parseFloat(val);
  updateJSON();
}

function renderLayers() {
  const container = document.getElementById('layers-container');
  container.innerHTML = '';

  currentConfig.layers.forEach((layer, i) => {
    const card = document.createElement('div');
    card.className = 'layer-card';

    let controls = '';
    if (layer.type === 'sequence') {
      const notesHTML = layer.notes.map((n, ni) => `
        <div class="note-row">
          <input type="number" placeholder="Hz" value="${n.freq}" oninput="updateNote(${i}, ${ni}, 'freq', this.value)">
          <input type="number" step="0.05" placeholder="Sec" value="${n.dur}" oninput="updateNote(${i}, ${ni}, 'dur', this.value)">
          <button class="remove-btn" onclick="removeNote(${i}, ${ni})">✕</button>
        </div>
      `).join('');
      controls = `
        <div class="field"><label>Waveform</label>
          <select onchange="updateValue(${i}, 'waveform', null, this.value)">
            <option value="square" ${layer.waveform==='square'?'selected':''}>Square</option>
            <option value="sine" ${layer.waveform==='sine'?'selected':''}>Sine</option>
            <option value="triangle" ${layer.waveform==='triangle'?'selected':''}>Triangle</option>
          </select>
        </div>
        <label>Notes</label>
        <div>${notesHTML}</div>
        <button class="secondary" style="margin-top:8px" onclick="addNote(${i})">+ 添加音符</button>
      `;
    } else if (layer.type === 'tone') {
      controls = `
        <div class="grid">
          <div class="field"><label>Waveform</label>
            <select onchange="updateValue(${i}, 'waveform', null, this.value)">
              <option value="sine" ${layer.waveform==='sine'?'selected':''}>Sine</option>
              <option value="square" ${layer.waveform==='square'?'selected':''}>Square</option>
              <option value="sawtooth" ${layer.waveform==='sawtooth'?'selected':''}>Sawtooth</option>
              <option value="triangle" ${layer.waveform==='triangle'?'selected':''}>Triangle</option>
            </select>
          </div>
          <div class="field"><label>Duration (s)</label><input type="number" step="0.1" value="${layer.duration}" oninput="updateValue(${i}, 'duration', null, this.value)"></div>
          <div class="field"><label>Start Freq</label><input type="number" value="${layer.frequency[0]}" oninput="updateValue(${i}, 'frequency', 0, this.value)"></div>
          <div class="field"><label>End Freq</label><input type="number" value="${layer.frequency[1]}" oninput="updateValue(${i}, 'frequency', 1, this.value)"></div>
          <div class="field"><label>Gain</label><input type="number" step="0.1" value="${layer.gain}" oninput="updateValue(${i}, 'gain', null, this.value)"></div>
        </div>`;
    } else {
      controls = `
        <div class="grid">
          <div class="field"><label>Duration (s)</label><input type="number" step="0.1" value="${layer.duration}" oninput="updateValue(${i}, 'duration', null, this.value)"></div>
          <div class="field"><label>Gain</label><input type="number" step="0.1" value="${layer.gain}" oninput="updateValue(${i}, 'gain', null, this.value)"></div>
          <div class="field"><label>Filter Start</label><input type="number" value="${layer.filterFreq[0]}" oninput="updateValue(${i}, 'filterFreq', 0, this.value)"></div>
          <div class="field"><label>Filter End</label><input type="number" value="${layer.filterFreq[1]}" oninput="updateValue(${i}, 'filterFreq', 1, this.value)"></div>
          <div class="field"><label>Q (0-20)</label><input type="number" step="1" value="${layer.q || 1}" oninput="updateValue(${i}, 'q', null, this.value)"></div>
        </div>`;
    }

    card.innerHTML = `<h4>Layer ${i+1} (${layer.type.toUpperCase()}) <button class="remove-btn" onclick="removeLayer(${i})">✕</button></h4>${controls}`;
    container.appendChild(card);
  });

  updateJSON();
}

function updateJSON() {
  const json = JSON.stringify(currentConfig, null, 2);
  document.getElementById('json-display').innerText = json;
  localStorage.setItem('synth_lab_config', json);
}

function playCurrent() {
  engine.play(currentConfig);
}

function copyJSON() {
  navigator.clipboard.writeText(JSON.stringify(currentConfig, null, 2))
    .then(() => alert('配置已复制！'));
}

// ==================== 预设库 ====================
function loadLibrary() {
  const saved = localStorage.getItem('synth_sound_library');
  if (saved) presetLibrary = JSON.parse(saved);
  renderPresets();

  const lastSession = localStorage.getItem('synth_lab_config');
  if (lastSession) {
    currentConfig = JSON.parse(lastSession);
    renderLayers();
  }
}

function renderPresets() {
  const list = document.getElementById('preset-list');
  list.innerHTML = '';
  Object.keys(presetLibrary).forEach(name => {
    const tag = document.createElement('span');
    tag.className = 'preset-tag';
    tag.innerHTML = `<span onclick="loadPreset('${name}')">▶ ${name}</span><span style="color:#f85149" onclick="deletePreset(event, '${name}')">✕</span>`;
    list.appendChild(tag);
  });
}

function savePreset() {
  const name = document.getElementById('preset-name').value.trim();
  if (!name) return alert('请输入名称');
  presetLibrary[name] = JSON.parse(JSON.stringify(currentConfig));
  localStorage.setItem('synth_sound_library', JSON.stringify(presetLibrary));
  document.getElementById('preset-name').value = '';
  renderPresets();
}

function loadPreset(name) {
  currentConfig = JSON.parse(JSON.stringify(presetLibrary[name]));
  renderLayers();
  playCurrent();
}

function deletePreset(e, name) {
  e.stopPropagation();
  if (confirm(`删除 "${name}"?`)) {
    delete presetLibrary[name];
    localStorage.setItem('synth_sound_library', JSON.stringify(presetLibrary));
    renderPresets();
  }
}

function exportLibrary() {
  const data = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(presetLibrary, null, 2));
  const a = document.createElement('a');
  a.href = data;
  a.download = 'audio_presets.json';
  a.click();
}

// ==================== 可视化 ====================
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
function draw() {
  requestAnimationFrame(draw);
  const data = engine.getFrequencyData();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const barWidth = (canvas.width / data.length) * 2.5;
  let x = 0;
  data.forEach(v => {
    ctx.fillStyle = `rgb(88, 166, ${v + 100})`;
    ctx.fillRect(x, canvas.height - v/2, barWidth, v/2);
    x += barWidth + 1;
  });
}
draw();
</script>
</body>
</html>
```

---

## 6. 性能优化

### 6.1 优化策略

| 问题 | 解决方案 | 实现方式 |
|------|----------|----------|
| 多音效叠加失真 | 压限器 | `DynamicsCompressorNode` |
| AudioContext 延迟 | 预初始化 | 用户首次交互时立即初始化 |
| 噪声重复生成 | 缓冲区缓存 | 预生成 `noiseBuffer` |
| 爆音/咔哒声 | 增益包络 | 指数衰减而非线性切断 |

### 6.2 最佳实践

```typescript
// 1. 游戏启动时预初始化
window.addEventListener('click', () => engine.init(), { once: true });

// 2. 根据屏幕位置设置立体声
function playExplosion(x: number, screenWidth: number) {
  const pan = (x / screenWidth) * 2 - 1; // -1 ~ 1
  engine.play(AUDIO_CONFIG.explosion.small, pan);
}

// 3. 批量播放时添加微小随机偏移（避免机械感）
function playRapidFire() {
  const detune = (Math.random() - 0.5) * 20;
  // 修改频率后播放
}
```

---

## 7. 集成指南

### 7.1 快速开始

```typescript
import { AudioEngine } from './AudioEngine';
import { AUDIO_CONFIG } from './audio-config';

// 1. 创建引擎实例
const audio = new AudioEngine();

// 2. 游戏启动时初始化（必须在用户交互后）
document.addEventListener('click', () => {
  audio.init();
}, { once: true });

// 3. 在游戏中使用
function onPlayerShoot() {
  audio.play(AUDIO_CONFIG.weapon.vulcan);
}

function onEnemyExplode(x: number) {
  const pan = calculatePan(x); // 根据位置计算声像
  audio.play(AUDIO_CONFIG.explosion.large, pan);
}
```

### 7.2 目录结构建议

```
src/
├── audio/
│   ├── AudioEngine.ts      # 核心引擎
│   ├── audio-config.ts     # 音效配置
│   ├── index.ts            # 导出入口
│   └── lab.html            # 调试工具
├── game/
│   └── ...
└── main.ts
```

---

## 8. 附录

### 8.1 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2024-XX-XX | 初始版本，支持基础波形和噪声合成 |
| 1.1.0 | 2024-XX-XX | 增加序列播放器和音效实验室 |
| 1.2.0 | 2024-XX-XX | 优化爆炸音效，引入 Q 值控制 |

### 8.2 参考资源

- [Web Audio API MDN 文档](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [合成器设计原理](https://webaudio.github.io/web-audio-api/)
- [游戏音效设计指南](https://www.gamedev.net/)

### 8.3 常见问题

**Q: 为什么播放没有声音？**
A: 浏览器要求 AudioContext 必须在用户交互（点击、按键）后才能启动。确保调用 `init()` 是在用户交互之后。

**Q: 如何降低音效文件大小？**
A: 本引擎完全不需要音频文件！所有音效都是实时合成的，项目体积仅增加几 KB 的代码。

**Q: 可以在移动设备上使用吗？**
A: 可以，Web Audio API 在 iOS Safari 和 Android Chrome 上都有良好支持。

---

*文档版本: 1.2.0*
*最后更新: 2024-XX-XX*
