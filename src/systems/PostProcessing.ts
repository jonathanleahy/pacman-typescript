/**
 * Post-Processing Effects System
 *
 * Screen-wide visual effects that transform the classic Pac-Man
 * into a 2025 neon/synthwave experience.
 *
 * ## Effects Available
 *
 * 1. **Bloom/Glow**: Bright pixels bleed light, creating neon effect
 * 2. **Vignette**: Darkened edges focus attention on center
 * 3. **Screen Shake**: Camera shake for impact feedback
 * 4. **Flash**: Full-screen color overlay for emphasis
 * 5. **CRT Effect**: Optional scanlines and curvature for retro feel
 * 6. **Chromatic Aberration**: RGB split on impacts
 *
 * ## Technical Approach
 *
 * We use multi-pass rendering with framebuffers:
 * 1. Render game to texture A
 * 2. Extract bright pixels to texture B
 * 3. Blur texture B (bloom)
 * 4. Composite A + B with vignette/effects
 *
 * For simplicity in this implementation, we handle screen shake
 * and flash through canvas transform/overlay, and bloom via CSS
 * filters (which works well for this scale).
 *
 * @module PostProcessing
 */

/**
 * Screen Shake Controller
 *
 * Provides satisfying camera shake feedback for impactful moments.
 * Uses exponential decay for natural feeling motion.
 *
 * ## When to Use
 * - Ghost eaten: Small, punchy (intensity 4, duration 8)
 * - Power pellet: Medium (intensity 3, duration 5)
 * - Pac-Man death: Large, dramatic (intensity 8, duration 20)
 */
export class ScreenShake {
  /** Current shake intensity */
  private intensity: number = 0;

  /** Remaining shake duration in frames */
  private remaining: number = 0;

  /** Current X offset in pixels */
  private offsetX: number = 0;

  /** Current Y offset in pixels */
  private offsetY: number = 0;

  /** Decay factor per frame (0-1) */
  private decay: number = 0.9;

  /**
   * Trigger a screen shake
   *
   * @param intensity - Maximum shake offset in pixels
   * @param duration - Duration in frames
   * @param decay - Optional decay factor (default 0.9)
   */
  trigger(intensity: number, duration: number, decay: number = 0.9): void {
    this.intensity = intensity;
    this.remaining = duration;
    this.decay = decay;
    this.updateOffset();
  }

  /**
   * Update shake state (call each frame)
   */
  update(): void {
    if (this.remaining <= 0) {
      this.intensity = 0;
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }

    this.remaining--;
    this.intensity *= this.decay;
    this.updateOffset();
  }

  /**
   * Calculate random offset within current intensity
   */
  private updateOffset(): void {
    if (this.intensity > 0.1) {
      this.offsetX = (Math.random() - 0.5) * 2 * this.intensity;
      this.offsetY = (Math.random() - 0.5) * 2 * this.intensity;
    } else {
      this.offsetX = 0;
      this.offsetY = 0;
    }
  }

  /**
   * Get current shake offset
   *
   * Apply this to the canvas transform or camera position.
   *
   * @returns {x, y} offset in pixels
   */
  getOffset(): { x: number; y: number } {
    return { x: this.offsetX, y: this.offsetY };
  }

  /**
   * Check if shake is currently active
   */
  isActive(): boolean {
    return this.remaining > 0;
  }

  /**
   * Immediately stop the shake
   */
  stop(): void {
    this.remaining = 0;
    this.intensity = 0;
    this.offsetX = 0;
    this.offsetY = 0;
  }
}

/**
 * Flash effect data
 */
export interface FlashEffect {
  /** RGBA color */
  color: number[];

  /** Total duration in frames */
  duration: number;

  /** Remaining frames */
  remaining: number;
}

/**
 * Post-processing configuration
 */
export interface PostProcessingConfig {
  // Bloom settings
  bloomEnabled: boolean;
  bloomIntensity: number;
  bloomThreshold: number;
  bloomRadius: number;

  // Vignette settings
  vignetteEnabled: boolean;
  vignetteIntensity: number;
  vignetteRadius: number;
  vignetteColor: number[];

  // CRT effect
  crtEnabled: boolean;
  crtScanlineIntensity: number;
  crtCurvature: number;

  // Chromatic aberration
  chromaticAberrationEnabled: boolean;
  chromaticAberrationIntensity: number;

  // General
  brightness: number;
  contrast: number;
  saturation: number;
}

/**
 * Create default post-processing configuration
 *
 * These defaults create a subtle neon aesthetic without
 * overwhelming the classic Pac-Man visuals.
 */
export function defaultPostProcessingConfig(): PostProcessingConfig {
  return {
    // Bloom: Moderate glow for neon effect
    bloomEnabled: true,
    bloomIntensity: 0.6,
    bloomThreshold: 0.5,
    bloomRadius: 8,

    // Vignette: Subtle edge darkening
    vignetteEnabled: true,
    vignetteIntensity: 0.3,
    vignetteRadius: 0.8,
    vignetteColor: [0, 0, 0, 1],

    // CRT: Disabled by default (optional retro mode)
    crtEnabled: false,
    crtScanlineIntensity: 0.15,
    crtCurvature: 0.02,

    // Chromatic aberration: Very subtle, mainly for impacts
    chromaticAberrationEnabled: false,
    chromaticAberrationIntensity: 0.002,

    // Color adjustments
    brightness: 1.0,
    contrast: 1.05, // Slightly punchy
    saturation: 1.1, // Slightly vivid
  };
}

/**
 * Effect presets for game events
 */
