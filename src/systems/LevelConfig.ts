/**
 * Level Configuration System
 *
 * Defines per-level settings for:
 * - Ghost and Pac-Man speeds
 * - Frightened mode duration
 * - Fruit type
 * - Maze colors
 * - Elroy mode triggers (Blinky speed boost)
 *
 * Based on original Pac-Man arcade specifications with
 * some modern enhancements for visual variety.
 */

import { Fruit, FruitTypeValue } from '../entities/Fruit';

/**
 * Configuration for a single level
 */
export interface LevelConfig {
  level: number;

  // Speed multipliers (0.0 to 1.0, where 1.0 = maximum speed)
  pacmanSpeed: number;
  pacmanDotsSpeed: number;  // Speed while eating dots
  ghostSpeed: number;
  ghostTunnelSpeed: number;

  // Frightened mode
  frightenedDuration: number;  // Seconds (0 = no frightened mode)
  pacmanFrightSpeed: number;
  ghostFrightSpeed: number;

  // Fruit
  fruitType: FruitTypeValue;

  // Visual
  mazeColor: string;
  mazeColorLight: string;  // Lighter shade for highlights

  // Elroy mode (Blinky gets faster when few pellets remain)
  elroyDotsLeft1: number;   // First speed boost trigger
  elroySpeed1: number;
  elroyDotsLeft2: number;   // Second speed boost trigger
  elroySpeed2: number;
}

/**
 * Maze color palette for visual variety
 */
const MAZE_COLORS = [
  { main: '#2121de', light: '#5555ff' },  // Classic blue
  { main: '#ff0000', light: '#ff5555' },  // Red
  { main: '#00aa00', light: '#55ff55' },  // Green
  { main: '#ff00ff', light: '#ff88ff' },  // Magenta
  { main: '#00ffff', light: '#88ffff' },  // Cyan
  { main: '#ffaa00', light: '#ffdd55' },  // Orange
  { main: '#ff0088', light: '#ff55aa' },  // Pink
  { main: '#8800ff', light: '#aa55ff' },  // Purple
];

/**
 * Get maze colors for a level (cycles through palette)
 */
function getMazeColors(level: number): { main: string; light: string } {
  const index = (level - 1) % MAZE_COLORS.length;
  return MAZE_COLORS[index];
}

/**
 * Pre-calculated level configurations
 * Based on original Pac-Man with adjustments for modern feel
 */
export const LEVEL_CONFIGS: LevelConfig[] = [];

// Generate configs for levels 1-21+
for (let level = 1; level <= 21; level++) {
  const colors = getMazeColors(level);

  // Speed progression (gets harder each level, caps around level 21)
  const speedProgress = Math.min((level - 1) / 20, 1);

  // Base speeds increase with level
  const pacmanSpeed = 0.80 + speedProgress * 0.20;  // 80% -> 100%
  const ghostSpeed = 0.75 + speedProgress * 0.20;   // 75% -> 95%

  // Frightened duration decreases (original arcade values)
  const frightenedDurations = [6, 5, 4, 3, 2, 5, 2, 2, 1, 5, 2, 1, 1, 3, 1, 1, 0, 1, 0, 0, 0];
  const frightenedDuration = frightenedDurations[Math.min(level - 1, frightenedDurations.length - 1)];

  // Elroy triggers (more aggressive on higher levels)
  const elroyDotsLeft1 = 20 + Math.floor(level * 2);
  const elroyDotsLeft2 = 10 + Math.floor(level * 1);

  LEVEL_CONFIGS.push({
    level,

    // Pac-Man speeds
    pacmanSpeed,
    pacmanDotsSpeed: pacmanSpeed * 0.87,  // Slightly slower when eating
    pacmanFrightSpeed: pacmanSpeed * 1.05, // Slightly faster in fright mode

    // Ghost speeds
    ghostSpeed,
    ghostTunnelSpeed: ghostSpeed * 0.45,   // Much slower in tunnel
    ghostFrightSpeed: ghostSpeed * 0.55,   // Slower when frightened

    // Frightened mode
    frightenedDuration,

    // Fruit
    fruitType: Fruit.getFruitTypeForLevel(level),

    // Visual
    mazeColor: colors.main,
    mazeColorLight: colors.light,

    // Elroy mode
    elroyDotsLeft1,
    elroySpeed1: ghostSpeed * 1.05,
    elroyDotsLeft2,
    elroySpeed2: ghostSpeed * 1.10,
  });
}

/**
 * Get configuration for a specific level
 * @param level - Level number (1-based)
 * @returns Level configuration
 */
export function getLevelConfig(level: number): LevelConfig {
  // Clamp to valid range, but allow levels beyond 21 (uses level 21 speeds)
  const index = Math.min(Math.max(level - 1, 0), LEVEL_CONFIGS.length - 1);
  const config = LEVEL_CONFIGS[index];

  // For levels beyond 21, return config with correct level number
  if (level > 21) {
    return {
      ...config,
      level,
      fruitType: Fruit.getFruitTypeForLevel(level),
      ...getMazeColors(level),
    };
  }

  return config;
}

/**
 * Get the number of pellets that triggers each fruit spawn
 */
export const FRUIT_SPAWN_PELLETS = {
  FIRST: 10,   // First fruit appears after 10 pellets (reduced for showcase)
  SECOND: 30,  // Second fruit appears after 30 pellets (reduced for showcase)
};
