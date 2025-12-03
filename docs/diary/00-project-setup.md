# Build Diary - Entry 00: Project Setup

**Date**: Session Start
**Phase**: Project Initialization
**TDD Cycle**: N/A (Infrastructure)

---

## What I'm Building

A Pac-Man clone in TypeScript. Not "inspired by" or "similar to" - a faithful recreation of the 1980 arcade game. Same maze. Same ghost behaviors. Same sounds. Same feel.

Why? Because Pac-Man is a masterpiece of game design hidden behind apparent simplicity. Understanding why it works means implementing every detail correctly.

## The Development Environment Decision Tree

### Build Tool: Vite vs Webpack vs Parcel

I went with Vite after considering:

**Webpack**: Industry standard, but configuration heavy. For a game this size, I'd spend more time writing webpack.config.js than game code. Also, the dev server rebundles on every change - slow feedback loop.

**Parcel**: Zero config sounds great, but when things go wrong (and they do), the magic becomes opaque. Hard to debug.

**Vite**: Sweet spot. Uses native ES modules in development (instant server start), handles TypeScript without configuration, and the Hot Module Replacement actually preserves state. When I tweak ghost speed, I don't lose my current game.

The HMR part matters more than you'd think. Game development involves endless tweaking - "is this speed too fast? Let me adjust and see." With Vite, that adjustment takes under 100ms to reflect. With Webpack, it's 2-3 seconds of rebundling. Over a day of development, that adds up to hours of waiting.

### Testing: Vitest vs Jest

**Jest**: Would have worked fine. It's what I know.

**Vitest**: Uses the same Vite configuration. No separate babel.config.js or jest.config.ts to maintain. Tests run in the same environment as the game code. When both development and testing use identical module resolution, there's one less source of "works in tests, breaks in browser" bugs.

The API is Jest-compatible, so I'm writing the same tests I would write anyway.

### Language: TypeScript vs JavaScript

This wasn't really a question. Pac-Man has:
- Multiple entity types (Pac-Man, 4 ghosts, pellets, fruit)
- Multiple coordinate systems (pixels vs tiles)
- Multiple state machines (game state, ghost modes)
- Lots of magic numbers that need names

TypeScript catches mistakes early:

```typescript
// Without types - subtle bug
pacman.position = getTileCenter(col, row); // Returns {col, row}, not {x, y}!

// With types - compiler error
pacman.position: Position = getTileCenter(col, row);
// Error: Type 'TilePosition' is not assignable to type 'Position'
```

That bug would have taken 20 minutes to track down at runtime. TypeScript caught it in 0 seconds.

## The Directory Structure Philosophy

```
pacman/
├── src/                    # Source code
│   ├── entities/           # Things that exist in the game world
│   ├── systems/            # Things that act on entities
│   └── utils/              # Pure functions with no side effects
├── tests/                  # Mirror structure of src/
├── docs/
│   ├── SPECIFICATION.md    # What we're building
│   └── diary/              # How we built it (you're reading one)
└── package.json            # Dependencies and scripts
```

The `entities/systems/utils` split follows the Entity-Component-System pattern loosely:
- **Entities** know about themselves (position, state)
- **Systems** know how to process entities (rendering, collision)
- **Utils** know about neither (pure math, data structures)

This separation makes testing easier. I can test `Vector.normalize()` without instantiating a Pac-Man. I can test `Renderer` by mocking entity positions. Systems don't need to import each other.

## First Files Created

### package.json
Standard stuff: Vite for dev/build, Vitest for testing, TypeScript for sanity.

### tsconfig.json
Notable decisions:
- `strict: true` - Catches more bugs, annoying at first, worth it
- `noUnusedLocals/Parameters` - Keeps code clean
- `paths` - Allows `@/entities/PacMan` instead of `../entities/PacMan`

### vite.config.ts
The `test` section configures Vitest:
- `globals: true` - No need to import `describe`, `it`, `expect` everywhere
- `environment: 'jsdom'` - Tests can access DOM APIs

### index.html
The game container structure:
- Header with score displays
- Canvas element for WebGL rendering
- Footer with lives and fruit indicators
- Start screen overlay (hides during gameplay)

### styles.css
The "Press Start 2P" font is crucial for the arcade aesthetic. Without it, everything looks wrong.

## The Constants Philosophy

Every magic number gets a name:

```typescript
// Bad - what do these mean?
if (x > 28 * 16) x = 0;

// Good - self-documenting
if (x > GRID_WIDTH * SCALED_TILE) x = 0;
```

Constants are defined once and imported everywhere. When I later realize the tile size should be different, I change one line, not thirty.

The constants file also defines TypeScript enums for things like `Direction` and `GhostMode`. This means:
- Code completion shows valid options
- Typos cause compiler errors
- Switch statements can check exhaustiveness

## What's Not In This Entry

I haven't written any game code yet. This entry is about the foundation - the decisions that affect everything that comes after.

Tomorrow I'll start with TDD: write a test for `Vector` math, implement the Vector class, then move on to actual game logic.

---

## Lessons Learned (Session 0)

1. **Don't skip setup**: Proper project configuration saves hours of debugging later
2. **Tools matter**: HMR speed directly impacts iteration speed which impacts final quality
3. **Name things**: Future-you will forget what `8` means, `TILE_SIZE` is obvious
4. **Test early**: Setting up Vitest now means I can TDD from the first line of game code

## Time Spent

- Research and decisions: 30 minutes
- Writing configuration files: 20 minutes
- Verifying everything works: 10 minutes
- Writing this diary entry: 15 minutes
- **Total**: ~1.25 hours

Not a line of game code written. Worth it.
