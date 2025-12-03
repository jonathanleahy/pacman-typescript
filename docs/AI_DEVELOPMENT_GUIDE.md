# AI Development Guide - Pac-Man TypeScript

**Purpose**: Instructions for AI assistants (Claude, etc.) when implementing new features.

---

## Development Methodology

### 1. Test-Driven Development (TDD)

Every feature follows the RED → GREEN → REFACTOR cycle:

```
1. Write failing tests that define the feature behavior
2. Implement minimum code to make tests pass
3. Refactor while keeping tests green
4. Commit when all tests pass
```

**Why TDD?** It keeps the AI focused on specific requirements and prevents scope creep.

### 2. One PR Per Feature

Each feature should be a separate commit/PR with:
- All tests passing before AND after
- Diary entry documenting decisions
- No unrelated changes

### 3. Test Verification

Before any commit:
```bash
npm test -- --run
```

All 190+ tests must pass. Never commit with failing tests.

---

## How to Implement a New Feature

### Step 1: Understand the Feature
- Read this guide
- Check the backlog below for feature details
- Review existing code patterns in similar features

### Step 2: Write Tests First
Create test file in `tests/` matching the source structure:
```
src/entities/Fruit.ts → tests/entities/Fruit.test.ts
```

Write tests that define:
- Normal behavior
- Edge cases
- Integration with existing systems

### Step 3: Implement
- Write code in `src/` to make tests pass
- Follow existing code patterns and style
- Add comments explaining "why" not "what"
- Keep files under 500 lines

### Step 4: Write Diary Entry
Create `docs/diary/XX-feature-name.md` documenting:
- The problem being solved
- Why specific decisions were made
- What alternatives were considered
- What didn't work and why

### Step 5: Verify and Commit
```bash
npm test -- --run  # All tests must pass
npm run build      # Must compile without errors
git add .
git commit -m "Add [feature name]"
```

---

## Project Structure

```
src/
├── main.ts              # Entry point
├── Game.ts              # Main controller
├── constants.ts         # Game constants
├── types.ts             # TypeScript interfaces
├── entities/            # Game objects (PacMan, Ghosts, etc.)
├── systems/             # Rendering, Input, Collision, Sound
└── utils/               # Vector, MazeData

tests/                   # Mirror of src/ structure
docs/
├── SPECIFICATION.md     # Technical spec
├── LESSONS_LEARNED.md   # Development insights
├── AI_DEVELOPMENT_GUIDE.md  # This file
└── diary/               # Feature decision logs
```

---

## Code Patterns to Follow

### Entity Pattern
```typescript
// Entities extend base Entity class
export class NewEntity extends Entity {
  constructor(x: number, y: number) {
    super(x, y);
  }

  update(deltaTime: number): void {
    // Update logic
  }
}
```

### Test Pattern
```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('FeatureName', () => {
  let instance: FeatureClass;

  beforeEach(() => {
    instance = new FeatureClass();
  });

  it('should do expected behavior', () => {
    expect(instance.method()).toBe(expected);
  });
});
```

### Sound Pattern
```typescript
// Add to Sound.ts SoundType enum and createSound switch
```

---

## Feature Backlog

### Priority 1: Core Gameplay

#### Fruit Spawning
- **Trigger**: Appears when 70 pellets eaten, again at 170
- **Position**: Center of maze (tile 14, 17)
- **Despawn**: After ~10 seconds if not eaten
- **Points by level**:
  - Level 1: Cherry (100)
  - Level 2: Strawberry (300)
  - Level 3: Orange (500)
  - Level 4: Apple (700)
  - Level 5: Melon (1000)
  - Level 6+: Galaxian, Bell, Key (increasing)
- **Tests needed**:
  - Spawns at correct pellet count
  - Correct position
  - Despawns after timeout
  - Awards correct points
  - Only one fruit at a time

#### Level Progression
- **Speed increase**: Ghosts faster each level
- **Frightened time decrease**: 6s → 5s → 4s → etc.
- **Maze color changes**: Blue → different colors
- **Tests needed**:
  - Speed values per level
  - Frightened duration per level
  - Level transition triggers

### Priority 2: Polish

#### Sound Toggle UI
- Mute/unmute button in corner
- Persist preference to localStorage
- Keyboard shortcut (M key)
- **Tests needed**:
  - Toggle state changes
  - Preference persists
  - Sound actually mutes

#### Mobile Controls
- Swipe detection with 30px threshold
- On-screen D-pad fallback
- Touch event handling
- **Tests needed**:
  - Swipe direction detection
  - Button press handling
  - No conflict with keyboard

### Priority 3: Extras

#### Intermission Cutscenes
- After levels 2, 5, and 9
- Pac-Man and ghost animations
- Skip on any key press
- **Tests needed**:
  - Triggers at correct levels
  - Animation sequences
  - Skip functionality

#### Accessibility
- Reduced motion mode (disable animations)
- High contrast option
- Colorblind ghost patterns
- **Tests needed**:
  - Settings persist
  - Visual changes apply
  - Game still playable

---

## Commands Reference

```bash
# Development
npm run dev          # Start with hot reload

# Testing
npm test             # Watch mode
npm test -- --run    # Run once
npm run test:coverage

# Building
npm run build        # Production build
npm run preview      # Preview build
```

---

## Checklist for Every Feature

- [ ] Tests written first (RED)
- [ ] Implementation makes tests pass (GREEN)
- [ ] Code refactored if needed (REFACTOR)
- [ ] All 190+ existing tests still pass
- [ ] Diary entry written
- [ ] Comments explain "why"
- [ ] No unrelated changes
- [ ] Build succeeds

---

## Example: Adding Fruit Feature

```bash
# 1. Create test file
# tests/entities/Fruit.test.ts

# 2. Write failing tests
npm test -- --run  # Should fail

# 3. Create implementation
# src/entities/Fruit.ts

# 4. Make tests pass
npm test -- --run  # Should pass

# 5. Write diary
# docs/diary/04-fruit-spawning.md

# 6. Commit
git add .
git commit -m "Add fruit spawning with level-based point values"
```

---

*This guide ensures consistent, high-quality feature development.*
