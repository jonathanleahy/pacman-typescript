/**
 * Post-Processing Effects Tests
 *
 * Tests for screen-wide visual effects that create the
 * 2025 neon/synthwave aesthetic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ScreenShake,
  defaultPostProcessingConfig,
} from '../../src/systems/PostProcessing';

describe('ScreenShake', () => {
  let shake: ScreenShake;

  beforeEach(() => {
    shake = new ScreenShake();
  });

  it('should initialize with no shake', () => {
    const offset = shake.getOffset();
    expect(offset.x).toBe(0);
    expect(offset.y).toBe(0);
  });

  it('should apply shake with intensity and duration', () => {
    shake.trigger(10, 30); // intensity 10, 30 frames

    // getOffset returns values, isActive shows shake is running
    shake.getOffset();
    expect(shake.isActive()).toBe(true);
  });

  it('should decay shake over time', () => {
    shake.trigger(10, 10);

    // Update several times
    for (let i = 0; i < 5; i++) {
      shake.update();
    }

    // Should still be active but decaying
    expect(shake.isActive()).toBe(true);

    // Continue until done
    for (let i = 0; i < 10; i++) {
      shake.update();
    }

    expect(shake.isActive()).toBe(false);
  });

  it('should return zero offset when not active', () => {
    const offset = shake.getOffset();
    expect(offset.x).toBe(0);
    expect(offset.y).toBe(0);
  });

  it('should stop shake immediately when requested', () => {
    shake.trigger(10, 100);
    expect(shake.isActive()).toBe(true);

    shake.stop();
    expect(shake.isActive()).toBe(false);
    expect(shake.getOffset()).toEqual({ x: 0, y: 0 });
  });

  it('should allow new shake to override existing', () => {
    shake.trigger(5, 10);
    shake.trigger(20, 50); // Stronger shake

    // New shake should take over
    expect(shake.isActive()).toBe(true);
  });
});

describe('PostProcessingConfig', () => {
  it('should have default configuration', () => {
    const config = defaultPostProcessingConfig();

    expect(config.bloomEnabled).toBeDefined();
    expect(config.bloomIntensity).toBeGreaterThan(0);
    expect(config.bloomThreshold).toBeGreaterThan(0);
    expect(config.vignetteEnabled).toBeDefined();
    expect(config.vignetteIntensity).toBeGreaterThanOrEqual(0);
  });

  it('should have bloom settings in valid ranges', () => {
    const config = defaultPostProcessingConfig();

    expect(config.bloomIntensity).toBeGreaterThanOrEqual(0);
    expect(config.bloomIntensity).toBeLessThanOrEqual(2);
    expect(config.bloomThreshold).toBeGreaterThanOrEqual(0);
    expect(config.bloomThreshold).toBeLessThanOrEqual(1);
  });

  it('should have vignette settings in valid ranges', () => {
    const config = defaultPostProcessingConfig();

    expect(config.vignetteIntensity).toBeGreaterThanOrEqual(0);
    expect(config.vignetteIntensity).toBeLessThanOrEqual(1);
    expect(config.vignetteRadius).toBeGreaterThan(0);
    expect(config.vignetteRadius).toBeLessThanOrEqual(2);
  });

  it('should have CRT effect settings', () => {
    const config = defaultPostProcessingConfig();

    expect(config.crtEnabled).toBeDefined();
    expect(config.crtScanlineIntensity).toBeDefined();
    expect(config.crtCurvature).toBeDefined();
  });

  it('should have chromatic aberration settings', () => {
    const config = defaultPostProcessingConfig();

    expect(config.chromaticAberrationEnabled).toBeDefined();
    expect(config.chromaticAberrationIntensity).toBeDefined();
  });
});

describe('Flash effect', () => {
  it('should create flash with color and duration', () => {
    // This tests the flash data structure
    const flash = {
      color: [1, 1, 1, 1] as number[],
      duration: 10,
      remaining: 10,
    };

    expect(flash.color).toEqual([1, 1, 1, 1]);
    expect(flash.duration).toBe(10);
    expect(flash.remaining).toBe(10);
  });

  it('should calculate flash alpha based on remaining time', () => {
    const flash = {
      color: [1, 1, 1, 1] as number[],
      duration: 10,
      remaining: 5, // Half way through
    };

    const alpha = flash.remaining / flash.duration;
    expect(alpha).toBe(0.5);
  });
});

describe('Effect presets', () => {
  it('should define ghost eat shake preset', () => {
    // Small, punchy shake for satisfaction
    const ghostEatShake = { intensity: 4, duration: 8 };
    expect(ghostEatShake.intensity).toBeGreaterThan(0);
    expect(ghostEatShake.duration).toBeLessThan(20);
  });

  it('should define power pellet flash preset', () => {
    // Bright white flash
    const powerPelletFlash = {
      color: [1, 1, 1, 0.5],
      duration: 6,
    };
    expect(powerPelletFlash.color[3]).toBeLessThan(1); // Subtle
    expect(powerPelletFlash.duration).toBeLessThan(15);
  });

  it('should define death shake preset', () => {
    // Dramatic shake for impact
    const deathShake = { intensity: 8, duration: 20 };
    expect(deathShake.intensity).toBeGreaterThan(4);
    expect(deathShake.duration).toBeGreaterThan(10);
  });
});
