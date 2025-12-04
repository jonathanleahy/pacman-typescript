# Build Diary - Entry 06: Level Themes & Enhanced Visuals

**Date**: December 2024
**Phase**: Enhancement
**Focus**: Visual theming system and improved wall/floor rendering

---

## The Request

"Make the walls and floor nicer" and "levels should have different themes"

Simple requests that led to a complete visual overhaul of the maze rendering system.

## The Implementation

### 1. Enhanced Wall Rendering

The original walls were thin 2px lines connecting wall tiles. The new system uses a three-pass rendering approach:

```typescript
// Pass 1: Glow layer (soft colored glow behind walls)
this.addRect(x, y, glowWidth, height, wallGlow);

// Pass 2: Main wall lines (thicker, solid color)
this.addRect(x, y, lineWidth, height, wallColor);

// Pass 3: Inner highlights (3D depth effect)
this.addRect(x - 1, y, 1, height, wallHighlight);
```

**Before**: Thin 2px blue lines
**After**: 4px walls with glow + highlight for depth

### 2. Floor Pattern

Added subtle checkerboard pattern to walkable areas:

```typescript
renderFloor(): void {
  for (let row = 0; row < GRID_HEIGHT; row++) {
    for (let col = 0; col < GRID_WIDTH; col++) {
      if (tile !== TileType.WALL) {
        const color = (row + col) % 2 === 0 ? floorColor1 : floorColor2;
        this.addRect(x, y, SCALED_TILE, SCALED_TILE, color);
      }
    }
  }
}
```

The pattern is intentionally subtle - dark blue-black alternating tiles that add texture without distraction.

### 3. Level Theme System

Created a theme configuration object with colors for each level:

```typescript
private readonly levelThemes = {
  // Level 1: Classic Blue - The original arcade look
  1: {
    name: 'Classic Blue',
    wallColor: [0.13, 0.13, 0.87, 1.0],      // #2121de
    wallGlow: [0.15, 0.15, 0.55, 1.0],
    wallHighlight: [0.4, 0.4, 1.0, 1.0],
    floorColor1: [0.02, 0.02, 0.05, 1.0],
    floorColor2: [0.04, 0.04, 0.08, 1.0],
    doorColor: [1.0, 0.72, 0.87, 1.0],       // Pink
    doorGlow: [0.6, 0.45, 0.55, 0.5],
  },
  // Level 2: Neon Green - Cyber/Matrix theme
  2: {
    name: 'Neon Green',
    wallColor: [0.0, 0.8, 0.2, 1.0],
    wallGlow: [0.0, 0.4, 0.1, 1.0],
    wallHighlight: [0.4, 1.0, 0.5, 1.0],
    // ... matching floor and door colors
  },
  // Level 3: Crimson Red - Danger zone
  3: {
    name: 'Crimson Red',
    wallColor: [0.85, 0.1, 0.15, 1.0],
    wallGlow: [0.5, 0.05, 0.1, 1.0],
    wallHighlight: [1.0, 0.4, 0.4, 1.0],
    // ... matching floor and door colors
  },
};
```

Themes cycle after level 3: Level 4 returns to blue, level 5 to green, etc.

### 4. Integration with Game Loop

The renderer now receives the current level before each frame:

```typescript
// In Game.ts render()
this.renderer.setLevel(this.level);
this.renderer.renderMaze();
```

This allows real-time theme switching when levels change.

## Technical Decisions

### Why Three Rendering Passes?

WebGL batches draw calls, so multiple passes don't hurt performance significantly. The layered approach gives us:
1. **Glow** - Creates atmosphere and makes walls "pop"
2. **Solid** - The actual wall boundary
3. **Highlight** - Simulates light source for 3D effect

### Why Not Use Shaders?

Could have implemented glow as a fragment shader blur, but:
- More complex to maintain
- Harder to configure per-level
- Current approach is "good enough" and explicit

### Vite Base Path Fix

Also fixed iframe embedding issue - Vite was building with absolute paths (`/assets/`) instead of relative (`./assets/`):

```typescript
// vite.config.ts
export default defineConfig({
  base: './',  // Added this line
  // ...
});
```

## Lessons Learned

### Theme Systems Should Be Data-Driven

Putting colors in a configuration object makes adding new themes trivial:
```typescript
// Adding Level 4 theme would just be:
4: { name: 'Purple Haze', wallColor: [...], ... }
```

### Visual Polish Compounds

Each individual change (thicker walls, glow, highlights, floor pattern) is subtle. Together they transform the feel completely.

### Browser Caching Is Real

Spent time debugging "it looks the same" - the fix was always there, just cached. Hard refresh or new incognito window is essential for testing visual changes.

---

## Results

| Aspect | Before | After |
|--------|--------|-------|
| Wall thickness | 2px | 4px |
| Wall effects | None | Glow + highlight |
| Floor | Plain black | Subtle checkerboard |
| Level variety | None | 3 distinct themes |
| Ghost door | Pink line | Glowing themed door |

---

## The Three Themes

### Level 1: Classic Blue
The original Pac-Man arcade aesthetic. Blue walls on black, pink ghost house door.

### Level 2: Neon Green
Cyber/Matrix inspired. Green glowing walls create a digital feel. Progression reward.

### Level 3: Crimson Red
Danger zone. Red walls signal increased difficulty. Psychological pressure.

---

**Key Takeaway**: Visual theming isn't just cosmetic - it provides progression feedback and keeps the game fresh across levels.

*"The maze is the same, but it feels different each time."*
