/**
 * Base Entity Class
 * Common functionality for all game entities (Pac-Man, ghosts)
 */

import { Position, TilePosition } from '../types';
import {
  Direction,
  DirectionType,
  DIRECTION_VECTORS,
  SCALED_TILE,
  GRID_WIDTH,
} from '../constants';
import { MAZE_DATA, isWalkable } from '../utils/MazeData';

export abstract class Entity {
  public position: Position;
  public direction: DirectionType = Direction.NONE;
  public nextDirection: DirectionType = Direction.NONE;
  public speed: number = 0;
  protected animationFrame: number = 0;
  protected animationTimer: number = 0;
  protected animationSpeed: number = 3;

  constructor(x: number, y: number) {
    this.position = { x, y };
  }

  /**
   * Get current tile position
   */
  getTile(): TilePosition {
    return {
      col: Math.floor(this.position.x / SCALED_TILE),
      row: Math.floor(this.position.y / SCALED_TILE),
    };
  }

  /**
   * Get tile position with rounding for better precision
   */
  getTileRounded(): TilePosition {
    return {
      col: Math.round(this.position.x / SCALED_TILE - 0.5),
      row: Math.round(this.position.y / SCALED_TILE - 0.5),
    };
  }

  /**
   * Check if entity is centered on a tile (or close to it)
   */
  isAtTileCenter(threshold: number = 2): boolean {
    const tile = this.getTile();
    const centerX = tile.col * SCALED_TILE + SCALED_TILE / 2;
    const centerY = tile.row * SCALED_TILE + SCALED_TILE / 2;

    return (
      Math.abs(this.position.x - centerX) < threshold &&
      Math.abs(this.position.y - centerY) < threshold
    );
  }

  /**
   * Snap to tile center
   */
  snapToTileCenter(): void {
    const tile = this.getTile();
    this.position.x = tile.col * SCALED_TILE + SCALED_TILE / 2;
    this.position.y = tile.row * SCALED_TILE + SCALED_TILE / 2;
  }

  /**
   * Check if a direction is valid from current position
   */
  canMove(direction: DirectionType): boolean {
    if (direction === Direction.NONE) return false;

    const tile = this.getTile();
    const vector = DIRECTION_VECTORS[direction];

    // Check the next tile in that direction
    let nextCol = tile.col + vector.x;
    const nextRow = tile.row + vector.y;

    // Handle tunnel wrapping
    if (nextCol < 0) nextCol = GRID_WIDTH - 1;
    if (nextCol >= GRID_WIDTH) nextCol = 0;

    return isWalkable(MAZE_DATA, nextCol, nextRow);
  }

  /**
   * Move entity based on current direction
   */
  move(): void {
    if (this.direction === Direction.NONE) return;

    const vector = DIRECTION_VECTORS[this.direction];
    this.position.x += vector.x * this.speed;
    this.position.y += vector.y * this.speed;

    // Handle tunnel wrapping
    const tunnelY = 13 * SCALED_TILE + SCALED_TILE / 2;
    if (Math.abs(this.position.y - tunnelY) < SCALED_TILE / 2) {
      if (this.position.x < -SCALED_TILE / 2) {
        this.position.x = GRID_WIDTH * SCALED_TILE + SCALED_TILE / 2;
      } else if (this.position.x > GRID_WIDTH * SCALED_TILE + SCALED_TILE / 2) {
        this.position.x = -SCALED_TILE / 2;
      }
    }
  }

  /**
   * Update animation frame
   */
  updateAnimation(): void {
    this.animationTimer++;
    if (this.animationTimer >= this.animationSpeed) {
      this.animationTimer = 0;
      this.animationFrame = (this.animationFrame + 1) % 4;
    }
  }

  /**
   * Get current animation frame
   */
  getAnimationFrame(): number {
    return this.animationFrame;
  }

  /**
   * Reset animation state
   */
  resetAnimation(): void {
    this.animationFrame = 0;
    this.animationTimer = 0;
  }

  /**
   * Set position from tile coordinates
   */
  setTilePosition(col: number, row: number): void {
    this.position.x = col * SCALED_TILE + SCALED_TILE / 2;
    this.position.y = row * SCALED_TILE + SCALED_TILE / 2;
  }

  /**
   * Abstract update method - implemented by subclasses
   */
  abstract update(deltaTime: number): void;

  /**
   * Abstract render method - implemented by subclasses
   */
  abstract render(ctx: CanvasRenderingContext2D): void;

  /**
   * Abstract reset method - implemented by subclasses
   */
  abstract reset(): void;
}
