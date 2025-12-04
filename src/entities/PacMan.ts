/**
 * Pac-Man Entity
 * The player-controlled character
 */

import { Entity } from './Entity';
import {
  Direction,
  DirectionType,
  DIRECTION_VECTORS,
  SCALED_TILE,
  PACMAN_SPEED,
  PACMAN_EATING_SPEED,
  PACMAN_FRIGHT_SPEED,
  PACMAN_ANIMATION_SPEED,
  DEATH_ANIMATION_FRAMES,
  DEATH_ANIMATION_SPEED,
  Colors,
} from '../constants';
import { START_POSITIONS } from '../utils/MazeData';

export class PacMan extends Entity {
  public lives: number = 3;
  public isEating: boolean = false;
  public isDying: boolean = false;
  public deathAnimationFrame: number = 0;
  public frightenedModeActive: boolean = false;

  /** Victory animation state */
  public isVictory: boolean = false;
  public victoryAnimationFrame: number = 0;
  public victoryRotation: number = 0;
  public victoryJump: number = 0;

  private deathAnimationTimer: number = 0;
  private deathAnimationComplete: boolean = false;
  private victoryAnimationTimer: number = 0;
  private victoryAnimationComplete: boolean = false;
  private corneringBuffer: number = 4; // Pixels of "pre-turn" allowed

  constructor() {
    const startPos = START_POSITIONS.PACMAN;
    super(
      startPos.col * SCALED_TILE + SCALED_TILE / 2,
      startPos.row * SCALED_TILE + SCALED_TILE / 2
    );
    this.speed = PACMAN_SPEED;
    this.animationSpeed = PACMAN_ANIMATION_SPEED;
    this.direction = Direction.NONE;
  }

  /**
   * Set the desired direction (buffered input)
   */
  setDirection(direction: DirectionType): void {
    this.nextDirection = direction;
  }

  /**
   * Update Pac-Man state
   */
  update(_deltaTime: number): void {
    if (this.isDying) {
      this.updateDeathAnimation();
      return;
    }

    if (this.isVictory) {
      this.updateVictoryAnimation();
      return;
    }

    // Update speed based on mode
    this.updateSpeed();

    // Try to change direction if one is queued
    this.tryChangeDirection();

    // Move if we have a direction and can continue
    if (this.direction !== Direction.NONE) {
      this.move();
      this.updateAnimation();
    }

    // Stop at walls
    this.checkWallCollision();
  }

  /**
   * Update movement speed based on current state
   */
  private updateSpeed(): void {
    if (this.frightenedModeActive) {
      this.speed = PACMAN_FRIGHT_SPEED;
    } else if (this.isEating) {
      this.speed = PACMAN_EATING_SPEED;
    } else {
      this.speed = PACMAN_SPEED;
    }
  }

  /**
   * Try to change direction based on queued input
   * Implements "cornering" - Pac-Man can turn slightly early
   */
  private tryChangeDirection(): void {
    if (this.nextDirection === Direction.NONE) return;
    if (this.nextDirection === this.direction) {
      this.nextDirection = Direction.NONE;
      return;
    }

    // Check if we can turn (either at tile center or within cornering buffer)
    const tile = this.getTile();
    const centerX = tile.col * SCALED_TILE + SCALED_TILE / 2;
    const centerY = tile.row * SCALED_TILE + SCALED_TILE / 2;

    const distX = Math.abs(this.position.x - centerX);
    const distY = Math.abs(this.position.y - centerY);

    // Check if the turn is valid
    if (!this.canMove(this.nextDirection)) return;

    // For perpendicular turns, need to be close to center
    const currentVector = DIRECTION_VECTORS[this.direction] || { x: 0, y: 0 };
    const nextVector = DIRECTION_VECTORS[this.nextDirection];

    const isPerpendicular =
      (currentVector.x !== 0 && nextVector.y !== 0) ||
      (currentVector.y !== 0 && nextVector.x !== 0);

    if (isPerpendicular) {
      // For left/right to up/down, check if Y is centered
      if (currentVector.x !== 0 && distY > this.corneringBuffer) return;
      // For up/down to left/right, check if X is centered
      if (currentVector.y !== 0 && distX > this.corneringBuffer) return;
    }

    // Execute the turn
    this.direction = this.nextDirection;
    this.nextDirection = Direction.NONE;

    // Snap to the relevant axis when turning
    if (nextVector.x !== 0) {
      this.position.y = centerY;
    } else if (nextVector.y !== 0) {
      this.position.x = centerX;
    }
  }

  /**
   * Check for wall collision and stop if hitting a wall
   */
  private checkWallCollision(): void {
    if (this.direction === Direction.NONE) return;

    const tile = this.getTile();
    const centerX = tile.col * SCALED_TILE + SCALED_TILE / 2;
    const centerY = tile.row * SCALED_TILE + SCALED_TILE / 2;
    const vector = DIRECTION_VECTORS[this.direction];

    // Check if we're about to enter a wall
    if (!this.canMove(this.direction)) {
      // Stop at tile center
      if (
        (vector.x > 0 && this.position.x >= centerX) ||
        (vector.x < 0 && this.position.x <= centerX) ||
        (vector.y > 0 && this.position.y >= centerY) ||
        (vector.y < 0 && this.position.y <= centerY)
      ) {
        this.position.x = centerX;
        this.position.y = centerY;
        this.direction = Direction.NONE;
      }
    }
  }

