/**
 * SonicForge - 核心音频引擎
 * 基于 Web Audio API 的音效合成器
 */

import type { ToneConfig, NoiseConfig, SequenceConfig, SoundConfig } from './types'

// Re-export types for convenience
export type { ToneConfig, NoiseConfig, SequenceConfig, SoundConfig }

/**
 * AudioEngine - 核心音频引擎类
 * 负责初始化音频上下文、播放音效、频谱分析
 */
export class AudioEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private compressor: DynamicsCompressorNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private masterVolume: number = 0.8
  private resumePromise: Promise<void> | null = null

  /**
   * 初始化音频引擎
   * 必须在用户交互后调用（浏览器安全策略）
   */
  init(): void {
    if (this.ctx) return

    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

    // 主增益节点
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = this.masterVolume

    // 频谱分析器（用于可视化）
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 128

    // 压限器 - 防止多音效叠加导致的削波失真
    this.compressor = this.ctx.createDynamicsCompressor()
    this.compressor.threshold.value = -24
    this.compressor.knee.value = 30
    this.compressor.ratio.value = 12
    this.compressor.attack.value = 0.003
    this.compressor.release.value = 0.25

    // 音频路由
    this.masterGain.connect(this.compressor)
    this.compressor.connect(this.analyser)
    this.analyser.connect(this.ctx.destination)

    // 预生成噪声缓存
    this.noiseBuffer = this.createNoiseBuffer()
  }

  /**
   * 创建白噪声缓冲区
   */
  private createNoiseBuffer(): AudioBuffer {
    const buffer = this.ctx!.createBuffer(
      1,
      this.ctx!.sampleRate * 2,
      this.ctx!.sampleRate
    )
    const output = buffer.getChannelData(0)
    for (let i = 0; i < buffer.length; i++) {
      output[i] = Math.random() * 2 - 1
    }
    return buffer
  }

  /**
   * 将 pan 值限制在 [-1, 1] 范围内
   */
  private clampPan(pan: number): number {
    return Math.max(-1, Math.min(1, pan))
  }

  /**
   * 播放音效
   * @param config 音效配置对象
   * @param pan 立体声位置 (-1 左 ~ 1 右)
   */
  async play(config: SoundConfig, pan: number = 0): Promise<void> {
    // 参数验证
    if (!config?.layers || config.layers.length === 0) {
      console.warn('[AudioEngine] Invalid config: no layers to play')
      return
    }

    // 验证并 clamp pan 值
    const clampedPan = this.clampPan(pan)
    if (pan !== clampedPan) {
      console.warn(`[AudioEngine] Pan value ${pan} out of range [-1, 1], clamped to ${clampedPan}`)
    }

    if (!this.ctx) this.init()

    // 确保 AudioContext 已恢复（修复异步问题）
    if (this.ctx!.state === 'suspended') {
      // 复用相同的 promise 避免多次调用
      if (!this.resumePromise) {
        this.resumePromise = this.ctx!.resume().finally(() => {
          this.resumePromise = null
        })
      }
      await this.resumePromise
    }

    const startTime = this.ctx!.currentTime
    const layers = config.layers

    // 创建声像定位节点
    const panner = this.ctx!.createStereoPanner()
    panner.pan.value = clampedPan
    panner.connect(this.masterGain!)

    layers.forEach((layer) => {
      switch (layer.type) {
        case 'tone':
          this.playTone(layer, startTime, panner)
          break
        case 'noise':
          this.playNoise(layer, startTime, panner)
          break
        case 'sequence':
          this.playSequence(layer, startTime, panner)
          break
      }
    })
  }

  /**
   * 播放单音（扫频）
   */
  private playTone(
    config: ToneConfig,
    startTime: number,
    destination: AudioNode
  ): void {
    const { waveform, frequency, duration, gain } = config

    const osc = this.ctx!.createOscillator()
    const gainNode = this.ctx!.createGain()

    osc.type = waveform

    // 频率包络：从起始频率扫到结束频率
    // 同时保护起始和结束频率，防止 exponentialRampToValueAtTime 异常
    const startFreq = Math.max(1, frequency[0])
    const endFreq = Math.max(1, frequency[1])
    osc.frequency.setValueAtTime(startFreq, startTime)
    osc.frequency.exponentialRampToValueAtTime(
      endFreq,
      startTime + duration
    )

    // 增益包络：ADSR 简化版（快速启动，指数衰减）
    gainNode.gain.setValueAtTime(0, startTime)
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      startTime + duration
    )

    osc.connect(gainNode)
    gainNode.connect(destination)

    osc.start(startTime)
    osc.stop(startTime + duration + 0.1)
  }

  /**
   * 播放噪声（用于爆炸、冲击效果）
   */
  private playNoise(
    config: NoiseConfig,
    startTime: number,
    destination: AudioNode
  ): void {
    const { duration, gain, filterFreq, q = 1 } = config

    const source = this.ctx!.createBufferSource()
    source.buffer = this.noiseBuffer

    // 低通滤波器：塑造噪声质感
    const filter = this.ctx!.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = q

    // 滤波器频率扫频：从高频快速降到低频（模拟爆炸衰减）
    // 同时保护起始和结束频率
    const startFilterFreq = Math.max(1, filterFreq[0])
    const endFilterFreq = Math.max(1, filterFreq[1])
    filter.frequency.setValueAtTime(startFilterFreq, startTime)
    filter.frequency.exponentialRampToValueAtTime(
      endFilterFreq,
      startTime + duration
    )

    // 增益包络
    const gainNode = this.ctx!.createGain()
    gainNode.gain.setValueAtTime(0, startTime)
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      startTime + duration
    )

    source.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(destination)

    source.start(startTime)
    source.stop(startTime + duration + 0.1)
  }

  /**
   * 播放序列（旋律/琶音）
   */
  private playSequence(
    config: SequenceConfig,
    startTime: number,
    destination: AudioNode
  ): void {
    const { waveform, gain, notes } = config
    let timeOffset = 0
    const attackTime = 0.005 // 5ms 攻击时间防止咔嗒声

    notes.forEach((note) => {
      const osc = this.ctx!.createOscillator()
      const gainNode = this.ctx!.createGain()

      osc.type = waveform
      osc.frequency.setValueAtTime(note.freq, startTime + timeOffset)

      // 增益包络：从 0 开始，快速攻击到目标增益，然后指数衰减
      // 这可以防止音符之间出现咔嗒声
      gainNode.gain.setValueAtTime(0, startTime + timeOffset)
      gainNode.gain.linearRampToValueAtTime(gain, startTime + timeOffset + attackTime)
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        startTime + timeOffset + note.dur
      )

      osc.connect(gainNode)
      gainNode.connect(destination)

      osc.start(startTime + timeOffset)
      osc.stop(startTime + timeOffset + note.dur + 0.1)

      timeOffset += note.dur
    })
  }

  /**
   * 获取频谱分析数据（用于可视化）
   */
  getFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0)
    const data = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(data)
    return data
  }

  /**
   * 设置主音量
   * @param volume 音量值 (0.0 - 1.0)
   */
  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume
    }
  }

  /**
   * 获取当前主音量
   * @returns 当前音量值 (0.0 - 1.0)
   */
  getVolume(): number {
    return this.masterVolume
  }
}