# Build Diary - Entry 05: Visual Polish

**Date**: Session Day 2 (continued)
**Phase**: Refinement
**Focus**: Animation tuning and scale adjustments

---

## The Problem: Scale Changes Break Feel

After increasing SCALE from 2 to 3, the game *looked* bigger but *felt* wrong:

1. **Ghost feet wiggling too fast** - The animation counter didn't account for scale
2. **Pac-Man chomping frantically** - Same issue
3. **Ghosts trapped in house** - Exit logic used hardcoded 1px/frame movement
4. **Characters too small** - At larger scale, they looked lost in the maze
5. **UI text too small** - Header designed for 448px, now canvas is 672px

## Root Cause Analysis

The original code had magic numbers that assumed SCALE=2:

```typescript
// Ghost exit - moves 1 pixel per frame
// At SCALE=2: 16px tile / 1px = 16 frames to exit
// At SCALE=3: 24px tile / 1px = 24 frames (too slow!)
this.position.y -= 1;

// Animation speed = 3 meant:
// At 60fps: animation changes every 3 frames = 20 changes/second
// That's frantic at any scale
```

## The Fixes

### 1. Animation Speed (The Easy Win)

Changed base animation speed from 3 to 6 frames:
- Pac-Man mouth: Now chomps at 10 cycles/second (was 20)
- Ghost feet: Set to 12 frames = 5 wiggles/second

The feel is now "determined" rather than "panicked."

### 2. Ghost House Exit (The Bug)

```typescript
// Before: hardcoded 1px movement
if (this.position.y > doorY) {
  this.position.y -= 1;
}

// After: proper exit speed
const exitSpeed = 2;
if (this.position.y > doorY + exitSpeed) {
  this.position.y -= exitSpeed;
}
```

This was a classic "works at one scale" bug. The test didn't catch it because the test verified behavior, not timing.

### 3. Character Sizes

Made them proportionally larger:
- Pac-Man radius: `SCALED_TILE / 2 + 4` (was `SCALED_TILE / 2 - 1`)
- Ghost size: `SCALED_TILE + 8` (was `SCALED_TILE - 2`)

Characters now fill their tiles better, making the game feel more substantial.

### 4. UI Scaling

```css
#header {
  width: 672px;  /* was 448px */
  font-size: 14px;  /* was 10px */
}

#score, #high-score {
  font-size: 18px;  /* was 12px */
}
```

## Lessons Learned

### Magic Numbers Are Technical Debt

Every hardcoded `1` or `3` is a future bug when scale changes. Better:
```typescript
const EXIT_SPEED = SCALE;  // Scales with game
```

### Animation "Feel" Is Subjective But Measurable

"Too fast" is vague. "20 cycles/second vs 10 cycles/second" is testable. When tuning feel, quantify it first.

### Scale Changes Are Integration Tests

Unit tests passed because they tested logic, not visual integration. A visual review caught what tests couldn't.

## The Bug Fix Protocol

Added to LESSONS_LEARNED.md:

> When something is broken, write a failing test FIRST, then fix it.

In this case, I should have written:
```typescript
it('should exit ghost house within reasonable time at any scale', () => {
  ghost.exitHouse();
  for (let i = 0; i < 60; i++) ghost.update(); // 1 second
  expect(ghost.isInHouse).toBe(false);
});
```

This would have caught the exit speed bug immediately.

---

## Results

| Aspect | Before | After |
|--------|--------|-------|
| Pac-Man chomp | 20/sec | 10/sec |
| Ghost wiggle | ~20/sec | 5/sec |
| Ghost exit time | ~24 frames | ~12 frames |
| Character size | Tile - 2px | Tile + 8px |
| UI readability | Squinting | Comfortable |

---

## Screenshots

### Before: Small Characters, Fast Animation
![Before polish](../images/05-before-polish.png)
*Characters looked lost in the larger maze*

### After: Larger Characters, Smooth Animation
![After polish](../images/05-after-polish.png)
*Characters now fill their space properly*

### Ghost House Exit Fixed
![Ghost exit](../images/05-ghost-exit.png)
*Ghosts exit smoothly at the correct speed*

---

**Key Takeaway**: Scaling isn't just multiplication. Every hardcoded value is a scaling assumption waiting to break.

*"Make it work, make it right, make it scale."*
