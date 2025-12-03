/**
 * Ghost Base Class
 *
 * This class implements the common behavior shared by all four ghosts in Pac-Man.
 * Each ghost has unique targeting logic (implemented in subclasses), but they all
 * share the same movement system, mode switching, and rendering.
 *
 * ## Ghost Mode State Machine
 *
 * Ghosts operate in several modes that fundamentally change their behavior:
 *
 * ```
 *                    Power Pellet
 *   ┌─────────┐    ┌─────────────────┐
 *   │ SCATTER │◄───│   FRIGHTENED    │◄──── Power Pellet Eaten
 *   └────┬────┘    └───────┬─────────┘
 *        │ Timer          │ Eaten by Pac-Man
 *        ▼                ▼
 *   ┌─────────┐    ┌─────────────────┐
 *   │  CHASE  │    │     EATEN       │───── Returns to Ghost House
 *   └────┬────┘    └─────────────────┘
 *        │ Timer
 *        ▼
 *   ┌─────────┐
 *   │ SCATTER │ ... (cycles 4 times, then permanent CHASE)
 *   └─────────┘
 * ```
 *
 * ## Movement Algorithm
 *
 * At each tile intersection, ghosts:
 * 1. Cannot reverse direction (except when mode changes)
 * 2. Calculate target tile based on current mode
 * 3. Choose direction that minimizes distance to target
 * 4. Use specific tie-breaking order: UP > LEFT > DOWN > RIGHT
 *
 * This predictable behavior allows skilled players to manipulate ghost paths.
 *
 * @abstract This class must be extended by specific ghost implementations
 */

import { Entity } from './Entity';
import {
  Direction,
  DirectionType,
  DIRECTION_VECTORS,
  OPPOSITE_DIRECTION,
  SCALED_TILE,
  GHOST_SPEED,
  GHOST_TUNNEL_SPEED,
  GHOST_FRIGHT_SPEED,
  GHOST_EATEN_SPEED,
  GhostMode,
  GhostModeType,
} from '../constants';
import { TilePosition } from '../types';
import { MAZE_DATA, isWalkable, isInTunnel, GHOST_HOUSE } from '../utils/MazeData';
import { PacMan } from './PacMan';

/**
 * Configuration for a specific ghost type
 * Each ghost has unique name, color, scatter target, and starting position
 */
export interface GhostConfig {
  /** Display name (Blinky, Pinky, Inky, Clyde) */
  name: string;

  /** Body color in hex format */
  color: string;

  /** Corner to head toward during Scatter mode */
  scatterTarget: TilePosition;

  /** Starting tile position */
  startPosition: TilePosition;

  /** Number of pellets that must be eaten before this ghost leaves the house */
  dotLimit: number;
}

export abstract class Ghost extends Entity {
  /** Display name for this ghost */
  public readonly name: string;

  /** Body color (used for rendering) */
  public readonly color: string;

  /** Current behavioral mode */
  public mode: GhostModeType = GhostMode.HOUSE;

  /** Target tile the ghost is trying to reach */
  public targetTile: TilePosition = { col: 0, row: 0 };

  /** Fixed corner target for Scatter mode */
  public readonly scatterTarget: TilePosition;

  /** Starting position for reset */
  private readonly startPosition: TilePosition;

  /** Is this ghost currently inside the ghost house? */
  public isInHouse: boolean = true;

  /** Pellet counter - ghost exits house when global count exceeds this */
  public dotLimit: number;

  /** Animation frame for alternating ghost sprites */
  protected ghostAnimFrame: number = 0;

  /** Timer for frightened mode duration */
  private frightenedTimer: number = 0;

  /** How long frightened mode lasts (in frames) */
  private frightenedDuration: number = 360; // 6 seconds at 60fps

  /** Whether to flash white (ending frightened mode soon) */
  public frightenedFlashing: boolean = false;

  /** Vertical bounce offset when in ghost house */
  private houseOffset: number = 0;

  /** Direction of bounce in ghost house */
  private houseBounceDir: number = 1;

