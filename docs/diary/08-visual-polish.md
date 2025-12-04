# Diary Entry 08: Visual Polish - Black Backgrounds & Muted Colors

**Date**: 2025-12-04
**Feature**: Black backgrounds and softer color palette
**PR**: #5

## The Ask

User feedback on two visual issues:
1. "I prefer the black background" - both splash and game screens had gradient backgrounds
2. "That red on level 2 is too loud" - the bright red (#ff0000) was too intense

## Changes Made

### Black Backgrounds
Changed both screens from gradient backgrounds to solid black:

**Before (styles.css)**:
```css
#splash-screen {
  background: linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-mid) 50%, var(--gradient-end) 100%);
}

#game-container::before {
  background: linear-gradient(135deg, ...);
}
```

**After**:
```css
#splash-screen {
  background: #000;
}

#game-container::before {
  background: #000;
}
```

### Muted Red Color

Changed the red level color from bright to muted:

**LevelConfig.ts MAZE_COLORS**:
- Before: `{ main: '#ff0000', light: '#ff5555' }`
- After: `{ main: '#cc4444', light: '#dd7777' }`

**WebGLRenderer.ts Theme 3**:
- Before: `wallColor: [0.85, 0.1, 0.15, 1.0]` (~#D91A26)
- After: `wallColor: [0.8, 0.27, 0.27, 1.0]` (~#CC4444)

Also adjusted glow and highlight values to match the softer palette.

## Files Modified

| File | Change |
|------|--------|
| `src/styles.css` | Black backgrounds for splash and game |
| `src/systems/LevelConfig.ts` | Muted red in MAZE_COLORS array |
| `src/systems/WebGLRenderer.ts` | Muted red in level 3 theme |

## Visual Impact

The black backgrounds:
- Create better contrast with the neon maze colors
- Match the classic arcade feel
- Reduce visual noise from animated gradients

The muted red:
- Easier on the eyes during extended play
- Still distinct from other level colors
- More cohesive with the overall palette

## Lessons Learned

- User feedback about "too loud" colors is valid - bright saturated colors (#ff0000) can be harsh
- Simple black backgrounds often work better than fancy gradients for games
- Need to keep color definitions in sync between LevelConfig.ts and WebGLRenderer.ts themes
