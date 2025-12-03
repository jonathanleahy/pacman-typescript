/**
 * PAC-MAN Type Definitions
 */

import { DirectionType, GhostModeType, GameStateType } from './constants';

// 2D Position
export interface Position {
  x: number;
  y: number;
}

// Grid position (tile coordinates)
export interface TilePosition {
  col: number;
  row: number;
}

// Entity interface
export interface IEntity {
  position: Position;
  direction: DirectionType;
  speed: number;
  update(deltaTime: number): void;
  render(ctx: CanvasRenderingContext2D): void;
}

// Pac-Man specific
export interface IPacMan extends IEntity {
  lives: number;
  isEating: boolean;
  animationFrame: number;
  isDying: boolean;
  setDirection(direction: DirectionType): void;
  die(): void;
  reset(): void;
}

// Ghost specific
export interface IGhost extends IEntity {
  name: string;
  color: string;
  mode: GhostModeType;
  targetTile: TilePosition;
  scatterTarget: TilePosition;
  isInHouse: boolean;
  dotCounter: number;
  setMode(mode: GhostModeType): void;
  calculateTarget(pacman: IPacMan, blinky?: IGhost): TilePosition;
  reverse(): void;
  reset(): void;
}

// Pellet
export interface IPellet {
  position: TilePosition;
  isPowerPellet: boolean;
  isEaten: boolean;
  eat(): void;
}

// Fruit
export interface IFruit {
  position: Position;
  type: number;
  points: number;
  isVisible: boolean;
  spawn(): void;
  despawn(): void;
}

// Maze tile types
export enum TileType {
  EMPTY = 0,
  WALL = 1,
  PELLET = 2,
  POWER_PELLET = 3,
  GHOST_HOUSE = 4,
  GHOST_DOOR = 5,
  TUNNEL = 6,
  FRUIT_SPAWN = 7,
}

// Game configuration
export interface GameConfig {
  level: number;
  score: number;
  highScore: number;
  lives: number;
  pelletsRemaining: number;
  ghostsEaten: number;  // For calculating ghost score multiplier
}

// Input state
export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  pause: boolean;
  start: boolean;
}

// Sound types
export enum SoundType {
  MUNCH_1 = 'munch1',
  MUNCH_2 = 'munch2',
  EAT_GHOST = 'eatGhost',
  EAT_FRUIT = 'eatFruit',
  DEATH = 'death',
  INTRO = 'intro',
  SIREN_1 = 'siren1',
  SIREN_2 = 'siren2',
  SIREN_3 = 'siren3',
  SIREN_4 = 'siren4',
  FRIGHT = 'fright',
  RETREATING = 'retreating',
  EXTRA_LIFE = 'extraLife',
  INTERMISSION = 'intermission',
}

// Animation frame data
export interface AnimationData {
  frames: number[];
  speed: number;
  loop: boolean;
}

// Sprite data
export interface SpriteData {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Event types
export type GameEventType =
  | 'pelletEaten'
  | 'powerPelletEaten'
  | 'ghostEaten'
  | 'fruitEaten'
  | 'pacmanDied'
  | 'levelComplete'
  | 'gameOver'
  | 'extraLife'
  | 'scoreChanged';

export interface GameEvent {
  type: GameEventType;
  data?: unknown;
}

// Event handler
export type GameEventHandler = (event: GameEvent) => void;