  /**
   * Create a new ghost
   *
   * @param config - Ghost-specific configuration
   */
  constructor(config: GhostConfig) {
    // Initialize at starting position (center of tile)
    super(
      config.startPosition.col * SCALED_TILE + SCALED_TILE / 2,
      config.startPosition.row * SCALED_TILE + SCALED_TILE / 2
    );

    this.name = config.name;
    this.color = config.color;
    this.scatterTarget = config.scatterTarget;
    this.startPosition = config.startPosition;
    this.dotLimit = config.dotLimit;

    // Set initial speed
    this.speed = GHOST_SPEED;

    // Ghosts start stationary in the house
    this.direction = Direction.NONE;
  }

  /**
   * Calculate the target tile for this ghost
   *
   * This is the core of ghost AI - each ghost type implements this differently:
   * - Blinky: Directly targets Pac-Man's current tile
   * - Pinky: Targets 4 tiles ahead of Pac-Man
   * - Inky: Complex calculation involving Blinky's position
   * - Clyde: Targets Pac-Man when far, own corner when close
   *
   * @param pacman - Reference to Pac-Man for position/direction
   * @param blinky - Reference to Blinky (needed for Inky's calculation)
   * @returns The tile this ghost should path toward
   */
  abstract calculateChaseTarget(pacman: PacMan, blinky?: Ghost): TilePosition;

  /**
   * Update ghost state each frame
   *
   * This handles:
   * 1. Mode-specific behavior (house bouncing, frightened countdown)
   * 2. Speed adjustments based on mode and position
   * 3. Direction decisions at intersections
   * 4. Actual movement
   *
   * @param deltaTime - Time since last frame (unused, we use fixed timestep)
   */
  update(_deltaTime: number): void {
    // Handle mode-specific updates
    switch (this.mode) {
      case GhostMode.HOUSE:
        this.updateHouseMode();
        return;

      case GhostMode.EXITING:
        this.updateExitingMode();
        return;

      case GhostMode.FRIGHTENED:
        this.updateFrightenedMode();
        break;

      case GhostMode.EATEN:
        // Fast return to ghost house
        break;
    }

    // Update speed based on current state
    this.updateSpeed();

    // At tile center, make direction decisions
    if (this.isAtTileCenter(this.speed)) {
      this.chooseDirection();
    }

    // Move in current direction
    this.move();

    // Update animation
    this.updateAnimation();
  }

  /**
   * Update when ghost is bouncing in the ghost house
   * Ghosts bob up and down until released
   */
  private updateHouseMode(): void {
    // Bounce up and down
    this.houseOffset += 0.5 * this.houseBounceDir;
    if (Math.abs(this.houseOffset) > 3) {
      this.houseBounceDir *= -1;
    }

    this.position.y =
      this.startPosition.row * SCALED_TILE + SCALED_TILE / 2 + this.houseOffset;
  }

  /**
   * Update when ghost is exiting the ghost house
   * Move to center, then up through the door
   */
  private updateExitingMode(): void {
    const doorX = GHOST_HOUSE.centerCol * SCALED_TILE + SCALED_TILE / 2;
    const doorY = GHOST_HOUSE.exitRow * SCALED_TILE + SCALED_TILE / 2;

    // First, center horizontally
    if (Math.abs(this.position.x - doorX) > 1) {
      this.position.x += this.position.x < doorX ? 1 : -1;
      return;
    }

    // Then move up to exit
    this.position.x = doorX;
    if (this.position.y > doorY) {
      this.position.y -= 1;
      return;
    }

    // Exit complete - switch to scatter/chase mode
    this.position.y = doorY;
    this.isInHouse = false;
    this.mode = GhostMode.SCATTER;
    this.direction = Direction.LEFT;
  }

  /**
   * Update frightened mode timer
   * Counts down and triggers flashing before expiry
   */
  private updateFrightenedMode(): void {
    this.frightenedTimer--;

    // Start flashing when almost done (last 2 seconds)
    if (this.frightenedTimer < 120 && this.frightenedTimer > 0) {
      // Flash every 15 frames
      this.frightenedFlashing = Math.floor(this.frightenedTimer / 15) % 2 === 0;
    }

    // Timer expired - return to normal mode
    if (this.frightenedTimer <= 0) {
      this.mode = GhostMode.CHASE;
      this.frightenedFlashing = false;
    }
  }

