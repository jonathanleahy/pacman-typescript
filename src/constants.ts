/**
 * PAC-MAN Game Constants
 * Based on original 1980 Namco arcade specifications
 */

// Display constants
export const TILE_SIZE = 8;
export const SCALE = 3;  // Increased from 2 for larger visuals
export const SCALED_TILE = TILE_SIZE * SCALE;

export const GRID_WIDTH = 28;
export const GRID_HEIGHT = 31;

export const CANVAS_WIDTH = GRID_WIDTH * SCALED_TILE;  // 448
export const CANVAS_HEIGHT = GRID_HEIGHT * SCALED_TILE; // 496

// Game timing
export const TARGET_FPS = 60;
export const FRAME_TIME = 1000 / TARGET_FPS;

// Pac-Man speeds (pixels per frame at 60fps)
export const PACMAN_SPEED = 1.25 * SCALE;  // ~80% max speed
export const PACMAN_EATING_SPEED = 1.1 * SCALE;  // Slightly slower when eating
export const PACMAN_FRIGHT_SPEED = 1.4 * SCALE;  // Faster when ghosts frightened

// Ghost speeds
export const GHOST_SPEED = 1.18 * SCALE;  // ~75% max speed
export const GHOST_TUNNEL_SPEED = 0.6 * SCALE;  // Slow in tunnel
export const GHOST_FRIGHT_SPEED = 0.8 * SCALE;  // Slower when frightened
export const GHOST_EATEN_SPEED = 2.5 * SCALE;  // Fast when returning to ghost house

// Power pellet duration (in frames)
export const FRIGHT_DURATION = [360, 300, 240, 180, 120, 300, 120, 120, 60, 300, 120, 60, 60, 180, 60, 60, 0, 60, 0];  // Per level

// Ghost mode timings (in seconds) for level 1
export const SCATTER_TIMES = [7, 7, 5, 5];  // Scatter durations
export const CHASE_TIMES = [20, 20, 20, Infinity];  // Chase durations

// Scoring
export const SCORE_PELLET = 10;
export const SCORE_POWER_PELLET = 50;
export const SCORE_GHOST = [200, 400, 800, 1600];  // Sequential ghost eating
export const SCORE_FRUIT = [100, 300, 500, 700, 1000, 2000, 3000, 5000];  // Cherry to Key
export const EXTRA_LIFE_SCORE = 10000;

// Animation
export const PACMAN_ANIMATION_SPEED = 6;  // Slower mouth chomping
export const GHOST_ANIMATION_SPEED = 16;  // Increased from 8 for smoother wiggle
export const DEATH_ANIMATION_FRAMES = 11;
export const DEATH_ANIMATION_SPEED = 8;

// Ghost house
export const GHOST_HOUSE_X = 13.5;  // Center of ghost house
export const GHOST_HOUSE_Y = 14;
export const GHOST_HOUSE_EXIT_Y = 11;

// Directions
export const Direction = {
  NONE: -1,
  UP: 0,
  DOWN: 1,
  LEFT: 2,
  RIGHT: 3,
} as const;

export type DirectionType = typeof Direction[keyof typeof Direction];

// Direction vectors
export const DIRECTION_VECTORS: Record<number, { x: number; y: number }> = {
  [Direction.NONE]: { x: 0, y: 0 },
  [Direction.UP]: { x: 0, y: -1 },
  [Direction.DOWN]: { x: 0, y: 1 },
  [Direction.LEFT]: { x: -1, y: 0 },
  [Direction.RIGHT]: { x: 1, y: 0 },
};

// Opposite directions
export const OPPOSITE_DIRECTION: Record<number, number> = {
  [Direction.UP]: Direction.DOWN,
  [Direction.DOWN]: Direction.UP,
  [Direction.LEFT]: Direction.RIGHT,
  [Direction.RIGHT]: Direction.LEFT,
};

// Colors (authentic Pac-Man palette)
export const Colors = {
  MAZE_WALL: '#2121de',
  MAZE_WALL_LIGHT: '#5555ff',
  PACMAN: '#ffff00',
  BLINKY: '#ff0000',
  PINKY: '#ffb8ff',
  INKY: '#00ffff',
  CLYDE: '#ffb852',
  FRIGHTENED: '#2121de',
  FRIGHTENED_FLASH: '#ffffff',
  PELLET: '#ffb897',
  POWER_PELLET: '#ffb897',
  TEXT: '#ffffff',
  SCORE_TEXT: '#ffff00',
  READY_TEXT: '#ffff00',
  GAME_OVER_TEXT: '#ff0000',
} as const;

// Ghost modes
export const GhostMode = {
  SCATTER: 'scatter',
  CHASE: 'chase',
  FRIGHTENED: 'frightened',
  EATEN: 'eaten',
  HOUSE: 'house',
  EXITING: 'exiting',
} as const;

export type GhostModeType = typeof GhostMode[keyof typeof GhostMode];

// Game states
export const GameState = {
  LOADING: 'loading',
  START_SCREEN: 'start_screen',
  READY: 'ready',
  PLAYING: 'playing',
  DYING: 'dying',
  GAME_OVER: 'game_over',
  VICTORY_ANIMATION: 'victory_animation',
  LEVEL_COMPLETE: 'level_complete',
  INTERMISSION: 'intermission',
  GAME_WON: 'game_won',
  PAUSED: 'paused',
} as const;

export type GameStateType = typeof GameState[keyof typeof GameState];

// Fruit types
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

// Fruit appearance levels
export const FRUIT_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
