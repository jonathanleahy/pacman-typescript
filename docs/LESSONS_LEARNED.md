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