  /**
   * Update movement speed based on current mode and position
   *
   * Speed rules:
   * - Tunnel: 40% (prevents ghosts camping the tunnel)
   * - Frightened: 50% (makes them catchable)
   * - Eaten: 150% (rush back to regenerate)
   * - Normal: 75%
   */
  private updateSpeed(): void {
    const tile = this.getTile();

    if (this.mode === GhostMode.EATEN) {
      this.speed = GHOST_EATEN_SPEED;
    } else if (isInTunnel(tile.col, tile.row)) {
      this.speed = GHOST_TUNNEL_SPEED;
    } else if (this.mode === GhostMode.FRIGHTENED) {
      this.speed = GHOST_FRIGHT_SPEED;
    } else {
      this.speed = GHOST_SPEED;
    }
  }

  /**
   * Choose direction at an intersection
   *
   * The original Pac-Man used a specific algorithm:
   * 1. Get all possible directions (excluding reverse)
   * 2. Calculate distance from each option to target
   * 3. Pick the direction with minimum distance
   * 4. Tie-break in order: UP, LEFT, DOWN, RIGHT
   *
   * For frightened mode: pick randomly instead
   */
  private chooseDirection(): void {
    const tile = this.getTile();

    // Get available directions (can't reverse)
    const reverseDir = OPPOSITE_DIRECTION[this.direction] ?? -1;
    const options: DirectionType[] = [];

    // Check each direction (in tie-break order)
    const checkOrder = [Direction.UP, Direction.LEFT, Direction.DOWN, Direction.RIGHT];

    for (const dir of checkOrder) {
      if (dir === reverseDir) continue;

      const vector = DIRECTION_VECTORS[dir];
      const nextCol = tile.col + vector.x;
      const nextRow = tile.row + vector.y;

      // Special case: ghosts can't go up in certain tiles (original game quirk)
      if (dir === Direction.UP && this.isNoUpwardsTile(tile.col, tile.row)) {
        continue;
      }

      if (isWalkable(MAZE_DATA, nextCol, nextRow)) {
        options.push(dir);
      }
    }

    // If no options, we must reverse (dead end)
    if (options.length === 0) {
      this.direction = reverseDir as DirectionType;
      return;
    }

    // Single option - take it
    if (options.length === 1) {
      this.direction = options[0];
      return;
    }

    // Multiple options - choose based on mode
    if (this.mode === GhostMode.FRIGHTENED) {
      // Random choice when frightened
      this.direction = options[Math.floor(Math.random() * options.length)];
    } else {
      // Choose direction that minimizes distance to target
      this.direction = this.chooseByDistance(tile, options);
    }
  }

  /**
   * Choose the direction that gets closest to the target tile
   *
   * @param currentTile - Ghost's current tile
   * @param options - Available direction choices
   * @returns Best direction toward target
   */
  private chooseByDistance(currentTile: TilePosition, options: DirectionType[]): DirectionType {
    let bestDir = options[0];
    let bestDist = Infinity;

    for (const dir of options) {
      const vector = DIRECTION_VECTORS[dir];
      const nextCol = currentTile.col + vector.x;
      const nextRow = currentTile.row + vector.y;

      // Calculate squared distance to target (no sqrt needed for comparison)
      const dx = this.targetTile.col - nextCol;
      const dy = this.targetTile.row - nextRow;
      const dist = dx * dx + dy * dy;

      if (dist < bestDist) {
        bestDist = dist;
        bestDir = dir;
      }
    }

    return bestDir;
  }

  /**
   * Check if this is a tile where ghosts cannot turn upward
   *
   * In the original Pac-Man, certain tiles prevent ghosts from turning up.
   * This creates exploitable "safe zones" that advanced players use.
   *
   * @param col - Tile column
   * @param row - Tile row
   * @returns True if ghosts cannot turn up here
   */
  private isNoUpwardsTile(col: number, row: number): boolean {
    // The original has specific tiles where ghosts can't turn up
    // These are at rows 11 and 23, columns 12 and 15
    if (row === 11 || row === 23) {
      if (col === 12 || col === 15) {
        return true;
      }
    }
    return false;
  }

