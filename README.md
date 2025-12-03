# 🎮 PAC-MAN TypeScript

A faithful recreation of the classic 1980 Namco arcade game, built with TypeScript, WebGL, and Test-Driven Development.

![Pac-Man](https://img.shields.io/badge/Game-Pac--Man-yellow)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![WebGL](https://img.shields.io/badge/Rendering-WebGL-green)
![Tests](https://img.shields.io/badge/Tests-190%20passing-brightgreen)

## ✨ Features

- **Authentic Gameplay**: Original 28×31 maze, ghost AI, and game mechanics
- **WebGL Rendering**: GPU-accelerated graphics with batched rendering
- **All 4 Ghost Personalities**:
  - 🔴 **Blinky** - Direct chase (the aggressor)
  - 🩷 **Pinky** - Ambush 4 tiles ahead (the interceptor)
  - 🩵 **Inky** - Erratic targeting (the wildcard)
  - 🟠 **Clyde** - Shy behavior (the scaredy-cat)
- **Synthesized Sound**: Web Audio API for authentic retro audio
- **Responsive Controls**: Cornering and input buffering
- **High Score Persistence**: Saved to localStorage

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 🎮 Controls

| Key | Action |
|-----|--------|
| Arrow Keys / WASD | Move Pac-Man |
| Space / Enter | Start Game |
| P / Escape | Pause |

## 🏗️ Architecture

```
src/
├── main.ts              # Entry point
├── Game.ts              # Main game controller
├── constants.ts         # Game constants
├── types.ts             # TypeScript interfaces
├── entities/
│   ├── Entity.ts        # Base entity class
│   ├── PacMan.ts        # Player character
│   ├── Ghost.ts         # Base ghost AI
│   ├── Blinky.ts        # Red ghost
│   ├── Pinky.ts         # Pink ghost
│   ├── Inky.ts          # Cyan ghost
│   └── Clyde.ts         # Orange ghost
├── systems/
│   ├── WebGLRenderer.ts # GPU rendering
│   ├── Input.ts         # Keyboard/touch
│   ├── Collision.ts     # Hit detection
│   └── Sound.ts         # Audio synthesis
└── utils/
    ├── MazeData.ts      # Maze layout
    └── Vector.ts        # 2D math
```

## 🧪 Test-Driven Development

This project was built using TDD. Every feature has corresponding tests:

```bash
# Run tests once
npm test -- --run

# Run tests in watch mode
npm test

# Run with coverage
npm run test:coverage
```

**190 tests** covering:
- Vector math operations
- Maze data and navigation
- Pac-Man movement and animation
- Ghost AI behaviors
- Collision detection
- Rendering system

## 📖 Documentation

- [`docs/SPECIFICATION.md`](docs/SPECIFICATION.md) - Technical specification
- [`docs/LESSONS_LEARNED.md`](docs/LESSONS_LEARNED.md) - Development insights
- [`docs/diary/`](docs/diary/) - Build diary with decision rationale

## 🎯 Game Mechanics

### Ghost Modes

Ghosts cycle through behavioral modes:

1. **Scatter** (7s) - Each ghost heads to their corner
2. **Chase** (20s) - Ghosts use their targeting AI
3. Repeat 4 times, then permanent Chase

### Power Pellets

- Ghosts turn blue and become edible
- Points multiply: 200 → 400 → 800 → 1600
- Duration decreases each level

### Scoring

| Item | Points |
|------|--------|
| Pellet | 10 |
| Power Pellet | 50 |
| Ghost (1st) | 200 |
| Ghost (2nd) | 400 |
| Ghost (3rd) | 800 |
| Ghost (4th) | 1600 |

Extra life awarded at 10,000 points.

## 🛠️ Tech Stack

- **Language**: TypeScript 5.3
- **Build Tool**: Vite 5.0
- **Testing**: Vitest
- **Rendering**: WebGL with custom shaders
- **Audio**: Web Audio API (synthesized)

## 📝 License

MIT

## 🙏 Credits

- Original Pac-Man © 1980 Namco
- This is a fan recreation for educational purposes

---

*Built with TDD, documented with care, powered by WebGL* 🕹️
