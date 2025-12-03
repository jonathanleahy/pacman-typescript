# PAC-MAN TypeScript - Technical Specification

## Why This Project Exists

The original Pac-Man, released by Namco in 1980, revolutionized gaming. It wasn't just a game about eating dots - it was a masterclass in game design: simple rules that created emergent complexity, characters with distinct personalities, and gameplay that rewarded skill and pattern recognition.

This project recreates that experience using modern web technologies. The goal isn't just to make "a maze game" - it's to faithfully capture what made the original special while leveraging TypeScript's type safety and WebGL's rendering performance.

## Technical Architecture Decisions

### Why TypeScript?

JavaScript is fine for small projects, but Pac-Man has a lot of moving parts: entity positions, game states, ghost AI modes, collision systems. Without type checking, it's easy to pass a `TilePosition` where a pixel `Position` is expected, or confuse `GhostMode.FRIGHTENED` with `GhostMode.SCATTER`.

TypeScript catches these bugs at compile time, not when the game crashes mid-playthrough. The IDE autocompletion also makes development faster - I can see exactly what properties a `Ghost` entity has without checking the source file.

### Why WebGL Instead of Canvas 2D?

The original version used Canvas 2D. It worked, but performance analysis revealed a problem:

**Canvas 2D per-frame work:**
- 244 pellet draws (244 draw calls)
- 4 ghost draws (4 draw calls)
- 1 Pac-Man draw (1 draw call)
- Maze walls (~200+ line segments)
- **Total: 400+ draw calls per frame at 60fps = 24,000 draw calls per second**

**WebGL with batching:**
- Accumulate all geometry into vertex buffers
- Send to GPU in one or two draw calls
- **Total: 2-3 draw calls per frame = 120-180 draw calls per second**

That's a 100x reduction in draw call overhead. The GPU handles the actual pixel pushing in parallel, which is what GPUs are designed for.

### Why Vite?

Three main reasons:

1. **Native ES Modules**: Vite serves files directly during development without bundling, making startup instant.

2. **Hot Module Replacement**: When I change a file, only that module is replaced. The game state persists - no need to restart from the title screen every time I tweak ghost AI.

3. **TypeScript Support**: Zero configuration needed. Vite handles the compilation transparently.

### Why Vitest?

Jest is the standard, but Vitest uses the same configuration as Vite. This means:
- Tests run in the same environment as the actual code
- No separate test configuration to maintain
- Faster test execution (shared compilation cache)

The Jest-compatible API means existing knowledge transfers directly.

## Game Specifications

### Display Dimensions

The original arcade ran at 224×288 pixels with 8×8 pixel tiles. Modern displays can handle much more, so we scale by 2x:

| Property | Original | This Version |
|----------|----------|--------------|
| Resolution | 224×288 | 448×576 |
| Tile size | 8×8 | 16×16 |
| Grid | 28×36 | 28×36 |
| Playable rows | 31 | 31 |

Why 31 playable rows when the grid is 36? The top and bottom rows are for score display and lives/fruit indicators - not part of the maze.

### The Maze Layout

The maze is stored as a 2D array where each number represents a tile type:

```
0 = Empty space (walkable, no pellet)
1 = Wall (not walkable)
2 = Pellet (walkable, has pellet)
3 = Power Pellet (walkable, has power pellet)
4 = Ghost House interior (ghosts only)
5 = Ghost House door (ghosts only, pink color)
6 = Tunnel (wraps horizontally, slows ghosts)
7 = Fruit spawn point (walkable, fruit appears here)
```

The maze is carefully designed. It's not random - every corner, every corridor was placed intentionally by the original designers to create interesting chase dynamics. We reproduce this layout exactly.

### Speed System

Movement in Pac-Man isn't just "pixels per frame" - speeds are percentages of a base speed, and they change based on context:

**Pac-Man:**
- Normal: 80% (~1.25 scaled pixels/frame)
- Eating pellets: Slightly slower (brief pause each pellet)
- Frightened mode active: 90% (faster because ghosts are slower)

**Ghosts:**
- Normal chase/scatter: 75%
- In tunnel: 40% (deliberately slowed)
- Frightened: 50% (makes them catchable)
- Eaten (returning to ghost house): 150% (zoom!)

These percentages change per level. By level 5, ghosts are noticeably faster than level 1.

### Ghost Personalities

This is what makes Pac-Man brilliant. Each ghost has a distinct behavior:

**Blinky (Red) - "Shadow"**
- Always chases Pac-Man directly
- Gets faster as pellets are eaten ("cruise elroy" mode)
- The aggressor - pressure from behind

**Pinky (Pink) - "Speedy"**
- Targets 4 tiles AHEAD of Pac-Man
- Tries to ambush, not chase
- The interceptor - cuts off escape routes

**Inky (Cyan) - "Bashful"**
- Complex targeting: draws a vector from Blinky to 2 tiles ahead of Pac-Man, then doubles it
- Unpredictable, moves erratically
- The wildcard - creates chaos

