# Lessons Learned - AI-Assisted Game Development

**Author**: Jon
**Project**: Pac-Man TypeScript
**Date**: Session completed

---

## Original Requirements

When starting this project, I asked for:
1. **Pac-Man in TypeScript** - Using HTML, CSS, WebGL for performance
2. **Hot reload** - Fast iteration during development
3. **Great gameplay** - Authentic to the original
4. **Great sound** - Synthesized retro audio
5. **Great graphics** - WebGL rendering
6. **TDD** - Test-Driven Development throughout
7. **Specification document** - Define before building
8. **Build diary** - One page per feature/TDD step documenting decisions

These requirements shaped the entire development approach and led to a successful, well-documented project.

---

## What Worked Well

### 1. TDD (Test-Driven Development) Keeps the AI On Target

**Why it matters**: When asking an AI to build something complex, TDD acts as guardrails. Each failing test is a clear specification of what needs to be built. The AI can't wander off into unnecessary features because the tests define the scope.

**In practice**:
- Writing tests first forced explicit requirements
- 190 tests provided continuous validation
- Refactoring was safe because tests caught regressions
- The AI stayed focused on passing the next test

**Recommendation for future projects**:
```
1. Define the feature in plain English
2. Write failing tests for that feature
3. Ask AI to implement until tests pass
4. Refactor
5. Commit PR
```

### 2. Build Diary Documents Decision-Making

**Why it matters**: Understanding *why* decisions were made is as valuable as the code itself. The diary entries capture:
- Trade-offs considered (WebGL vs Canvas 2D)
- Problems encountered and solutions found
- Performance considerations
- Lessons learned

**In practice**:
- Each diary entry tells a story, not just a changelog
- Future developers (including me) can understand the reasoning
- Helps identify what to improve next time

**Recommendation for future projects**:
- One diary entry per major feature or TDD cycle
- Focus on the "why" more than the "what"
- Include what didn't work and why

### 3. Specification Document First

**Why it matters**: A spec document front-loads the thinking. Before any code is written:
- Requirements are clear
- Architecture is sketched
- Scope is defined
- Success criteria are established

**In practice**:
- The spec became the north star
- AI referenced it to stay aligned
- Features could be checked off systematically

**Recommendation for future projects**:
- Start every project with a spec (even small ones)
- Include technical decisions in the spec
- Update it as understanding evolves

### 4. WebGL for Performance

**Insight**: For any project rendering many sprites (games, visualizations), WebGL batching provides massive performance improvements over Canvas 2D.

**Numbers from this project**:
- Canvas 2D: 400+ draw calls per frame
- WebGL batched: 2-3 draw calls per frame
- Frame time: 2-3ms (of 16.67ms budget)

### 5. Fixed Timestep Game Loop

**Insight**: Variable timestep causes physics bugs when frame rate drops. Fixed timestep (accumulator pattern) ensures consistent gameplay regardless of performance.

---

## Future Improvement: PR Per Feature

**Current approach**: Build everything in one session.

**Better approach**: Commit a PR for each feature.

### Suggested PR Structure

```
PR 1: Project Setup
- Vite, TypeScript, Vitest configuration
- Directory structure
- Initial spec document

PR 2: Vector & MazeData Utilities
- Vector class with tests
- Maze layout data
- Helper functions

PR 3: Rendering System
- WebGL renderer with shaders
- Maze rendering
- Pellet rendering

PR 4: Pac-Man Entity
- Movement with cornering
- Animation
- Input handling

PR 5: Ghost AI
- Base Ghost class
- Blinky, Pinky, Inky, Clyde implementations
- Ghost mode state machine

PR 6: Collision System
- Pellet eating
- Ghost collision
- Power pellet mechanics

PR 7: Sound System
- Web Audio synthesis
- Waka-waka
- Siren and frightened sounds

PR 8: Game Integration
- Main Game class
- State management
- Final polish
```

### Benefits of PR-per-feature:
- Smaller, reviewable changes
- Clear history of development
- Easier to revert specific features
- Better for collaboration
- Forces thinking in discrete units

---

## Key Technical Insights

### Ghost AI is Elegant

Each ghost has simple rules that combine into complex behavior:
- **Blinky**: Direct chase (pressure from behind)
- **Pinky**: 4 tiles ahead (ambush)
- **Inky**: Complex vector math (chaos)
- **Clyde**: Chase when far, retreat when close (uncertainty)

This is great game design - simple rules, emergent complexity.

### The Cornering Mechanic Matters

Allowing players to "pre-turn" before reaching tile center makes controls feel responsive. Without it, the game feels sluggish.

