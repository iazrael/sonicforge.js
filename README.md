<p align="center">
  <img src="/public/logo.svg" alt="SonicForge Logo" width="200" height="200" />
</p>

<h1 align="center">SonicForge v2</h1>

<p align="center">为网页游戏打造的程序化音频合成引擎</p>

<p align="center">
  <a href="./test"><img src="https://img.shields.io/badge/tests-78%20passing-brightgreen" alt="tests"></a>
  <a href="./coverage"><img src="https://img.shields.io/badge/coverage-100%25%20statements-brightgreen" alt="coverage"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.2-blue" alt="typescript"></a>
</p>

SonicForge v2 是一个轻量级的 Web Audio API 封装库，专为网页游戏设计。**无需任何音频文件** — 所有音效均通过代码实时合成生成。

## ✨ 特性

- **零音频资源** — 所有音效通过代码实时合成，大幅减小项目体积
- **分层合成** — 支持组合多种音源（纯音 + 噪音 + 音序）创建复杂音效
- **空间音频** — 内置立体声声像控制，支持 -1（左）到 1（右）的声像定位
- **动态包络** — ADSR 风格的包络控制，有效消除爆音
- **预设丰富** — 内置 UI、武器、爆炸、受击、游戏状态等音效预设
- **TypeScript 原生支持** — 完整类型定义，开发体验友好
- **测试覆盖完善** — 100% 语句/函数覆盖率

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 运行开发服务器

```bash
npm run dev
```

访问 http://localhost:5173 即可体验内置的音效演示。

### 运行测试

```bash
# 监听模式
npm test

# 单次运行
npm run test:run

# 覆盖率报告
npm run test:coverage
```

## 📖 使用指南

### 基础用法

```typescript
import { AudioEngine } from '@/audio'

// 1. 初始化引擎（需在用户交互后调用）
await AudioEngine.init()

// 2. 播放预设音效
await AudioEngine.play('ui.click')
await AudioEngine.play('weapon.laser');
await AudioEngine.play('explosion.large', { pan: -0.5 }); // 左侧爆炸

// 3. 控制音量
AudioEngine.setVolume(0.5);
const currentVolume = AudioEngine.getVolume();
```

### 自定义音效

```typescript
import type { SoundConfig } from '@/audio'

const customSound: SoundConfig = {
  layers: [
    {
      type: 'tone',
      waveform: 'square',
      frequency: [440, 880],  // 频率扫频：440Hz → 880Hz
      duration: 0.2,
      gain: 0.3
    },
    {
      type: 'noise',
      duration: 0.3,
      gain: 0.2,
      filterFreq: [1000, 100],  // 滤波器频率扫频
      q: 5
    }
  ]
}

await AudioEngine.play(customSound);
```

### 音效层类型

| 类型 | 描述 | 适用场景 |
|------|------|----------|
| `tone` | 纯音振荡器，支持频率扫频 | 武器射击、UI 点击 |
| `noise` | 带通滤波的噪音 | 爆炸、撞击、爆炸 |
| `sequence` | 音符序列 | 旋律、提示音、胜利音效 |

### 支持的波形

- `sine` — 正弦波，柔和纯净
- `square` — 方波，8-bit 复古风格
- `sawtooth` — 锯齿波，尖锐有力
- `triangle` — 三角波，介于正弦与方波之间

## 📁 项目结构

```
src/
├── audio/
│   ├── AudioEngine.ts    # 核心引擎实现
│   ├── types.ts          # TypeScript 类型定义
│   └── index.ts          # 模块导出
├── audio-presets.ts      # 内置音效预设库
└── main.ts               # 入口点 / 演示代码
```

## 🎮 内置音效预设

### UI 音效 (`ui.*`)
- `click` — 通用点击
- `confirm` — 确认操作
- `cancel` — 取消操作

### 武器音效 (`weapon.*`)
- `vulcan` — 转管机枪
- `laser` — 激光武器
- `missile` — 导弹发射
- `wave` — 波束武器
- `plasma` — 等离子体
- `tesla` — 特斯拉线圈
- `magma` — 熔岩武器
- `shuriken` — 手里剑

### 爆炸音效 (`explosion.*`)
- `small` — 小型爆炸
- `large` — 大型爆炸

### 受击音效 (`hit.*`)
- `shield` — 护盾受击
- `hull` — 船体受击

### 游戏状态音效 (`game.*`)
- `powerup` — 道具拾取
- `levelup` — 升级
- `victory` — 胜利
- `defeat` — 失败
- `bossWarning` — Boss 警告

## 🔧 技术架构

### 音频处理流程

```
AudioContext
    │
    ├─→ MasterGain (0.8 默认音量)
    ├─→ DynamicsCompressor (防止削波)
    ├─→ Analyser (可视化支持)
    └─→ StereoPanner (空间定位)
            │
            └─→ 每层音效:
                ├─→ Tone (振荡器 + 频率扫频 + 包络)
                ├─→ Noise (滤波噪音缓冲)
                └─→ Sequence (音符序列播放)
```

### 关键设计模式

1. **分层组合** — 每个音效可包含多层不同类型的声音
2. **快速起音** — 10ms 起音时间防止爆音/咔嗒声
3. **频率保护** — 所有频率使用 `Math.max(1, freq)` 防止 Web Audio API 异常
4. **异步恢复** — 自动处理浏览器自动播放策略限制

## 🛠️ 常用命令

```bash
# 开发
npm run dev              # 启动 Vite 开发服务器

# 测试
npm test                 # 测试监听模式
npm run test:run         # 单次运行测试
npm run test:coverage    # 生成覆盖率报告

# 构建
npm run build            # TypeScript 编译 + Vite 打包
npm run lint             # ESLint 代码检查
```

## 📝 许可

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**SonicForge v2** — 让游戏音效开发更简单 🎵
