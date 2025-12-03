/**
 * Inky - The Cyan Ghost ("Bashful")
 *
 * Inky has the most complex targeting of any ghost. His behavior depends on
 * BOTH Pac-Man's position AND Blinky's position, making him unpredictable.
 *
 * ## Targeting Algorithm
 *
 * 1. Find the tile 2 spaces ahead of Pac-Man (point A)
 * 2. Draw a vector from Blinky's position to point A
 * 3. Double this vector to find the final target
 *
 * ```
 *   [B] ─────────────────────► [A] ─────────────────────► [X]
 *  Blinky                   2 ahead                   Inky's
 *                          of Pac-Man                 target
 *                                                  (vector doubled)
 * ```
 *
 * ## Why This Makes Inky "Bashful"
 *
 * Because the target depends on Blinky's position:
 * - When Blinky is far from Pac-Man, Inky's target is wild
 * - When Blinky is close, Inky's target converges near Pac-Man
 * - Inky appears to "orbit" around the action unpredictably
 *
 * ## Strategic Role
 *
 * Inky creates chaos. Players can't easily predict his path because it
 * changes based on where Blinky is. This forces players to keep track
 * of multiple ghosts simultaneously.
 *
 * @extends Ghost
 */

import { Ghost, GhostConfig } from './Ghost';
import { TilePosition } from '../types';
import { PacMan } from './PacMan';
import { Colors, Direction, DIRECTION_VECTORS, GhostMode } from '../constants';
import { SCATTER_TARGETS, START_POSITIONS } from '../utils/MazeData';

/**
 * Configuration specific to Inky
 */
const INKY_CONFIG: GhostConfig = {
  name: 'Inky',
  color: Colors.INKY,
  scatterTarget: SCATTER_TARGETS.INKY,
  startPosition: START_POSITIONS.INKY,
  dotLimit: 30,  // Inky exits after 30 pellets are eaten
};

export class Inky extends Ghost {
  /**
   * Create Inky
   * Inky starts in the ghost house and exits after some pellets are eaten
   */
  constructor() {
    super(INKY_CONFIG);
  }

  /**
   * Calculate Inky's chase target
   *
   * This is the most complex targeting in the game:
   * 1. Get tile 2 ahead of Pac-Man (including overflow bug when facing UP)
   * 2. Calculate vector from Blinky to this tile
   * 3. Double the vector to get final target
   *
   * If Blinky reference is not available, fall back to Pac-Man's position.
   *
   * @param pacman - Reference to Pac-Man entity
   * @param blinky - Reference to Blinky (required for proper targeting)
   * @returns Calculated target tile
   */
  calculateChaseTarget(pacman: PacMan, blinky?: Ghost): TilePosition {
    const pacmanTile = pacman.getTile();
    const direction = pacman.direction === Direction.NONE ? Direction.RIGHT : pacman.direction;
    const vector = DIRECTION_VECTORS[direction];

    // Step 1: Find tile 2 spaces ahead of Pac-Man
    let aheadCol = pacmanTile.col + vector.x * 2;
    let aheadRow = pacmanTile.row + vector.y * 2;

    // Reproduce overflow bug when Pac-Man faces up (same as Pinky but 2 tiles)
    if (direction === Direction.UP) {
      aheadCol -= 2;
    }

    // Step 2 & 3: If we have Blinky, calculate vector and double it
    if (blinky) {
      const blinkyTile = blinky.getTile();

      // Vector from Blinky to 2-ahead point
      const vectorCol = aheadCol - blinkyTile.col;
      const vectorRow = aheadRow - blinkyTile.row;

      // Double the vector and add to Blinky's position
      // (same as: aheadCol + vectorCol, aheadRow + vectorRow)
      return {
        col: blinkyTile.col + vectorCol * 2,
        row: blinkyTile.row + vectorRow * 2,
      };
    }

    // Fallback if no Blinky reference: just use the ahead tile
    return {
      col: aheadCol,
      row: aheadRow,
    };
  }
}
