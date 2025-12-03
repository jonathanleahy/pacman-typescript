/**
 * Clyde - The Orange Ghost ("Pokey")
 *
 * Clyde is the "shy" ghost with split-personality behavior:
 * - When FAR from Pac-Man (>8 tiles): Chase like Blinky
 * - When CLOSE to Pac-Man (≤8 tiles): Retreat to home corner
 *
 * ## Targeting Logic
 *
 * ```
 *   Distance > 8 tiles:          Distance ≤ 8 tiles:
 *
 *   [P] ← Target                 [P]
 *    ↑                            │
 *   [C] Clyde chases             [C] Clyde retreats
 *                                  ↓
 *                            [Home Corner]
 * ```
 *
 * ## Why "Pokey"?
 *
 * Clyde's behavior makes him seem indecisive or cowardly:
 * - He approaches, then backs off
 * - He never quite commits to the chase
 * - He spends a lot of time in his corner
 *
 * ## Strategic Role
 *
 * Clyde creates uncertainty. Players can't rely on him staying away
 * (he might chase) or committing to an attack (he might flee).
 * He often ends up blocking escape routes by accident.
 *
 * The "8 tile" threshold creates a donut-shaped danger zone around
 * Pac-Man where Clyde oscillates unpredictably.
 *
 * @extends Ghost
 */

import { Ghost, GhostConfig } from './Ghost';
import { TilePosition } from '../types';
import { PacMan } from './PacMan';
import { Colors } from '../constants';
import { SCATTER_TARGETS, START_POSITIONS } from '../utils/MazeData';

/**
 * Configuration specific to Clyde
 */
const CLYDE_CONFIG: GhostConfig = {
  name: 'Clyde',
  color: Colors.CLYDE,
  scatterTarget: SCATTER_TARGETS.CLYDE,
  startPosition: START_POSITIONS.CLYDE,
  dotLimit: 60,  // Clyde exits after 60 pellets (last to leave)
};

/**
 * Distance threshold in tiles for behavior switch
 * At or below this distance, Clyde retreats to his corner
 */
const RETREAT_DISTANCE = 8;

export class Clyde extends Ghost {
  /**
   * Create Clyde
   * Clyde starts in the ghost house and is the last ghost to exit
   */
  constructor() {
    super(CLYDE_CONFIG);
  }

  /**
   * Calculate Clyde's chase target
   *
   * Behavior depends on distance to Pac-Man:
   * - Far away (>8 tiles): Target Pac-Man directly (like Blinky)
   * - Close (≤8 tiles): Target home corner (retreat)
   *
   * This creates oscillating behavior as Clyde approaches and retreats.
   *
   * @param pacman - Reference to Pac-Man entity
   * @returns Target tile (either Pac-Man or home corner)
   */
  calculateChaseTarget(pacman: PacMan): TilePosition {
    const pacmanTile = pacman.getTile();
    const clydeTile = this.getTile();

    // Calculate Euclidean distance in tiles
    const dx = pacmanTile.col - clydeTile.col;
    const dy = pacmanTile.row - clydeTile.row;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Decision point: chase or retreat?
    if (distance > RETREAT_DISTANCE) {
      // Far from Pac-Man: chase directly (like Blinky)
      return {
        col: pacmanTile.col,
        row: pacmanTile.row,
      };
    } else {
      // Close to Pac-Man: retreat to home corner
      return this.scatterTarget;
    }
  }
}