  /**
   * Set the ghost's mode and update target accordingly
   *
   * @param mode - New mode to enter
   * @param frightenedDuration - Duration for frightened mode (in frames)
   */
  setMode(mode: GhostModeType, frightenedDuration?: number): void {
    const previousMode = this.mode;
    this.mode = mode;

    // Reverse direction when entering frightened mode
    if (mode === GhostMode.FRIGHTENED && previousMode !== GhostMode.FRIGHTENED) {
      this.reverse();
      this.frightenedTimer = frightenedDuration ?? this.frightenedDuration;
      this.frightenedFlashing = false;
    }

    // Reset frightened state when leaving
    if (previousMode === GhostMode.FRIGHTENED && mode !== GhostMode.FRIGHTENED) {
      this.frightenedFlashing = false;
    }
  }

  /**
   * Update the target tile based on current mode
   *
   * @param pacman - Pac-Man reference for chase targeting
   * @param blinky - Blinky reference for Inky's calculation
   */
  updateTarget(pacman: PacMan, blinky?: Ghost): void {
    switch (this.mode) {
      case GhostMode.SCATTER:
        this.targetTile = this.scatterTarget;
        break;

      case GhostMode.CHASE:
        this.targetTile = this.calculateChaseTarget(pacman, blinky);
        break;

      case GhostMode.FRIGHTENED:
        // No specific target - direction chosen randomly
        break;

      case GhostMode.EATEN:
        // Target the ghost house door
        this.targetTile = { col: Math.floor(GHOST_HOUSE.centerCol), row: GHOST_HOUSE.doorRow };
        break;
    }
  }

  /**
   * Reverse the ghost's direction
   * Called when mode changes (scatter↔chase) or entering frightened
   */
  reverse(): void {
    if (this.direction !== Direction.NONE) {
      this.direction = OPPOSITE_DIRECTION[this.direction] as DirectionType;
    }
  }

  /**
   * Signal this ghost to exit the ghost house
   */
  exitHouse(): void {
    if (this.mode === GhostMode.HOUSE) {
      this.mode = GhostMode.EXITING;
    }
  }

  /**
   * Ghost was eaten - become eyes and return to house
   */
  eaten(): void {
    this.mode = GhostMode.EATEN;
  }

  /**
   * Check if ghost has reached the ghost house (when eaten)
   */
  checkReachedHouse(): boolean {
    if (this.mode !== GhostMode.EATEN) return false;

    const tile = this.getTile();
    if (tile.col === Math.floor(GHOST_HOUSE.centerCol) && tile.row === GHOST_HOUSE.doorRow) {
      // Enter the house
      this.mode = GhostMode.HOUSE;
      this.isInHouse = true;
      this.setTilePosition(GHOST_HOUSE.centerCol, GHOST_HOUSE.centerRow);
      this.direction = Direction.NONE;

      // Will exit again after a short delay
      setTimeout(() => this.exitHouse(), 1000);
      return true;
    }

    return false;
  }

  /**
   * Render this ghost
   *
   * @param ctx - Canvas rendering context (or WebGL renderer interface)
   */
  render(_ctx: CanvasRenderingContext2D): void {
    // Rendering is handled by the renderer system
    // This is here for interface compliance
  }

  /**
   * Reset ghost to initial state
   */
  reset(): void {
    this.setTilePosition(this.startPosition.col, this.startPosition.row);
    this.direction = Direction.NONE;
    this.mode = GhostMode.HOUSE;
    this.isInHouse = true;
    this.speed = GHOST_SPEED;
    this.frightenedTimer = 0;
    this.frightenedFlashing = false;
    this.houseOffset = 0;
    this.resetAnimation();
  }

  /**
   * Set frightened mode duration (changes per level)
   */
  setFrightenedDuration(frames: number): void {
    this.frightenedDuration = frames;
  }
}