### Sound Makes the Game

Pac-Man without "waka waka" isn't Pac-Man. Synthesized sounds match the retro aesthetic and have zero load time.

---

## Evolution: From Faithful Recreation to Fresh Take

**Initial goal**: Recreate the 1980 arcade experience as authentically as possible.

**Why this was valuable**: Staying true to the original kept the project focused. The classic maze layout, ghost AI behaviors, and timing created the gameplay that made Pac-Man a legend. Without this foundation, we'd have just another maze game.

**The pivot**: Once the authentic foundation was solid (190 tests, proper ghost AI, original timing), we had permission to evolve. The "2025 wow" graphics overhaul added:
- GPU-accelerated particle effects
- Neon glow aesthetic with animated splash screen
- Screen shake and visual feedback
- Larger visual scale (SCALE=3 instead of 2)

**Key insight**: Times have changed. Players expect modern polish. The classic gameplay *is* the soul of Pac-Man, but the presentation can evolve. A faithful recreation was the right *starting point*, not the end goal.

**Recommendation for future retro projects**:
1. Build the authentic version first - respect the original
2. Ensure tests lock in the core gameplay
3. Then layer on modern visuals and polish
4. The foundation ensures you're enhancing, not replacing

*"Keep the soul, upgrade the skin."*

---

## Bug Fix Protocol: Test First

**Rule**: When something is broken, write a failing test FIRST, then fix it.

**Why this matters**:
1. The test proves the bug exists (reproducible)
2. The test defines what "fixed" means
3. The fix is verified automatically
4. The bug can never regress silently

**Example workflow**:
```bash
# 1. Bug report: "Ghost feet wiggle too fast"
# 2. Write test that captures expected behavior
npm test -- --run  # Test fails (RED)

# 3. Fix the code
# 4. Verify
npm test -- --run  # Test passes (GREEN)

# 5. Commit
git commit -m "Fix ghost animation speed"
```

**Anti-pattern**: Fixing bugs without tests means:
- You might not actually fix it
- You can't prove it's fixed
- It might come back later

*"If it's worth fixing, it's worth testing."*

---

## What I'd Do Differently

1. **Draw the state machine diagram first**: Ghost modes got complex. A visual diagram would have helped.

2. **Mobile controls earlier**: Touch input was an afterthought. Should be designed from the start.

3. **Commit PRs during development**: Easier to track progress and share work in progress.

4. **Add performance monitoring**: Built-in FPS counter and timing metrics.

---

## Summary

This session demonstrated that **TDD + Specification + Diary** creates a powerful framework for AI-assisted development:

| Technique | Purpose | Outcome |
|-----------|---------|---------|
| TDD | Keep AI focused | 190 passing tests, no scope creep |
| Specification | Define requirements | Clear north star |
| Diary | Capture decisions | Reusable knowledge |
| WebGL | Performance | 60 FPS solid |
| Fixed timestep | Consistency | Deterministic gameplay |

**For future projects**: Use this same approach. Break into PR-sized features. Document as you go.

---

*"The best code is code you understand three months later."*

---

## Feature Diary: Fruit & Level Progression

**Date**: Session 2
**Branch**: feature/fruit-and-levels

### What We Built

**Fruit System**:
- Bonus items spawn at 70 and 170 pellets eaten (per level)
- 8 fruit types: Cherry, Strawberry, Orange, Apple, Melon, Galaxian, Bell, Key
- Each type has different point values (100 to 5000 points)
- Fruits despawn after 10 seconds if not collected
- Distinctive WebGL rendering for each fruit type

**Level Progression**:
- 21 unique level configurations based on original arcade
- Speed increases: ghosts and Pac-Man get faster each level
- Frightened duration decreases: 6 seconds on level 1, down to 0 on level 19+
- Maze colors cycle through 8 different palettes
- Elroy mode: Blinky gets speed boost when few pellets remain

### Technical Decisions

**Why static `getFruitTypeForLevel()`?**
This is a pure function - given a level, return a fruit type. No need for instance state. Makes testing trivial and allows both Fruit and LevelConfig to use the same logic.

**Why separate LevelConfig from Game?**
Keeps configuration data pure and testable. The Game class stays focused on orchestration while LevelConfig handles the "what changes per level" data.

**Why 21 levels?**
Original Pac-Man had distinct configurations through level 21, then values capped. We follow the same pattern for authenticity.

### TDD Stats

- 50 new tests added (27 Fruit + 23 LevelConfig)
- Total: 279 tests passing
- Zero regressions in existing code

### What Went Well

