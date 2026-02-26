/**
 * SonicForge - Audio Engine Types
 * Core type definitions for the audio synthesis engine
 */

/**
 * 单音配置（扫频）
 */
export interface ToneConfig {
  type: 'tone'
  waveform: OscillatorType
  frequency: [number, number] // [起始频率, 结束频率]
  duration: number
  gain: number
}

/**
 * 噪声配置
 */
export interface NoiseConfig {
  type: 'noise'
  duration: number
  gain: number
  filterFreq: [number, number] // [起始截止频率, 结束截止频率]
  q?: number // 滤波器 Q 值 (0-20)
}

/**
 * 序列配置（旋律/琶音）
 */
export interface SequenceConfig {
  type: 'sequence'
  waveform: OscillatorType
  gain: number
  notes: Array<{ freq: number; dur: number }>
}

/**
 * 层配置联合类型
 */
export type LayerConfig = ToneConfig | NoiseConfig | SequenceConfig

/**
 * 音效配置
 */
export interface SoundConfig {
  layers: LayerConfig[]
}