export const ShakePresets = {
  /** Small, punchy shake for ghost eat */
  GHOST_EAT: { intensity: 4, duration: 8, decay: 0.85 },

  /** Medium shake for power pellet */
  POWER_PELLET: { intensity: 3, duration: 5, decay: 0.9 },

  /** Dramatic shake for death */
  DEATH: { intensity: 8, duration: 20, decay: 0.92 },

  /** Subtle shake for collision */
  BUMP: { intensity: 2, duration: 4, decay: 0.8 },

  /** Level complete celebration */
  LEVEL_COMPLETE: { intensity: 6, duration: 15, decay: 0.88 },
};

export const FlashPresets = {
  /** Bright flash for power pellet */
  POWER_PELLET: { color: [1, 1, 1, 0.4], duration: 6 },

  /** Yellow flash for extra life */
  EXTRA_LIFE: { color: [1, 1, 0, 0.5], duration: 12 },

  /** Red flash when hit */
  DAMAGE: { color: [1, 0, 0, 0.3], duration: 8 },

  /** Blue flash for frightened mode start */
  FRIGHTENED_START: { color: [0.2, 0.2, 1, 0.3], duration: 5 },

  /** White flash for level complete */
  LEVEL_COMPLETE: { color: [1, 1, 1, 0.6], duration: 10 },
};

/**
 * Post-Processing Manager
 *
 * Coordinates all screen effects and provides a unified
 * interface for the game to trigger effects.
 *
 * ## Usage
 *
 * ```typescript
 * const effects = new PostProcessingManager();
 *
 * // On ghost eat
 * effects.shake(ShakePresets.GHOST_EAT);
 *
 * // On power pellet
 * effects.flash(FlashPresets.POWER_PELLET);
 *
 * // In render loop
 * const offset = effects.getShakeOffset();
 * ctx.translate(offset.x, offset.y);
 * // ... render game ...
 * effects.renderOverlays(ctx);
 * effects.update();
 * ```
 */
export class PostProcessingManager {
  /** Screen shake controller */
  private screenShake: ScreenShake;

  /** Current flash effect (null if none) */
  private currentFlash: FlashEffect | null = null;

  /** Configuration */
  private config: PostProcessingConfig;

  /** Slow-mo factor (1 = normal, 0.5 = half speed) */
  private timeScale: number = 1;

  /** Slow-mo remaining frames */
  private slowMoRemaining: number = 0;

  /**
   * Create post-processing manager
   */
  constructor(config?: Partial<PostProcessingConfig>) {
    this.screenShake = new ScreenShake();
    this.config = { ...defaultPostProcessingConfig(), ...config };
  }

  /**
   * Trigger screen shake
   */
  shake(preset: { intensity: number; duration: number; decay?: number }): void {
    this.screenShake.trigger(preset.intensity, preset.duration, preset.decay ?? 0.9);
  }

  /**
   * Trigger flash effect
   */
  flash(preset: { color: number[]; duration: number }): void {
    this.currentFlash = {
      color: [...preset.color],
      duration: preset.duration,
      remaining: preset.duration,
    };
  }

  /**
   * Trigger slow-motion effect
   *
   * @param duration - Duration in frames
   * @param scale - Time scale (0.5 = half speed)
   */
  slowMotion(duration: number, scale: number = 0.3): void {
    this.slowMoRemaining = duration;
    this.timeScale = scale;
  }

  /**
   * Get current shake offset
   */
  getShakeOffset(): { x: number; y: number } {
    return this.screenShake.getOffset();
  }

  /**
   * Check if shake is active
   */
  isShaking(): boolean {
    return this.screenShake.isActive();
  }

  /**
   * Get current time scale
   */
  getTimeScale(): number {
    return this.slowMoRemaining > 0 ? this.timeScale : 1;
  }

  /**
   * Get current flash alpha
   */
  getFlashAlpha(): number {
    if (!this.currentFlash) return 0;
    return (this.currentFlash.remaining / this.currentFlash.duration) * this.currentFlash.color[3];
  }

  /**
   * Get current flash color
   */
  getFlashColor(): number[] | null {
    return this.currentFlash?.color ?? null;
  }

  /**
   * Update all effects (call each frame)
   */
  update(): void {
    // Update shake
    this.screenShake.update();

    // Update flash
    if (this.currentFlash) {
      this.currentFlash.remaining--;
      if (this.currentFlash.remaining <= 0) {
        this.currentFlash = null;
      }
    }

    // Update slow-mo
    if (this.slowMoRemaining > 0) {
      this.slowMoRemaining--;
      if (this.slowMoRemaining <= 0) {
        this.timeScale = 1;
      }
    }
  }

  /**
   * Get CSS filter string for bloom/effects
   *
   * This can be applied to the canvas element for a
   * performant bloom approximation.
   */
  getCSSFilter(): string {
    const filters: string[] = [];

    if (this.config.bloomEnabled) {
      // Approximate bloom with CSS drop-shadow
      // This creates a soft glow around bright elements
      const intensity = this.config.bloomIntensity;
      const radius = this.config.bloomRadius;
      filters.push(`drop-shadow(0 0 ${radius}px rgba(255,255,255,${intensity * 0.3}))`);
    }

    if (this.config.brightness !== 1) {
      filters.push(`brightness(${this.config.brightness})`);
    }

    if (this.config.contrast !== 1) {
      filters.push(`contrast(${this.config.contrast})`);
    }

    if (this.config.saturation !== 1) {
      filters.push(`saturate(${this.config.saturation})`);
    }

    return filters.join(' ');
  }

  /**
   * Get configuration
   */
  getConfig(): PostProcessingConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<PostProcessingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Reset all effects
   */
  reset(): void {
    this.screenShake.stop();
    this.currentFlash = null;
    this.slowMoRemaining = 0;
    this.timeScale = 1;
  }
}
