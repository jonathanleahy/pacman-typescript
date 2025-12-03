/**
 * Particle System - 2025 Visual Effects
 *
 * GPU-accelerated particle effects that bring modern visual polish
 * to our classic Pac-Man while respecting the original aesthetic.
 *
 * ## Design Philosophy
 *
 * Particles should ENHANCE, not overwhelm. Every effect serves a purpose:
 * - Pellet eat: Quick feedback, "you did something"
 * - Power pellet: BIG feedback, "something important happened"
 * - Ghost eat: Satisfying explosion, "victory moment"
 * - Death: Dramatic dispersal, "loss feels meaningful"
 *
 * ## Technical Approach
 *
 * We use object pooling to avoid GC pressure. Particles are pre-allocated
 * and recycled rather than created/destroyed constantly.
 *
 * Rendering uses the same batched WebGL approach as the main renderer,
 * allowing particles to be drawn efficiently in a single draw call.
 *
 * @module ParticleSystem
 */

/**
 * Individual particle with physics properties
 *
 * Each particle has position, velocity, color, size, and lifetime.
 * Optional gravity and friction allow for varied behaviors.
 */
export class Particle {
  /** X position in pixels */
  x: number;

  /** Y position in pixels */
  y: number;

  /** X velocity (pixels per frame) */
  vx: number;

  /** Y velocity (pixels per frame) */
  vy: number;

  /** RGBA color (0-1 range) */
  color: number[];

  /** Size in pixels */
  size: number;

  /** Remaining lifetime in frames */
  life: number;

  /** Initial lifetime (for alpha calculation) */
  maxLife: number;

  /** Gravity acceleration (pixels per frame^2) */
  gravity: number;

  /** Velocity damping factor (0-1, applied each frame) */
  friction: number;

  /** Is this particle still active? */
  alive: boolean;

  /** Should particle shrink over time? */
  shrink: boolean;

  /** Rotation angle (radians) - for future sprite particles */
  rotation: number;

  /** Angular velocity (radians per frame) */
  rotationSpeed: number;

  /**
   * Create a new particle
   *
   * @param x - Initial X position
   * @param y - Initial Y position
   * @param vx - Initial X velocity
   * @param vy - Initial Y velocity
   * @param color - RGBA color array [r, g, b, a] (0-1 range)
   * @param size - Particle size in pixels
   * @param life - Lifetime in frames
   * @param gravity - Gravity acceleration (default 0)
   * @param friction - Velocity damping (default 1 = no damping)
   */
  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: number[],
    size: number,
    life: number,
    gravity: number = 0,
    friction: number = 1
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = [...color]; // Clone to avoid mutation
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.gravity = gravity;
    this.friction = friction;
    this.alive = true;
    this.shrink = false;
    this.rotation = 0;
    this.rotationSpeed = 0;
  }

  /**
   * Update particle physics
   *
   * Applies velocity, gravity, friction, and decrements life.
   * Marks particle as dead when life reaches zero.
   */
  update(): void {
    if (!this.alive) return;

    // Apply gravity to vertical velocity
    this.vy += this.gravity;

    // Apply friction to both velocities
    this.vx *= this.friction;
    this.vy *= this.friction;

    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Update rotation
    this.rotation += this.rotationSpeed;

    // Decrement life
    this.life--;

    // Check for death
    if (this.life <= 0) {
      this.alive = false;
    }
  }

  /**
   * Get current alpha based on remaining life
   *
   * Particles fade out as they die, creating smooth disappearance.
   *
   * @returns Alpha value 0-1
   */
  getAlpha(): number {
    return Math.max(0, this.life / this.maxLife);
  }

  /**
   * Get current size (may shrink over time)
   *
   * @returns Current size in pixels
   */
  getCurrentSize(): number {
    if (this.shrink) {
      return this.size * this.getAlpha();
    }
    return this.size;
  }

  /**
   * Reset particle for reuse from pool
   *
   * @param x - New X position
   * @param y - New Y position
   * @param vx - New X velocity
   * @param vy - New Y velocity
   * @param color - New color
   * @param size - New size
   * @param life - New lifetime
   * @param gravity - New gravity
   * @param friction - New friction
   */
  reset(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: number[],
    size: number,
    life: number,
    gravity: number = 0,
    friction: number = 1
  ): void {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = [...color];
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.gravity = gravity;
    this.friction = friction;
    this.alive = true;
    this.shrink = false;
    this.rotation = 0;
    this.rotationSpeed = 0;
  }
}

