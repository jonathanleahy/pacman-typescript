/**
 * Pinky - The Pink Ghost ("Speedy")
 *
 * Pinky is the ambusher. Rather than chasing Pac-Man directly like Blinky,
 * Pinky targets the tile 4 spaces AHEAD of where Pac-Man is heading.
 * This creates pincer attacks when combined with Blinky's direct pursuit.
 *
 * ## Targeting Logic
 *
 * ```
 *   Pac-Man facing RIGHT:
 *
 *   [ ][ ][ ][ ][P]→[ ][ ][ ][X][ ]
 *                               ↑
 *                         Pinky's target
 *                         (4 tiles ahead)
 * ```
 *
 * ## The "Overflow Bug"
 *
 * In the original game, when Pac-Man faces UP, Pinky's target calculation
 * has a bug that also shifts 4 tiles to the LEFT. This was due to an
 * assembly language oversight but became part of the game's character.
 *
 * We reproduce this bug for authenticity.
 *
 * ## Strategic Role
 *
 * While Blinky pressures from behind, Pinky cuts off escape routes ahead.
 * Together, they create a "squeeze" that traps careless players.
 *
 * @extends Ghost
 */

import { Ghost, GhostConfig } from './Ghost';
import { TilePosition } from '../types';
import { PacMan } from './PacMan';
import { Colors, Direction, DIRECTION_VECTORS, GhostMode } from '../constants';
import { SCATTER_TARGETS, START_POSITIONS } from '../utils/MazeData';

/**
 * Configuration specific to Pinky
 */
const PINKY_CONFIG: GhostConfig = {
  name: 'Pinky',
  color: Colors.PINKY,
  scatterTarget: SCATTER_TARGETS.PINKY,
  startPosition: START_POSITIONS.PINKY,
  dotLimit: 0,  // Pinky exits after 0 pellets (very early)
};

export class Pinky extends Ghost {
  /**
   * Create Pinky
   * Pinky starts in the ghost house but exits very quickly
   */
  constructor() {
    super(PINKY_CONFIG);
  }

  /**
   * Calculate Pinky's chase target
   *
   * Target is 4 tiles ahead of Pac-Man's current position and direction.
   *
   * Special case (overflow bug): When Pac-Man faces UP, the target is
   * also shifted 4 tiles LEFT. This replicates the original game's
   * assembly language bug.
   *
   * @param pacman - Reference to Pac-Man entity
   * @returns Tile 4 spaces ahead of Pac-Man (with possible left offset)
   */
  calculateChaseTarget(pacman: PacMan): TilePosition {
    const pacmanTile = pacman.getTile();
    const direction = pacman.direction === Direction.NONE ? Direction.RIGHT : pacman.direction;
    const vector = DIRECTION_VECTORS[direction];

    // Calculate position 4 tiles ahead
    let targetCol = pacmanTile.col + vector.x * 4;
    let targetRow = pacmanTile.row + vector.y * 4;

    // Reproduce the original "overflow bug" when Pac-Man faces up
    // The original Z80 assembly used a single instruction that added
    // to both X and Y components, causing a 4-tile left shift when moving up
    if (direction === Direction.UP) {
      targetCol -= 4;
    }

    return {
      col: targetCol,
      row: targetRow,
    };
  }
}
