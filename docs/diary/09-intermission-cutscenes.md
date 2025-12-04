# Diary Entry 09: Intermission Cutscenes & Max Level 5

**Date**: 2025-12-04
**Feature**: Intermission cutscenes after levels 2-5, max level cap at 5
**PR**: #6

## The Ask

User requested:
- Intermission cutscenes after completing levels 2, 3, 4, and 5
- Maximum level is 5 (game ends with victory after level 5)

## Design Decisions

### Intermission Triggers
- After level 1: No intermission (classic arcade starts cutscenes at level 2)
- After levels 2, 3, 4: Show ACT I, II, III cutscenes
- After level 5: Show "FINALE" then victory screen

### Scene Content
Each intermission has a thematic title and message:
- **ACT I**: "THE CHASE BEGINS"
- **ACT II**: "THEY CORNER HIM"
- **ACT III**: "THE TABLES TURN"
- **FINALE**: "VICTORY!"

### Skip Functionality
- Any key press skips the intermission
- Keyboard handler automatically enabled/disabled with intermission state

### Game Won State
New `GAME_WON` state added alongside `GAME_OVER`:
- Shows "YOU WIN!" with green neon glow
- "PRESS SPACE TO PLAY AGAIN" subtitle
- Same restart mechanic as game over

## Implementation

### New Files
- `src/systems/Intermission.ts` - Intermission system class
- `tests/systems/Intermission.test.ts` - 32 TDD tests

### Modified Files
- `src/constants.ts` - Added `INTERMISSION` and `GAME_WON` states
- `src/Game.ts` - Integration with game loop
- `src/systems/WebGLRenderer.ts` - Rendering methods

### Key Code Patterns

**Static helper methods for level checks:**
```typescript
static shouldPlayAfterLevel(level: number): boolean {
  return level >= 2 && level <= 5;
}

static isFinalLevel(level: number): boolean {
  return level >= Intermission.MAX_LEVEL;
}
```

**State machine flow:**
```
LEVEL_COMPLETE
    → (level 2-5?) → INTERMISSION → (level 5?) → GAME_WON
                                  → (level 2-4) → READY (next level)
    → (level 1)    → READY (next level)
```

**Intermission lifecycle:**
1. `start(level, callback)` - Begin intermission
2. `update()` - Called each frame, auto-completes after 3 seconds
3. `skip()` - Manual skip via any key
4. `onComplete callback` - Triggers next state

## Testing

32 new tests covering:
- `shouldPlayAfterLevel` for each level
- `isFinalLevel` boundary conditions
- Start/active/complete lifecycle
- Progress calculation
- Skip functionality
- Scene descriptions
- Callback behavior

## Visual Design

The intermission overlay:
- Semi-transparent black background (90% opacity)
- Cyan title with neon glow
- Yellow message text
- Gray "PRESS ANY KEY TO SKIP" hint
- Fade in/out transitions (first/last 10% of duration)

The victory screen:
- Green "YOU WIN!" with pulsing animation
- Yellow restart prompt

## Lessons Learned

1. **Game state machines benefit from clear documentation** - The state flow diagram helps understand transitions
2. **Static methods are perfect for configuration checks** - `shouldPlayAfterLevel` doesn't need instance state
3. **Callback patterns enable loose coupling** - Game.ts doesn't need to know intermission internals
4. **DOM overlays work well for full-screen effects** - Simpler than WebGL text rendering

## Test Results

329 total tests passing (32 new intermission tests + 297 existing)
