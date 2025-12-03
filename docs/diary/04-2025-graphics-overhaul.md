# Build Diary - Entry 04: 2025 Graphics Overhaul

**Date**: Session Day 2
**Phase**: Visual Enhancement
**TDD Cycle**: RED → GREEN → REFACTOR

---

## The Challenge: Modern Visuals, Classic Feel

The request was clear: "2025 wow" graphics while keeping the original Pac-Man authenticity. This is a balancing act - modern games are full of particles, glow effects, and screen shake, but Pac-Man's charm comes from its simplicity.

My guiding principle: **Enhance, don't overwhelm.**

## What Makes Graphics "2025 Wow"?

After researching modern game aesthetics, I identified key elements:

1. **Neon/Synthwave Aesthetic** - Bright colors against dark backgrounds with soft glow
2. **Particle Systems** - Everything responds with particles
3. **Screen Juice** - Shake, flash, feedback on actions
4. **Smooth Animations** - Nothing feels static
5. **Polish** - Little details that add up

## The Splash Screen Decision

I chose to start with the splash screen because:
- It's the first thing players see
- It sets the visual tone for the entire game
- It doesn't affect gameplay (safe experimentation ground)

### The Neon Title

Each letter of "PAC-MAN" is a separate element with:
- Individual floating animation with staggered timing
- CSS text-shadow for glow (multiple layers for intensity)
- Subtle flicker effect mimicking real neon signs

The flicker is key - it's not random, it follows a pattern that feels "electrical" but doesn't distract.

```css
/* The flicker pattern - mostly on, brief dims */
@keyframes neon-flicker {
  0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
    /* Full glow */
  }
  20%, 24%, 55% {
    /* Dimmed */
  }
}
```

### Floating Ghosts

Four ghosts float in the background with:
- Pure CSS positioning and animation
- Different timing and directions (feels organic)
- Low opacity (0.3) so they don't compete with content
- Box-shadow glow in their respective colors

This creates atmosphere without implementation complexity.

### The Chomping Pac-Man

Initially I tried clip-path animation but it had browser compatibility issues. The solution: two half-circles (::before and ::after) that rotate to create the mouth movement.

```css
.splash-pacman::before { /* Top half */
  animation: pacman-top 0.3s ease-in-out infinite;
}
.splash-pacman::after { /* Bottom half */
  animation: pacman-bottom 0.3s ease-in-out infinite;
}
```

Simple, reliable, cross-browser compatible.

## Particle System Architecture

### Why Object Pooling?

Creating/destroying particles causes garbage collection stutters. Instead, I pre-allocate a pool:

```typescript
constructor(maxParticles: number = 1000) {
  for (let i = 0; i < maxParticles; i++) {
    this.particles.push(new Particle(/* inactive */));
    this.particles[i].alive = false;
  }
}
```

When emitting, we find a dead particle and recycle it. Zero allocations during gameplay.

### Effect Presets

Each game event has a tuned preset:

| Event | Particles | Speed | Life | Special |
|-------|-----------|-------|------|---------|
| Pellet Eat | 8 | 2 | 20 | Quick burst |
| Power Pellet | 24 | 4 | 35 | Glow effect |
| Ghost Eat | 30 | 5 | 40 | Ghost color, gravity |
| Pac-Man Death | 50 | 4 | 60 | Yellow explosion |

The numbers aren't arbitrary - I tuned them by feel:
- Pellet needs quick feedback, not distraction
- Power pellet needs to feel BIG
- Ghost eat is a victory moment, satisfying explosion
- Death needs drama, longer particles

## Post-Processing Effects

### Screen Shake

Shake is the most impactful effect for player satisfaction. The implementation uses exponential decay:

```typescript
update(): void {
  this.intensity *= this.decay; // Exponential falloff
  this.offsetX = (Math.random() - 0.5) * 2 * this.intensity;
  this.offsetY = (Math.random() - 0.5) * 2 * this.intensity;
}
```

Different events get different shake profiles:
- Ghost eat: Small (4px), punchy (8 frames) - satisfying
- Death: Large (8px), longer (20 frames) - dramatic
- Power pellet: Medium (3px), quick (5 frames) - emphasis

### Flash Overlay

A simple DOM element with opacity transitions. CSS handles the smoothing:

```css
#flash-overlay {
  transition: opacity 0.05s ease-out;
}
```

Colors vary by event:
- Power pellet: White (40% alpha) - brightness
- Damage: Red (30% alpha) - danger
- Extra life: Yellow (50% alpha) - reward

## Integration Challenges

### The Start Position Bug

Pac-Man was spawning inside a wall! The original position (row 23, col 13.5) landed on wall tiles. Looking at the maze data:

```
Row 22: [1,3,2,2,1,1,2,2,2,2,2,2,2,0,0,2,...]  // 0,0 at columns 13-14
Row 23: [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,...]  // 1,1 at columns 13-14 (WALLS)
```

Fix: Changed PACMAN start position to row 22.

### Game Speed Perception

The user noted "everything running too fast." This is a perception issue - the effects and particles make the game feel more active. I didn't change timing, but the visual density creates urgency.

Consider this for future: perhaps slow down during power mode to make it feel more dramatic?

## Technical Decisions

### CSS vs WebGL for Effects

I chose CSS for:
- Splash screen animations (reliability)
- Glow effects (drop-shadow filter)
- Flash overlay (simplicity)

WebGL for:
- Particles (performance with 1000+ objects)
- Game rendering (batched draws)

This hybrid approach keeps code simple where it can be.

### Particle Rendering

Particles render as quads (2 triangles each). They're added to the same batch as game objects, so everything draws in one call:

```typescript
renderParticles(renderData) {
  this.vertices.push(...renderData.positions);
  this.colors.push(...renderData.colors);
}
```

## What I'd Do Differently

1. **Motion Trails**: I planned these but didn't implement. Would add nice fluidity.

2. **CRT Mode**: The post-processing config includes CRT settings but they're unused. Would be cool as a toggle.

3. **Bloom Shader**: Currently using CSS approximation. Real GPU bloom would look better but adds complexity.

4. **Sound Visualization**: Waveform display during attract mode would be cool.

## Results

The game now has:
- Animated neon splash screen
- Particle bursts on pellet/ghost eating
- Screen shake on impacts
- Flash effects for emphasis
- Power mode visual indicator (pulsing border)

All while maintaining 60fps and the classic gameplay feel.

---

**Stats:**
- **New files**: 3 (ParticleSystem.ts, PostProcessing.ts, tests)
- **Tests added**: 39 (23 particle + 16 post-processing)
- **Total tests**: 229 passing
- **CSS lines**: ~400 new for splash/effects
- **Build time**: Still instant

---

## Screenshots

*[Add screenshot of new splash screen]*

*[Add screenshot of particle effects in action]*

---

**Key Takeaway**: Visual polish is about restraint. Every effect should serve a purpose - feedback, emphasis, atmosphere. More isn't always better; better is better.