**Clyde (Orange) - "Pokey"**
- Chases when far from Pac-Man (>8 tiles)
- Retreats to corner when close
- The scaredy-cat - backs off when threatening

These behaviors combine to create "pincer movements" where Pac-Man gets trapped between ghosts approaching from different directions.

### Ghost Modes

Ghosts alternate between behavioral modes on a timer:

1. **Scatter**: Each ghost heads to their assigned corner (7 seconds)
2. **Chase**: Each ghost uses their targeting behavior (20 seconds)
3. **Repeat**: Scatter → Chase → Scatter → Chase...

After 4 cycles, ghosts stay in Chase permanently.

**Frightened Mode** (triggered by power pellet):
- Ghosts turn blue, reverse direction
- Move randomly at intersections
- Can be eaten for bonus points (200, 400, 800, 1600)
- Duration decreases each level (6s → 5s → 4s → ... → 0s by level 17)

**Eaten Mode** (after being eaten):
- Only eyes remain
- Rush back to ghost house at 150% speed
- Regenerate inside, then exit

### Scoring

```
Pellet:          10 points
Power Pellet:    50 points
Ghost eaten:     200 → 400 → 800 → 1600 (multiplies)
Cherry:          100 points
Strawberry:      300 points
Orange:          500 points
Apple:           700 points
Melon:           1,000 points
Galaxian:        2,000 points
Bell:            3,000 points
Key:             5,000 points
Extra life:      Awarded at 10,000 points
```

### The Cornering Mechanic

One of Pac-Man's secrets is "cornering" - the ability to turn slightly before reaching an intersection center. This gives skilled players tighter turns and faster navigation.

Implementation: When a direction change is requested, we check if Pac-Man is within a "cornering buffer" (4 pixels) of the turn point. If so, the turn executes and Pac-Man snaps to the correct axis.

## File Architecture

```
src/
├── main.ts                 # Entry point, game loop setup
├── Game.ts                 # Main game controller
├── constants.ts            # All magic numbers in one place
├── types.ts                # TypeScript interfaces
│
├── entities/
│   ├── Entity.ts           # Base class with shared movement logic
│   ├── PacMan.ts           # Player character
│   ├── Ghost.ts            # Base ghost with shared AI
│   ├── Blinky.ts           # Red ghost - direct chase
│   ├── Pinky.ts            # Pink ghost - ambush
│   ├── Inky.ts             # Cyan ghost - erratic
│   ├── Clyde.ts            # Orange ghost - shy
│   └── Fruit.ts            # Bonus fruit spawning
│
├── systems/
│   ├── WebGLRenderer.ts    # GPU-accelerated rendering
│   ├── Input.ts            # Keyboard and touch handling
│   ├── Collision.ts        # Entity-entity and entity-maze
│   ├── Sound.ts            # Web Audio API integration
│   └── StateManager.ts     # Game state finite state machine
│
└── utils/
    ├── MazeData.ts         # The maze layout and helpers
    └── Vector.ts           # 2D math utilities
```

## Test-Driven Development Approach

Every feature follows the Red-Green-Refactor cycle:

1. **Red**: Write a failing test that describes the desired behavior
2. **Green**: Write the minimum code to make the test pass
3. **Refactor**: Clean up the code while keeping tests green

Example for Pac-Man movement:

```typescript
// RED - Write the failing test
it('should move right when direction is RIGHT', () => {
  pacman.direction = Direction.RIGHT;
  const startX = pacman.position.x;
  pacman.update(16);
  expect(pacman.position.x).toBeGreaterThan(startX);
});

// GREEN - Make it pass
update(deltaTime: number): void {
  if (this.direction === Direction.RIGHT) {
    this.position.x += this.speed;
  }
}

// REFACTOR - Generalize
update(deltaTime: number): void {
  const vector = DIRECTION_VECTORS[this.direction];
  this.position.x += vector.x * this.speed;
  this.position.y += vector.y * this.speed;
}
```

## What Success Looks Like

When this project is complete:

1. **Authentic Gameplay**: A player who knows the original can use their muscle memory
2. **60 FPS Constant**: WebGL keeps rendering smooth on any modern device
3. **Full Sound**: The "wakka wakka" and ghost siren create atmosphere
4. **Responsive Controls**: Input buffering and cornering feel right
5. **100% Test Coverage**: Every behavior has a test proving it works

---

## Development Status

- [x] Project structure with hot reload
- [x] Canvas/WebGL rendering system
- [x] Maze layout (28×31 grid)
- [x] Pac-Man movement and animation
- [ ] Pellet eating system
- [ ] Ghost AI (all four personalities)
- [ ] Collision detection
- [ ] Scoring and lives
- [ ] Sound effects
- [ ] Game state management
- [ ] Level progression
- [ ] Polish and optimization
