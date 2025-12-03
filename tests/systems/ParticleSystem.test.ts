/**
 * Particle System Tests
 *
 * Tests for GPU-accelerated particle effects that bring
 * the 2025 visual polish to our classic Pac-Man.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  Particle,
  ParticleSystem,
  ParticleEmitterConfig,
  EffectPresets,
} from '../../src/systems/ParticleSystem';

describe('Particle', () => {
  it('should initialize with correct properties', () => {
    const particle = new Particle(100, 200, 2, 3, [1, 1, 0, 1], 4, 60);

    expect(particle.x).toBe(100);
    expect(particle.y).toBe(200);
    expect(particle.vx).toBe(2);
    expect(particle.vy).toBe(3);
    expect(particle.color).toEqual([1, 1, 0, 1]);
    expect(particle.size).toBe(4);
    expect(particle.life).toBe(60);
    expect(particle.maxLife).toBe(60);
    expect(particle.alive).toBe(true);
  });

  it('should update position based on velocity', () => {
    const particle = new Particle(100, 100, 5, -3, [1, 1, 1, 1], 2, 30);

    particle.update();

    expect(particle.x).toBe(105);
    expect(particle.y).toBe(97);
    expect(particle.life).toBe(29);
  });

  it('should apply gravity when specified', () => {
    const particle = new Particle(100, 100, 0, 0, [1, 1, 1, 1], 2, 30, 0.5);

    particle.update();

    expect(particle.vy).toBe(0.5); // Gravity applied
    expect(particle.y).toBe(100.5);
  });

  it('should apply friction when specified', () => {
    const particle = new Particle(100, 100, 10, 10, [1, 1, 1, 1], 2, 30, 0, 0.9);

    particle.update();

    expect(particle.vx).toBe(9); // 10 * 0.9
    expect(particle.vy).toBe(9);
  });

  it('should die when life reaches zero', () => {
    const particle = new Particle(0, 0, 0, 0, [1, 1, 1, 1], 2, 1);

    particle.update();

    expect(particle.life).toBe(0);
    expect(particle.alive).toBe(false);
  });

  it('should calculate alpha based on remaining life', () => {
    const particle = new Particle(0, 0, 0, 0, [1, 1, 0, 1], 2, 100);

    // Full life = full alpha
    expect(particle.getAlpha()).toBe(1);

    // Half life = half alpha
    particle.life = 50;
    expect(particle.getAlpha()).toBe(0.5);

    // Quarter life = quarter alpha
    particle.life = 25;
    expect(particle.getAlpha()).toBe(0.25);
  });

  it('should calculate current size with shrink effect', () => {
    const particle = new Particle(0, 0, 0, 0, [1, 1, 0, 1], 10, 100);
    particle.shrink = true;

    // Full life = full size
    expect(particle.getCurrentSize()).toBe(10);

    // Half life = half size
    particle.life = 50;
    expect(particle.getCurrentSize()).toBe(5);
  });
});

describe('ParticleSystem', () => {
  let system: ParticleSystem;

  beforeEach(() => {
    system = new ParticleSystem(500); // Max 500 particles
  });

  it('should initialize with empty particle pool', () => {
    expect(system.getActiveCount()).toBe(0);
  });

  it('should emit particles at a position', () => {
    const config: ParticleEmitterConfig = {
      count: 10,
      speed: 5,
      speedVariance: 0,
      size: 3,
      sizeVariance: 0,
      life: 30,
      lifeVariance: 0,
      color: [1, 1, 0, 1],
      spread: Math.PI * 2, // Full circle
    };

    system.emit(100, 100, config);

    expect(system.getActiveCount()).toBe(10);
  });

  it('should update all active particles', () => {
    const config: ParticleEmitterConfig = {
      count: 5,
      speed: 10,
      speedVariance: 0,
      size: 2,
      sizeVariance: 0,
      life: 10,
      lifeVariance: 0,
      color: [1, 0, 0, 1],
      spread: 0, // All particles go right
      angle: 0,
    };

    system.emit(0, 0, config);
    system.update();

    // All particles should have moved
    const particles = system.getParticles();
    particles.forEach((p) => {
      if (p.alive) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.life).toBe(9);
      }
    });
  });

  it('should remove dead particles from active pool', () => {
    const config: ParticleEmitterConfig = {
      count: 10,
      speed: 1,
      speedVariance: 0,
      size: 2,
      sizeVariance: 0,
      life: 2, // Very short life
      lifeVariance: 0,
      color: [1, 1, 1, 1],
      spread: Math.PI * 2,
    };

    system.emit(100, 100, config);
    expect(system.getActiveCount()).toBe(10);

    // Update twice to kill all particles
    system.update();
    system.update();

    expect(system.getActiveCount()).toBe(0);
  });

  it('should respect max particle limit', () => {
    const smallSystem = new ParticleSystem(20);

    const config: ParticleEmitterConfig = {
      count: 50, // More than max
      speed: 1,
      speedVariance: 0,
      size: 2,
      sizeVariance: 0,
      life: 100,
      lifeVariance: 0,
      color: [1, 1, 1, 1],
      spread: Math.PI * 2,
    };

    smallSystem.emit(0, 0, config);

    expect(smallSystem.getActiveCount()).toBeLessThanOrEqual(20);
  });

  it('should apply gravity to all particles when specified', () => {
    const config: ParticleEmitterConfig = {
      count: 5,
      speed: 0, // No initial speed
      speedVariance: 0,
      size: 2,
      sizeVariance: 0,
      life: 30,
      lifeVariance: 0,
      color: [1, 1, 1, 1],
      spread: 0,
      gravity: 1,
    };

    system.emit(100, 100, config);
    system.update();

    const particles = system.getParticles().filter((p) => p.alive);
    particles.forEach((p) => {
      expect(p.vy).toBe(1); // Gravity applied
    });
  });

  it('should clear all particles', () => {
    const config: ParticleEmitterConfig = {
      count: 50,
      speed: 1,
      speedVariance: 0,
      size: 2,
      sizeVariance: 0,
      life: 100,
      lifeVariance: 0,
      color: [1, 1, 1, 1],
      spread: Math.PI * 2,
    };

    system.emit(100, 100, config);
    expect(system.getActiveCount()).toBeGreaterThan(0);

    system.clear();
    expect(system.getActiveCount()).toBe(0);
  });
});

describe('EffectPresets', () => {
  it('should have pellet eat effect preset', () => {
    const preset = EffectPresets.PELLET_EAT;

    expect(preset.count).toBeGreaterThan(0);
    expect(preset.count).toBeLessThanOrEqual(12); // Small burst
    expect(preset.life).toBeLessThan(40); // Quick effect
    expect(preset.spread).toBe(Math.PI * 2); // Full circle
  });

  it('should have power pellet eat effect preset', () => {
    const preset = EffectPresets.POWER_PELLET_EAT;

    expect(preset.count).toBeGreaterThan(EffectPresets.PELLET_EAT.count); // Bigger than regular
    expect(preset.size).toBeGreaterThan(EffectPresets.PELLET_EAT.size);
  });

  it('should have ghost eat effect preset', () => {
    const preset = EffectPresets.GHOST_EAT;

    expect(preset.count).toBeGreaterThanOrEqual(20); // Big explosion
    expect(preset.gravity).toBeGreaterThan(0); // Particles fall
  });

  it('should have pacman death effect preset', () => {
    const preset = EffectPresets.PACMAN_DEATH;

    expect(preset.count).toBeGreaterThanOrEqual(30); // Dramatic
    expect(preset.life).toBeGreaterThan(40); // Longer lasting
  });

  it('should have power mode sparkle effect preset', () => {
    const preset = EffectPresets.POWER_MODE_SPARKLE;

    expect(preset.count).toBeLessThanOrEqual(5); // Subtle continuous
    expect(preset.life).toBeLessThan(30); // Short-lived
  });

  it('should have ghost frightened effect preset', () => {
    const preset = EffectPresets.GHOST_FRIGHTENED;

    expect(preset).toBeDefined();
    expect(preset.count).toBeGreaterThan(0);
  });
});

describe('ParticleSystem rendering data', () => {
  let system: ParticleSystem;

  beforeEach(() => {
    system = new ParticleSystem(100);
  });

  it('should generate vertex data for rendering', () => {
    const config: ParticleEmitterConfig = {
      count: 5,
      speed: 0,
      speedVariance: 0,
      size: 4,
      sizeVariance: 0,
      life: 30,
      lifeVariance: 0,
      color: [1, 0, 0, 1],
      spread: 0,
    };

    system.emit(100, 100, config);

    const renderData = system.getRenderData();

    // Each particle is a quad (6 vertices for 2 triangles)
    // 5 particles * 6 vertices * 2 (x,y) = 60 position values
    expect(renderData.positions.length).toBe(60);

    // 5 particles * 6 vertices * 4 (r,g,b,a) = 120 color values
    expect(renderData.colors.length).toBe(120);
  });

  it('should return empty data when no particles', () => {
    const renderData = system.getRenderData();

    expect(renderData.positions.length).toBe(0);
    expect(renderData.colors.length).toBe(0);
  });

  it('should include alpha in color data based on particle life', () => {
    const config: ParticleEmitterConfig = {
      count: 1,
      speed: 0,
      speedVariance: 0,
      size: 4,
      sizeVariance: 0,
      life: 100,
      lifeVariance: 0,
      color: [1, 1, 1, 1],
      spread: 0,
    };

    system.emit(0, 0, config);

    // Get the particle and set its life to 50%
    const particles = system.getParticles();
    particles[0].life = 50;

    const renderData = system.getRenderData();

    // Check alpha value (every 4th value starting at index 3)
    expect(renderData.colors[3]).toBe(0.5); // 50% alpha
  });
});
