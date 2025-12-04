/**
 * Blinky - The Red Ghost ("Shadow")
 *
 * Blinky is the most aggressive ghost. His behavior is simple but effective:
 * he always targets Pac-Man's current tile directly. This means he's constantly
 * chasing, creating pressure from behind.
 *
 * ## Unique Characteristics
 *
 * 1. **Direct Chase**: Always targets Pac-Man's exact position
 * 2. **Starts Outside**: Unlike other ghosts, Blinky starts outside the ghost house
 * 3. **Cruise Elroy Mode**: Gets faster as fewer pellets remain (not yet implemented)
 *
 * ## Cruise Elroy (Future Enhancement)
 *
 * In the original game, when pellets drop below a threshold:
 * - "Elroy 1": Blinky speeds up slightly and ignores scatter mode
 * - "Elroy 2": Even faster when fewer pellets remain
 *
 * This makes late-level gameplay more intense as Blinky becomes relentless.
 *
 * ## Role in Ghost Coordination
 *
 * Blinky's position is used by Inky's targeting calculation. Inky draws a vector
 * from Blinky to 2 tiles ahead of Pac-Man, then doubles it. This creates
 * unpredictable flanking behavior.
 *
 * @extends Ghost
 */

import { Ghost, GhostConfig } from './Ghost';
import { TilePosition } from '../types';
import { PacMan } from './PacMan';
import { Colors, GhostMode, GHOST_SPEED } from '../constants';
import { SCATTER_TARGETS, START_POSITIONS } from '../utils/MazeData';

/**
 * Configuration specific to Blinky
 */
const BLINKY_CONFIG: GhostConfig = {
  name: 'Blinky',
  color: Colors.BLINKY,
  scatterTarget: SCATTER_TARGETS.BLINKY,
  startPosition: START_POSITIONS.BLINKY,
  dotLimit: 0,  // Blinky exits immediately (starts outside house)
};

export class Blinky extends Ghost {
  /** Tracks whether Cruise Elroy mode is active */
  private cruiseElroyLevel: number = 0;

  /**
   * Create Blinky
   *
   * Unlike other ghosts, Blinky:
   * - Starts outside the ghost house
   * - Has no dot limit to exit
   * - Begins moving immediately
   */
  constructor() {
    super(BLINKY_CONFIG);

    // Blinky starts outside the ghost house, ready to chase
    this.isInHouse = false;
    this.mode = GhostMode.SCATTER;
  }

  /**
   * Calculate Blinky's chase target
   *
   * The simplest targeting of all ghosts: aim directly for Pac-Man's current tile.
   * This creates constant pressure, making Blinky feel aggressive and relentless.
   *
   * @param pacman - Reference to Pac-Man entity
   * @returns Pac-Man's current tile position
   */
  calculateChaseTarget(pacman: PacMan): TilePosition {
    // Get Pac-Man's current tile - that's our target
    const pacmanTile = pacman.getTile();

    return {
      col: pacmanTile.col,
      row: pacmanTile.row,
    };
  }

  /**
   * Set Cruise Elroy level based on remaining pellets
   *
   * Elroy levels:
   * - 0: Normal behavior
   * - 1: Faster (~5% speed increase), continues chasing during scatter
   * - 2: Even faster (~10% speed increase)
   *
   * @param level - Elroy level (0, 1, or 2)
   */
  setCruiseElroy(level: number): void {
    const prevLevel = this.cruiseElroyLevel;
    this.cruiseElroyLevel = Math.min(2, Math.max(0, level));

    // Apply speed boost based on level
    if (this.cruiseElroyLevel !== prevLevel) {
      if (this.cruiseElroyLevel === 2) {
        this.speed = GHOST_SPEED * 1.10; // 10% faster
      } else if (this.cruiseElroyLevel === 1) {
        this.speed = GHOST_SPEED * 1.05; // 5% faster
      } else {
        this.speed = GHOST_SPEED;
      }
    }
  }

  /**
   * Check and update Elroy mode based on pellets remaining
   * Called from Game.ts during gameplay
   *
   * Level 1 thresholds (pellets remaining):
   * - Elroy 1: 20 pellets
   * - Elroy 2: 10 pellets
   */
  updateElroyMode(pelletsRemaining: number, level: number): void {
    // Thresholds increase slightly per level
    const elroy1Threshold = 20 + (level - 1) * 2;
    const elroy2Threshold = 10 + (level - 1);

    if (pelletsRemaining <= elroy2Threshold) {
      this.setCruiseElroy(2);
    } else if (pelletsRemaining <= elroy1Threshold) {
      this.setCruiseElroy(1);
    } else {
      this.setCruiseElroy(0);
    }
  }

  /**
   * In Elroy mode, Blinky ignores scatter and keeps chasing
   */
  override setMode(mode: typeof GhostMode[keyof typeof GhostMode], frightenedDuration?: number): void {
    // In Elroy mode, ignore scatter and stay in chase
    if (this.cruiseElroyLevel > 0 && mode === GhostMode.SCATTER) {
      return; // Stay in current mode (chase)
    }
    super.setMode(mode, frightenedDuration);
  }

  /**
   * Get current Cruise Elroy level
   */
  getCruiseElroyLevel(): number {
    return this.cruiseElroyLevel;
  }

  /**
   * Reset Blinky to initial state
   * Overridden because Blinky starts outside the house
   */
  reset(): void {
    super.reset();

    // Blinky-specific: starts outside and active
    this.isInHouse = false;
    this.mode = GhostMode.SCATTER;
    this.cruiseElroyLevel = 0;
  }
}