/**
 * Configuration for particle emitters
 *
 * Defines how particles are spawned: count, speed, spread pattern,
 * colors, sizes, and physics properties.
 */
export interface ParticleEmitterConfig {
  /** Number of particles to emit */
  count: number;

  /** Base speed (pixels per frame) */
  speed: number;

  /** Speed variance (+/- this amount) */
  speedVariance: number;

  /** Base size in pixels */
  size: number;

  /** Size variance */
  sizeVariance: number;

  /** Base lifetime in frames */
  life: number;

  /** Life variance */
  lifeVariance: number;

  /** Base color [r, g, b, a] */
  color: number[];

  /** Color variance (applied to RGB) */
  colorVariance?: number[];

  /** Emission spread angle in radians (Math.PI * 2 = full circle) */
  spread: number;

  /** Base emission angle in radians (0 = right) */
  angle?: number;

  /** Gravity applied to particles */
  gravity?: number;

  /** Friction applied to particles */
  friction?: number;

  /** Should particles shrink over time? */
  shrink?: boolean;

  /** Should particles glow? (for future bloom integration) */
  glow?: boolean;
}

/**
 * Render data structure for WebGL integration
 */
export interface ParticleRenderData {
  /** Vertex positions (x, y pairs) */
  positions: number[];

  /** Vertex colors (r, g, b, a quads) */
  colors: number[];

  /** Vertex count for draw call */
  vertexCount: number;
}

/**
 * Particle System Manager
 *
 * Manages a pool of particles and provides emission, update, and
 * render data generation functionality.
 *
 * ## Object Pooling
 *
 * Rather than creating/destroying particles (which causes GC pressure),
 * we maintain a fixed pool. Dead particles are marked and recycled.
 *
 * ## Usage Example
 *
 * ```typescript
 * const particles = new ParticleSystem(1000);
 *
 * // Emit burst when pellet eaten
 * particles.emit(pelletX, pelletY, EffectPresets.PELLET_EAT);
 *
 * // In game loop
 * particles.update();
 * const renderData = particles.getRenderData();
 * // Pass renderData to WebGL renderer
 * ```
 */
export class ParticleSystem {
  /** Particle pool */
  private particles: Particle[] = [];

  /** Maximum particles (pool size) */
  private maxParticles: number;

  /** Index of next free particle in pool */
  private nextFree: number = 0;

  /**
   * Create a new particle system
   *
   * @param maxParticles - Maximum concurrent particles (pool size)
   */
  constructor(maxParticles: number = 1000) {
    this.maxParticles = maxParticles;

    // Pre-allocate particle pool
    for (let i = 0; i < maxParticles; i++) {
      this.particles.push(new Particle(0, 0, 0, 0, [0, 0, 0, 0], 0, 0));
      this.particles[i].alive = false;
    }
  }

  /**
   * Get a particle from the pool
   *
   * Finds a dead particle to recycle, or returns null if pool is full.
   *
   * @returns Available particle or null
   */
  private getParticleFromPool(): Particle | null {
    // Start from next free index and wrap around
    for (let i = 0; i < this.maxParticles; i++) {
      const index = (this.nextFree + i) % this.maxParticles;
      if (!this.particles[index].alive) {
        this.nextFree = (index + 1) % this.maxParticles;
        return this.particles[index];
      }
    }
    return null; // Pool exhausted
  }