1. **Test-first fruit types**: Writing tests for getFruitTypeForLevel() documented the exact progression before implementation
2. **Color cycling**: Simple modulo operation (`level % 8`) gives infinite variety
3. **WebGL fruit sprites**: Each fruit has a distinctive look using primitive shapes

### Interesting Bug Found

Tile position calculation for fruit spawn was off by one:
```typescript
// Bug: Expected tile 13, got 14
// Fix: Math.floor(position.x / SCALED_TILE) is correct
// The spawn position (13.5 * SCALED_TILE + SCALED_TILE/2) floors to 14
```

Lesson: Test the actual game math, not assumptions about the math.

### Files Changed

```
src/entities/Fruit.ts (new)
src/systems/LevelConfig.ts (new)
tests/entities/Fruit.test.ts (new)
tests/systems/LevelConfig.test.ts (new)
src/Game.ts (fruit integration)
src/systems/WebGLRenderer.ts (fruit rendering, maze color)
src/systems/Sound.ts (fruit appear sound)
src/types.ts (FRUIT_APPEAR sound type)
```

*"Each level should feel slightly different - that's what keeps players playing."*

---

## Feature Diary: 2025 Polish & Animations

**Date**: Session 3
**Branch**: feature/fruit-and-levels (continued)

### What We Built

**Animated Intermission Cutscenes**:
- ACT I (Level 2): Ghosts chase Pac-Man across screen
- ACT II (Level 3): Giant Pac-Man chases frightened ghosts
- ACT III (Level 4): Celebration dance with orbiting ghosts
- FINALE (Level 5): Victory parade with bouncing characters
- Full sprite animation with Canvas 2D overlay on cutscene screen
- Only Space/Enter skip (arrow keys no longer accidentally skip)

**Victory Animation (Last Pellet Eaten)**:
- Pac-Man spins 6 times with easing (fast start, slow finish)
- 4 bouncy jumps with decay
- Size pulsing effect
- Confetti particle explosion
- Screen shake and flash
- Victory music plays

**Epic "YOU WIN!" Screen (Beat Level 5)**:
- Giant rainbow-cycling text with glow
- Twinkling star background
- Falling confetti particles
- Floating ghost SVG animations
- Final score display
- "CHAMPION!" subtitle

**UI Improvements**:
- Level display added to header (purple theme)
- Mute button moved to bottom-right (was overlapping high score)
- Removed 2UP display (single player only)
- Softer level 2 green color

**Bug Fixes**:
- Ghost eyes getting trapped: EATEN ghosts now ignore "no upward" restriction
- Power pellets now EXTEND frighten time (was resetting)
- Cheat code (===) places 1 random pellet instead of completing level
- Maze flashing changed from harsh white to gentle pulsing glow

### Technical Decisions

**Why Canvas 2D for cutscenes instead of WebGL?**
The cutscene sprites need rotation, scaling, and glow effects. Canvas 2D's `ctx.save()/restore()` and shadow effects are simpler for this than adding transform matrices to the WebGL shader. Performance isn't critical for 5 sprites.

**Why sine wave for maze pulsing?**
`Math.sin(timer * 0.15) * 0.5 + 0.5` gives a smooth 0-1 oscillation. Multiplying by 0.4 limits brightness boost to 40%. Much more pleasant than binary on/off flashing.

**Why victory animation in Game state machine?**
Adding `VICTORY_ANIMATION` state keeps the pattern consistent. All special sequences (dying, intermission, victory) follow the same state machine pattern.

### What Went Well

1. **Restoring from git history**: Found the original animated cutscenes in commit 8a2c0de and integrated them properly
2. **CSS animations for YOU WIN**: Keyframe animations handle the complex celebration effects without JavaScript
3. **Type safety**: Explicit `[number, number, number, number]` tuple for wall colors prevented runtime issues

### Files Changed

```
index.html (level display, removed 2UP)
src/styles.css (level styles, mute position)
src/Game.ts (victory animation, cheat code, level display)
src/entities/PacMan.ts (victory animation properties)
src/entities/Ghost.ts (EATEN mode bypass no-upward)
src/systems/Intermission.ts (full animated scenes)
src/systems/WebGLRenderer.ts (cutscene rendering, YOU WIN screen, maze pulse)
src/systems/Collision.ts (clearAllPelletsExcept, getRandomPelletPosition)
src/systems/Input.ts (=== cheat code detection)
src/systems/Sound.ts (VICTORY sound type)
src/types.ts (VICTORY sound type)
src/constants.ts (VICTORY_ANIMATION state)
```

*"Polish is the difference between a game and a great game."*