  /**
   * Start death animation
   */
  die(): void {
    this.isDying = true;
    this.deathAnimationFrame = 0;
    this.deathAnimationTimer = 0;
    this.deathAnimationComplete = false;
    this.direction = Direction.NONE;
  }

  /**
   * Update death animation
   */
  private updateDeathAnimation(): void {
    this.deathAnimationTimer++;
    if (this.deathAnimationTimer >= DEATH_ANIMATION_SPEED) {
      this.deathAnimationTimer = 0;
      this.deathAnimationFrame++;

      if (this.deathAnimationFrame >= DEATH_ANIMATION_FRAMES) {
        this.deathAnimationComplete = true;
      }
    }
  }

  /**
   * Check if death animation is complete
   */
  isDeathAnimationComplete(): boolean {
    return this.deathAnimationComplete;
  }

  /** Victory scale for pulsing effect */
  public victoryScale: number = 1;

  /**
   * Start victory animation (spin and jump)
   */
  startVictory(): void {
    this.isVictory = true;
    this.victoryAnimationFrame = 0;
    this.victoryAnimationTimer = 0;
    this.victoryAnimationComplete = false;
    this.victoryRotation = 0;
    this.victoryJump = 0;
    this.victoryScale = 1;
  }

  /**
   * Update victory animation - EXCITING version!
   * 3 bouncy jumps, fast spin, size pulse
   */
  updateVictoryAnimation(): void {
    if (!this.isVictory) return;

    this.victoryAnimationTimer++;
    const t = this.victoryAnimationTimer;
    const duration = 120; // 2 seconds of excitement

    if (t <= duration) {
      // FAST spin - 6 full rotations with acceleration then slow down
      const spinProgress = t / duration;
      // Ease out cubic - spins fast at start, slows gracefully at end
      const easedSpin = 1 - Math.pow(1 - spinProgress, 3);
      this.victoryRotation = easedSpin * Math.PI * 12; // 6 full rotations

      // 4 BOUNCY jumps - each bounce smaller than the last
      const bounceFreq = 4; // 4 bounces
      const bounceDecay = 1 - (t / duration) * 0.7; // Bounces decay over time
      const bouncePhase = (t / duration) * bounceFreq * Math.PI;
      this.victoryJump = Math.abs(Math.sin(bouncePhase)) * 35 * bounceDecay;

      // SIZE PULSE - grows big then back to normal
      const pulseFreq = 6; // 6 pulses
      const pulseAmount = Math.sin((t / duration) * pulseFreq * Math.PI * 2) * 0.35;
      this.victoryScale = 1 + Math.abs(pulseAmount) * bounceDecay;

    } else {
      this.victoryAnimationComplete = true;
      this.victoryScale = 1;
    }

    this.victoryAnimationFrame = this.victoryAnimationTimer;
  }

  /**
   * Check if victory animation is complete
   */
  isVictoryAnimationComplete(): boolean {
    return this.victoryAnimationComplete;
  }

  /**
   * Render Pac-Man
   */
  render(ctx: CanvasRenderingContext2D): void {
    const x = this.position.x;
    const y = this.position.y;
    const radius = SCALED_TILE / 2 - 1;

    ctx.fillStyle = Colors.PACMAN;
    ctx.beginPath();

    if (this.isDying) {
      // Death animation - shrinking Pac-Man
      const progress = this.deathAnimationFrame / DEATH_ANIMATION_FRAMES;
      const startAngle = Math.PI * 0.5 + Math.PI * progress;
      const endAngle = Math.PI * 2.5 - Math.PI * progress;

      if (progress < 1) {
        ctx.arc(x, y, radius, startAngle, endAngle);
        ctx.lineTo(x, y);
      }
    } else {
      // Normal animation
      const mouthOpenings = [0, 0.15, 0.35, 0.15];
      const mouthAngle = Math.PI * mouthOpenings[this.animationFrame % 4];

      let startAngle: number;
      let endAngle: number;
      const dir = this.direction === Direction.NONE ? Direction.RIGHT : this.direction;

      switch (dir) {
        case Direction.RIGHT:
          startAngle = mouthAngle;
          endAngle = Math.PI * 2 - mouthAngle;
          break;
        case Direction.LEFT:
          startAngle = Math.PI + mouthAngle;
          endAngle = Math.PI - mouthAngle;
          break;
        case Direction.UP:
          startAngle = -Math.PI / 2 + mouthAngle;
          endAngle = -Math.PI / 2 - mouthAngle + Math.PI * 2;
          break;
        case Direction.DOWN:
          startAngle = Math.PI / 2 + mouthAngle;
          endAngle = Math.PI / 2 - mouthAngle + Math.PI * 2;
          break;
        default:
          startAngle = mouthAngle;
          endAngle = Math.PI * 2 - mouthAngle;
      }

      ctx.arc(x, y, radius, startAngle, endAngle);
      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fill();
  }

  /**
   * Reset Pac-Man to starting position
   */
  reset(): void {
    const startPos = START_POSITIONS.PACMAN;
    this.position.x = startPos.col * SCALED_TILE + SCALED_TILE / 2;
    this.position.y = startPos.row * SCALED_TILE + SCALED_TILE / 2;
    this.direction = Direction.NONE;
    this.nextDirection = Direction.NONE;
    this.speed = PACMAN_SPEED;
    this.isDying = false;
    this.isEating = false;
    this.deathAnimationFrame = 0;
    this.deathAnimationTimer = 0;
    this.deathAnimationComplete = false;
    this.resetAnimation();
  }

  /**
   * Full reset including lives
   */
  fullReset(): void {
    this.reset();
    this.lives = 3;
  }
}