  /**
   * Emit particles at a position
   *
   * Creates particles according to the emitter configuration.
   * Particles are spawned from the pool if available.
   *
   * @param x - Emission X position
   * @param y - Emission Y position
   * @param config - Emitter configuration
   */
  emit(x: number, y: number, config: ParticleEmitterConfig): void {
    const baseAngle = config.angle ?? 0;

    for (let i = 0; i < config.count; i++) {
      const particle = this.getParticleFromPool();
      if (!particle) break; // Pool exhausted

      // Calculate emission angle with spread
      const angle = baseAngle + (Math.random() - 0.5) * config.spread;

      // Calculate speed with variance
      const speed =
        config.speed + (Math.random() - 0.5) * 2 * config.speedVariance;

      // Calculate velocity from angle and speed
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      // Calculate size with variance
      const size =
        config.size + (Math.random() - 0.5) * 2 * config.sizeVariance;

      // Calculate life with variance
      const life =
        config.life + (Math.random() - 0.5) * 2 * config.lifeVariance;

      // Calculate color with variance
      const color = [...config.color];
      if (config.colorVariance) {
        for (let c = 0; c < 3; c++) {
          color[c] = Math.max(
            0,
            Math.min(1, color[c] + (Math.random() - 0.5) * 2 * config.colorVariance[c])
          );
        }
      }

      // Reset particle with new values
      particle.reset(
        x,
        y,
        vx,
        vy,
        color,
        Math.max(1, size),
        Math.max(1, Math.round(life)),
        config.gravity ?? 0,
        config.friction ?? 1
      );

      // Apply optional properties
      particle.shrink = config.shrink ?? false;
    }
  }

  /**
   * Update all active particles
   *
   * Applies physics to each alive particle.
   */
  update(): void {
    for (const particle of this.particles) {
      if (particle.alive) {
        particle.update();
      }
    }
  }

  /**
   * Get count of active particles
   *
   * @returns Number of alive particles
   */
  getActiveCount(): number {
    return this.particles.filter((p) => p.alive).length;
  }

  /**
   * Get all particles (for testing/debugging)
   *
   * @returns Particle array
   */
  getParticles(): Particle[] {
    return this.particles;
  }

  /**
   * Clear all particles
   *
   * Marks all particles as dead for immediate cleanup.
   */
  clear(): void {
    for (const particle of this.particles) {
      particle.alive = false;
    }
  }

  /**
   * Generate render data for WebGL
   *
   * Creates vertex arrays for drawing all active particles.
   * Each particle becomes a quad (2 triangles, 6 vertices).
   *
   * @returns Positions and colors arrays for WebGL
   */
  getRenderData(): ParticleRenderData {
    const positions: number[] = [];
    const colors: number[] = [];

    for (const particle of this.particles) {
      if (!particle.alive) continue;

      const x = particle.x;
      const y = particle.y;
      const halfSize = particle.getCurrentSize() / 2;
      const alpha = particle.getAlpha();

      // Create color with faded alpha
      const r = particle.color[0];
      const g = particle.color[1];
      const b = particle.color[2];
      const a = particle.color[3] * alpha;

      // Quad corners
      const left = x - halfSize;
      const right = x + halfSize;
      const top = y - halfSize;
      const bottom = y + halfSize;

      // Two triangles (6 vertices) for the quad
      // Triangle 1: top-left, top-right, bottom-left
      positions.push(left, top, right, top, left, bottom);
      // Triangle 2: bottom-left, top-right, bottom-right
      positions.push(left, bottom, right, top, right, bottom);

      // Same color for all 6 vertices
      for (let i = 0; i < 6; i++) {
        colors.push(r, g, b, a);
      }
    }

    return {
      positions,
      colors,
      vertexCount: positions.length / 2,
    };
  }
}

/**
 * Pre-configured effect presets
 *
 * These presets define the visual style for various game events.
 * Each is tuned to feel satisfying while not overwhelming the
 * classic Pac-Man aesthetic.
 */
