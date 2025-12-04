/**
 * Collision Detection System
 *
 * This system handles all collision detection in the game:
 * 1. Pac-Man vs Pellets - Eating regular pellets for points
 * 2. Pac-Man vs Power Pellets - Triggering frightened mode
 * 3. Pac-Man vs Ghosts - Death or eating depending on ghost mode
 * 4. Pac-Man vs Fruit - Bonus points
 *
 * ## Collision Detection Approach
 *
 * We use tile-based collision for efficiency:
 * - Entities are considered to occupy the tile their center is in
 * - Collision occurs when two entities share the same tile
 * - This matches the original game's pixel-grid approach
 *
 * For more precise collision (entity edges), we'd use bounding boxes,
 * but tile-based is more authentic to the original and sufficient
 * for this game's scale.
 *
 * ## Event System
 *
 * Collisions trigger game events that other systems can respond to:
 * - 'pelletEaten' - Update score, check level complete
 * - 'powerPelletEaten' - Start frightened mode
 * - 'ghostEaten' - Update score, show popup
 * - 'pacmanDied' - Lose life, reset positions
 * - 'fruitEaten' - Update score
 *
 * @module Collision
 */

import { TilePosition } from '../types';
import { PacMan } from '../entities/PacMan';
import { Ghost } from '../entities/Ghost';
import {
  SCALED_TILE,
  GhostMode,
  SCORE_PELLET,
  SCORE_POWER_PELLET,
  SCORE_GHOST,
} from '../constants';
import { MAZE_DATA } from '../utils/MazeData';
import { TileType } from '../types';

/**
 * Result of a collision check
 */
export interface CollisionResult {
  /** Type of collision that occurred */
  type: 'none' | 'pellet' | 'powerPellet' | 'ghost' | 'ghostEaten' | 'fruit';

  /** Points awarded for this collision (if any) */
  points: number;

  /** Tile where collision occurred */
  tile?: TilePosition;

  /** Ghost involved in collision (if any) */
  ghost?: Ghost;
}

/**
 * Collision Detection System
 */
export class Collision {
  /** Tracks which pellets have been eaten */
  private pelletGrid: boolean[][];

  /** Total pellets remaining */
  private pelletsRemaining: number = 0;

  /** Counter for ghost eating multiplier */
  private ghostsEatenThisPowerPellet: number = 0;

  /**
   * Initialize the collision system
   */
  constructor() {
    this.pelletGrid = [];
    this.initializePellets();
  }

  /**
   * Initialize the pellet tracking grid
   * Sets up which tiles contain pellets based on maze data
   */
  private initializePellets(): void {
    this.pelletGrid = [];
    this.pelletsRemaining = 0;

    for (let row = 0; row < MAZE_DATA.length; row++) {
      this.pelletGrid[row] = [];
      for (let col = 0; col < MAZE_DATA[row].length; col++) {
        const tile = MAZE_DATA[row][col];
        const hasPellet = tile === TileType.PELLET || tile === TileType.POWER_PELLET;
        this.pelletGrid[row][col] = hasPellet;

        if (hasPellet) {
          this.pelletsRemaining++;
        }
      }
    }
  }

  /**
   * Check all collisions for Pac-Man
   *
   * Checks in order:
   * 1. Pellet collision (most common)
   * 2. Ghost collision (most dangerous)
   *
   * @param pacman - Pac-Man entity
   * @param ghosts - Array of ghost entities
   * @returns Array of collision results (can be multiple per frame)
   */
  checkCollisions(pacman: PacMan, ghosts: Ghost[]): CollisionResult[] {
    const results: CollisionResult[] = [];

    // Check pellet collision
    const pelletResult = this.checkPelletCollision(pacman);
    if (pelletResult.type !== 'none') {
      results.push(pelletResult);
    }

    // Check ghost collisions
    for (const ghost of ghosts) {
      const ghostResult = this.checkGhostCollision(pacman, ghost);
      if (ghostResult.type !== 'none') {
        results.push(ghostResult);
      }
    }

    return results;
  }

  /**
   * Check if Pac-Man is on a pellet tile
   *
   * @param pacman - Pac-Man entity
   * @returns Collision result for pellet (or none)
   */
  checkPelletCollision(pacman: PacMan): CollisionResult {
    const tile = pacman.getTile();

    // Check bounds
    if (tile.row < 0 || tile.row >= this.pelletGrid.length) {
      return { type: 'none', points: 0 };
    }
    if (tile.col < 0 || tile.col >= this.pelletGrid[tile.row].length) {
      return { type: 'none', points: 0 };
    }

    // Check if there's a pellet here
    if (!this.pelletGrid[tile.row][tile.col]) {
      return { type: 'none', points: 0 };
    }

    // Eat the pellet
    this.pelletGrid[tile.row][tile.col] = false;
    this.pelletsRemaining--;

    // Determine pellet type from original maze data
    const originalTile = MAZE_DATA[tile.row][tile.col];
    const isPowerPellet = originalTile === TileType.POWER_PELLET;

    if (isPowerPellet) {
      // Reset ghost eating multiplier
      this.ghostsEatenThisPowerPellet = 0;

      return {
        type: 'powerPellet',
        points: SCORE_POWER_PELLET,
        tile,
      };
    } else {
      return {
        type: 'pellet',
        points: SCORE_PELLET,
        tile,
      };
    }
  }

