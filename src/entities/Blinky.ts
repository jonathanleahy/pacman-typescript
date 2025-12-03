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
import { Colors, SCALED_TILE, GhostMode } from '../constants';
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
   * - 1: Faster, continues chasing during scatter
   * - 2: Even faster
   *
   * @param level - Elroy level (0, 1, or 2)
   */
  setCruiseElroy(level: number): void {
    this.cruiseElroyLevel = Math.min(2, Math.max(0, level));

    // TODO: Implement speed boost based on level
    // Level 1: ~5% speed increase
    // Level 2: ~10% speed increase
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
