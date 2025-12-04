/**
 * Fruit Entity
 *
 * Bonus items that appear twice per level:
 * - First at 70 pellets eaten
 * - Second at 170 pellets eaten
 *
 * Each level has a different fruit type worth different points.
 */

import { SCALED_TILE } from '../constants';
import { Position } from '../types';

/**
 * Fruit types matching original Pac-Man
 */
export const FruitType = {
  CHERRY: 0,
  STRAWBERRY: 1,
  ORANGE: 2,
  APPLE: 3,
  MELON: 4,
  GALAXIAN: 5,
  BELL: 6,
  KEY: 7,
} as const;

export type FruitTypeValue = typeof FruitType[keyof typeof FruitType];

/**
 * Points awarded for each fruit type
 */
const FRUIT_POINTS: Record<FruitTypeValue, number> = {
  [FruitType.CHERRY]: 100,
  [FruitType.STRAWBERRY]: 300,
  [FruitType.ORANGE]: 500,
  [FruitType.APPLE]: 700,
  [FruitType.MELON]: 1000,
  [FruitType.GALAXIAN]: 2000,
  [FruitType.BELL]: 3000,
  [FruitType.KEY]: 5000,
};

/**
 * Fruit colors for rendering
 */
export const FRUIT_COLORS: Record<FruitTypeValue, string> = {
  [FruitType.CHERRY]: '#ff0000',
  [FruitType.STRAWBERRY]: '#ff0050',
  [FruitType.ORANGE]: '#ffb852',
  [FruitType.APPLE]: '#ff0000',
  [FruitType.MELON]: '#00ff00',
  [FruitType.GALAXIAN]: '#00ffff',
  [FruitType.BELL]: '#ffff00',
  [FruitType.KEY]: '#00ffff',
};

/**
 * Fruit spawn position (center of maze, below ghost house)
 */
const FRUIT_SPAWN_COL = 13.5;
const FRUIT_SPAWN_ROW = 17;

/**
 * How long fruit stays before despawning (in frames at 60fps)
 * Approximately 9-10 seconds in original game
 */
const FRUIT_DESPAWN_TIME = 600; // 10 seconds

export class Fruit {
  public position: Position;
  public readonly type: FruitTypeValue;
  private active: boolean = true;
  private despawnTimer: number = FRUIT_DESPAWN_TIME;

  constructor(type: FruitTypeValue) {
    this.type = type;
    this.position = {
      x: FRUIT_SPAWN_COL * SCALED_TILE + SCALED_TILE / 2,
      y: FRUIT_SPAWN_ROW * SCALED_TILE + SCALED_TILE / 2,
    };
  }

  /**
   * Update fruit state (despawn timer)
   */
  update(): void {
    if (!this.active) return;

    this.despawnTimer--;
    if (this.despawnTimer <= 0) {
      this.active = false;
    }
  }

  /**
   * Check if fruit is still active
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Get remaining time before despawn (in frames)
   */
  getRemainingTime(): number {
    return this.despawnTimer;
  }

  /**
   * Get points this fruit is worth
   */
  getPoints(): number {
    return FRUIT_POINTS[this.type];
  }

  /**
   * Get fruit color for rendering
   */
  getColor(): string {
    return FRUIT_COLORS[this.type];
  }

  /**
   * Collect the fruit (when Pac-Man eats it)
   * @returns Points awarded, or 0 if already collected
   */
  collect(): number {
    if (!this.active) return 0;

    this.active = false;
    return this.getPoints();
  }

  /**
   * Get current tile position
   */
  getTile(): { col: number; row: number } {
    return {
      col: Math.floor(this.position.x / SCALED_TILE),
      row: Math.floor(this.position.y / SCALED_TILE),
    };
  }

  /**
   * Get the correct fruit type for a given level
   * Based on original Pac-Man fruit progression
   */
  static getFruitTypeForLevel(level: number): FruitTypeValue {
    if (level === 1) return FruitType.CHERRY;
    if (level === 2) return FruitType.STRAWBERRY;
    if (level <= 4) return FruitType.ORANGE;
    if (level <= 6) return FruitType.APPLE;
    if (level <= 8) return FruitType.MELON;
    if (level <= 10) return FruitType.GALAXIAN;
    if (level <= 12) return FruitType.BELL;
    return FruitType.KEY;
  }

  /**
   * Get fruit name for display
   */
  static getFruitName(type: FruitTypeValue): string {
    const names: Record<FruitTypeValue, string> = {
      [FruitType.CHERRY]: 'Cherry',
      [FruitType.STRAWBERRY]: 'Strawberry',
      [FruitType.ORANGE]: 'Orange',
      [FruitType.APPLE]: 'Apple',
      [FruitType.MELON]: 'Melon',
      [FruitType.GALAXIAN]: 'Galaxian',
      [FruitType.BELL]: 'Bell',
      [FruitType.KEY]: 'Key',
    };
    return names[type];
  }
}