  /**
   * Check collision between Pac-Man and a ghost
   *
   * Outcomes depend on ghost mode:
   * - FRIGHTENED: Pac-Man eats ghost (points!)
   * - EATEN: No collision (ghost is just eyes)
   * - HOUSE/EXITING: No collision (ghost not in play)
   * - CHASE/SCATTER: Ghost kills Pac-Man
   *
   * @param pacman - Pac-Man entity
   * @param ghost - Ghost entity to check
   * @returns Collision result
   */
  checkGhostCollision(pacman: PacMan, ghost: Ghost): CollisionResult {
    // Skip ghosts that aren't in play
    if (ghost.mode === GhostMode.HOUSE ||
        ghost.mode === GhostMode.EXITING ||
        ghost.mode === GhostMode.EATEN) {
      return { type: 'none', points: 0 };
    }

    // Check if they're on the same tile
    const pacmanTile = pacman.getTile();
    const ghostTile = ghost.getTile();

    if (pacmanTile.col !== ghostTile.col || pacmanTile.row !== ghostTile.row) {
      // Not overlapping - also check with smaller tolerance for more precise collision
      const dx = Math.abs(pacman.position.x - ghost.position.x);
      const dy = Math.abs(pacman.position.y - ghost.position.y);

      // Use half-tile collision radius for more precise feel
      if (dx >= SCALED_TILE * 0.7 || dy >= SCALED_TILE * 0.7) {
        return { type: 'none', points: 0 };
      }
    }

    // Collision detected - what happens?
    if (ghost.mode === GhostMode.FRIGHTENED) {
      // Pac-Man eats the ghost!
      const pointsIndex = Math.min(this.ghostsEatenThisPowerPellet, 3);
      const points = SCORE_GHOST[pointsIndex];
      this.ghostsEatenThisPowerPellet++;

      return {
        type: 'ghostEaten',
        points,
        ghost,
        tile: ghostTile,
      };
    } else {
      // Ghost kills Pac-Man
      return {
        type: 'ghost',
        points: 0,
        ghost,
        tile: ghostTile,
      };
    }
  }

  /**
   * Get remaining pellet count
   */
  getPelletsRemaining(): number {
    return this.pelletsRemaining;
  }

  /**
   * Check if all pellets are eaten (level complete)
   */
  isLevelComplete(): boolean {
    return this.pelletsRemaining === 0;
  }

  /**
   * Reset pellets for a new level
   */
  resetPellets(): void {
    this.initializePellets();
    this.ghostsEatenThisPowerPellet = 0;
  }

  /**
   * Reset ghost eating multiplier (called when frightened mode ends)
   */
  resetGhostMultiplier(): void {
    this.ghostsEatenThisPowerPellet = 0;
  }

  /**
   * Check if a specific tile has a pellet
   */
  hasPellet(col: number, row: number): boolean {
    if (row < 0 || row >= this.pelletGrid.length) return false;
    if (col < 0 || col >= this.pelletGrid[row].length) return false;
    return this.pelletGrid[row][col];
  }

  /**
   * Skip to end of level - clear all pellets except 3 adjacent ones
   * Used for testing/cheat mode
   * @returns The positions of the 3 remaining pellets
   */
  skipToEndOfLevel(): Array<{ col: number; row: number }> {
    // Find all remaining pellets
    const pellets: Array<{ col: number; row: number }> = [];

    for (let row = 0; row < this.pelletGrid.length; row++) {
      for (let col = 0; col < this.pelletGrid[row].length; col++) {
        if (this.pelletGrid[row][col]) {
          pellets.push({ col, row });
        }
      }
    }

    // If 3 or fewer pellets remain, do nothing
    if (pellets.length <= 3) {
      return pellets;
    }

    // Find 3 adjacent pellets (preferably on same row)
    let kept: Array<{ col: number; row: number }> = [];

    // Try to find 3 horizontally adjacent pellets
    for (let row = 0; row < this.pelletGrid.length && kept.length === 0; row++) {
      const rowPellets = pellets.filter(p => p.row === row).sort((a, b) => a.col - b.col);
      for (let i = 0; i < rowPellets.length - 2; i++) {
        if (rowPellets[i + 1].col === rowPellets[i].col + 1 &&
            rowPellets[i + 2].col === rowPellets[i].col + 2) {
          kept = [rowPellets[i], rowPellets[i + 1], rowPellets[i + 2]];
          break;
        }
      }
    }

    // Fallback: just keep first 3 pellets if no adjacent found
    if (kept.length === 0) {
      kept = pellets.slice(0, 3);
    }

    // Clear all pellets except the kept ones
    for (let row = 0; row < this.pelletGrid.length; row++) {
      for (let col = 0; col < this.pelletGrid[row].length; col++) {
        if (this.pelletGrid[row][col]) {
          const isKept = kept.some(p => p.col === col && p.row === row);
          if (!isKept) {
            this.pelletGrid[row][col] = false;
            this.pelletsRemaining--;
          }
        }
      }
    }

    return kept;
  }
}