export const EffectPresets: Record<string, ParticleEmitterConfig> = {
  /**
   * Small burst when eating a regular pellet
   * Quick, subtle, acknowledges the action
   */
  PELLET_EAT: {
    count: 8,
    speed: 2,
    speedVariance: 1,
    size: 2,
    sizeVariance: 1,
    life: 20,
    lifeVariance: 5,
    color: [1, 0.72, 0.59, 1], // Pellet color (#FFB897)
    spread: Math.PI * 2,
    friction: 0.95,
    shrink: true,
  },

  /**
   * Large burst when eating a power pellet
   * Big, dramatic, signals importance
   */
  POWER_PELLET_EAT: {
    count: 24,
    speed: 4,
    speedVariance: 2,
    size: 4,
    sizeVariance: 2,
    life: 35,
    lifeVariance: 10,
    color: [1, 1, 1, 1], // White/bright
    colorVariance: [0.2, 0.2, 0.2],
    spread: Math.PI * 2,
    friction: 0.92,
    shrink: true,
    glow: true,
  },

  /**
   * Explosion when eating a ghost
   * Satisfying, colorful, victory moment
   */
  GHOST_EAT: {
    count: 30,
    speed: 5,
    speedVariance: 2,
    size: 4,
    sizeVariance: 2,
    life: 40,
    lifeVariance: 10,
    color: [0, 1, 1, 1], // Cyan (will be overridden with ghost color)
    spread: Math.PI * 2,
    gravity: 0.15,
    friction: 0.97,
    shrink: true,
  },

  /**
   * Dramatic dispersal when Pac-Man dies
   * Long-lasting, impactful, loss feels meaningful
   */
  PACMAN_DEATH: {
    count: 50,
    speed: 4,
    speedVariance: 3,
    size: 5,
    sizeVariance: 2,
    life: 60,
    lifeVariance: 20,
    color: [1, 1, 0, 1], // Yellow
    spread: Math.PI * 2,
    gravity: 0.1,
    friction: 0.98,
    shrink: true,
  },

  /**
   * Continuous sparkles during power mode
   * Subtle, atmospheric, signals empowerment
   */
  POWER_MODE_SPARKLE: {
    count: 3,
    speed: 1,
    speedVariance: 0.5,
    size: 2,
    sizeVariance: 1,
    life: 20,
    lifeVariance: 5,
    color: [1, 1, 1, 0.8], // White, slightly transparent
    spread: Math.PI * 2,
    friction: 0.9,
    shrink: true,
    glow: true,
  },

  /**
   * Blue shimmer on frightened ghosts
   */
  GHOST_FRIGHTENED: {
    count: 5,
    speed: 0.5,
    speedVariance: 0.3,
    size: 2,
    sizeVariance: 1,
    life: 15,
    lifeVariance: 5,
    color: [0.13, 0.13, 0.87, 0.6], // Frightened blue
    spread: Math.PI * 2,
    friction: 0.85,
    shrink: true,
  },

  /**
   * Trail particles when moving fast
   */
  MOTION_TRAIL: {
    count: 1,
    speed: 0,
    speedVariance: 0,
    size: 6,
    sizeVariance: 0,
    life: 10,
    lifeVariance: 2,
    color: [1, 1, 0, 0.4], // Yellow, transparent
    spread: 0,
    shrink: true,
  },

  /**
   * Level complete celebration
   */
  LEVEL_COMPLETE: {
    count: 100,
    speed: 6,
    speedVariance: 3,
    size: 4,
    sizeVariance: 2,
    life: 80,
    lifeVariance: 30,
    color: [1, 1, 1, 1],
    colorVariance: [0.5, 0.5, 0.5],
    spread: Math.PI * 2,
    gravity: 0.05,
    friction: 0.99,
    shrink: true,
    glow: true,
  },
};
