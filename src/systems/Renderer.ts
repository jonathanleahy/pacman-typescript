/**
 * Game Renderer System
 * Handles all canvas rendering for the game
 */

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  SCALED_TILE,
  GRID_WIDTH,
  GRID_HEIGHT,
  Colors,
  Direction,
  GhostMode,
} from '../constants';
import { MAZE_DATA, GHOST_HOUSE } from '../utils/MazeData';
import { TileType } from '../types';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pelletsCanvas: HTMLCanvasElement;
  private pelletsCtx: CanvasRenderingContext2D;
  private mazeCanvas: HTMLCanvasElement;
  private mazeCtx: CanvasRenderingContext2D;
  private pelletState: boolean[][] = [];
  private powerPelletVisible = true;
  private powerPelletTimer = 0;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id "${canvasId}" not found`);
    }

    this.canvas = canvas;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2d context');
    }
    this.ctx = ctx;

    // Create offscreen canvas for pellets
    this.pelletsCanvas = document.createElement('canvas');
    this.pelletsCanvas.width = CANVAS_WIDTH;
    this.pelletsCanvas.height = CANVAS_HEIGHT;
    this.pelletsCtx = this.pelletsCanvas.getContext('2d')!;

    // Create offscreen canvas for maze
    this.mazeCanvas = document.createElement('canvas');
    this.mazeCanvas.width = CANVAS_WIDTH;
    this.mazeCanvas.height = CANVAS_HEIGHT;
    this.mazeCtx = this.mazeCanvas.getContext('2d')!;

    this.initPelletState();
    this.renderMazeToBuffer();
    this.renderPelletsToBuffer();
  }

  /**
   * Initialize pellet state tracking
   */
  private initPelletState(): void {
    this.pelletState = [];
    for (let row = 0; row < GRID_HEIGHT; row++) {
      this.pelletState[row] = [];
      for (let col = 0; col < GRID_WIDTH; col++) {
        const tile = MAZE_DATA[row]?.[col];
        this.pelletState[row][col] = tile === TileType.PELLET || tile === TileType.POWER_PELLET;
      }
    }
  }

  /**
   * Render maze walls to buffer
   */
  private renderMazeToBuffer(): void {
    const ctx = this.mazeCtx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw maze walls with neon glow effect
    for (let row = 0; row < GRID_HEIGHT; row++) {
      for (let col = 0; col < GRID_WIDTH; col++) {
        const tile = MAZE_DATA[row]?.[col];
        if (tile === TileType.WALL) {
          this.renderWallTile(ctx, col, row);
        } else if (tile === TileType.GHOST_DOOR) {
          this.renderGhostDoor(ctx, col, row);
        }
      }
    }
  }

  /**
   * Render a wall tile with proper connections
   */
  private renderWallTile(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * SCALED_TILE;
    const y = row * SCALED_TILE;

    // Check neighbors
    const hasTop = this.isWall(col, row - 1);
    const hasBottom = this.isWall(col, row + 1);
    const hasLeft = this.isWall(col - 1, row);
    const hasRight = this.isWall(col + 1, row);

    ctx.strokeStyle = Colors.MAZE_WALL;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const halfTile = SCALED_TILE / 2;
    const centerX = x + halfTile;
    const centerY = y + halfTile;

    // Draw connections based on neighbors
    ctx.beginPath();

    if (hasTop && hasBottom && !hasLeft && !hasRight) {
      // Vertical line
      ctx.moveTo(centerX, y);
      ctx.lineTo(centerX, y + SCALED_TILE);
    } else if (hasLeft && hasRight && !hasTop && !hasBottom) {
      // Horizontal line
      ctx.moveTo(x, centerY);
      ctx.lineTo(x + SCALED_TILE, centerY);
    } else {
      // Draw connections to neighbors
      if (hasTop) {
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX, y);
      }
      if (hasBottom) {
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX, y + SCALED_TILE);
      }
      if (hasLeft) {
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, centerY);
      }
      if (hasRight) {
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x + SCALED_TILE, centerY);
      }

      // Draw corner arcs for smoother appearance
      if (!hasTop && !hasBottom && !hasLeft && !hasRight) {
        // Isolated point
        ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
      }
    }

    ctx.stroke();
  }

  /**
   * Check if tile is a wall
   */
  private isWall(col: number, row: number): boolean {
    if (col < 0 || col >= GRID_WIDTH || row < 0 || row >= GRID_HEIGHT) {
      return false;
    }
    return MAZE_DATA[row][col] === TileType.WALL;
  }

  /**
   * Render ghost house door
   */
  private renderGhostDoor(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * SCALED_TILE;
    const y = row * SCALED_TILE;

    ctx.fillStyle = '#ffb8de';
    ctx.fillRect(x, y + SCALED_TILE / 2 - 2, SCALED_TILE, 4);
  }

  /**
   * Render pellets to buffer
   */
  private renderPelletsToBuffer(): void {
    const ctx = this.pelletsCtx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (let row = 0; row < GRID_HEIGHT; row++) {
      for (let col = 0; col < GRID_WIDTH; col++) {
        if (!this.pelletState[row][col]) continue;

        const tile = MAZE_DATA[row]?.[col];
        const x = col * SCALED_TILE + SCALED_TILE / 2;
        const y = row * SCALED_TILE + SCALED_TILE / 2;

        if (tile === TileType.PELLET) {
          this.renderPellet(ctx, x, y);
        } else if (tile === TileType.POWER_PELLET) {
          this.renderPowerPellet(ctx, x, y);
        }
      }
    }
  }

  /**
   * Render a single pellet
   */
  private renderPellet(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = Colors.PELLET;
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Render a power pellet
   */
  private renderPowerPellet(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = Colors.POWER_PELLET;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Mark a pellet as eaten
   */
  eatPellet(col: number, row: number): void {
    if (this.pelletState[row]?.[col]) {
      this.pelletState[row][col] = false;
      this.renderPelletsToBuffer();
    }
  }

  /**
   * Reset all pellets
   */
  resetPellets(): void {
    this.initPelletState();
    this.renderPelletsToBuffer();
  }

  /**
   * Update power pellet blinking
   */
  updatePowerPelletBlink(): void {
    this.powerPelletTimer++;
    if (this.powerPelletTimer >= 10) {
      this.powerPelletTimer = 0;
      this.powerPelletVisible = !this.powerPelletVisible;
    }
  }

  /**
   * Clear the canvas
   */
  clear(): void {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  /**
   * Render the maze
   */
  renderMaze(): void {
    this.ctx.drawImage(this.mazeCanvas, 0, 0);
  }

  /**
   * Render pellets
   */
  renderPellets(): void {
    // Draw from buffer but handle power pellet blinking
    if (this.powerPelletVisible) {
      this.ctx.drawImage(this.pelletsCanvas, 0, 0);
    } else {
      // Draw only regular pellets when power pellets are hidden
      for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
          if (!this.pelletState[row][col]) continue;

          const tile = MAZE_DATA[row]?.[col];
          if (tile === TileType.PELLET) {
            const x = col * SCALED_TILE + SCALED_TILE / 2;
            const y = row * SCALED_TILE + SCALED_TILE / 2;
            this.renderPellet(this.ctx, x, y);
          }
        }
      }
    }
  }

  /**
   * Render Pac-Man
   */
  renderPacMan(
    x: number,
    y: number,
    direction: number,
    animationFrame: number,
    isDying: boolean = false,
    deathFrame: number = 0
  ): void {
    const ctx = this.ctx;
    const centerX = x;
    const centerY = y;
    const radius = SCALED_TILE / 2 - 1;

    ctx.fillStyle = Colors.PACMAN;
    ctx.beginPath();

    if (isDying) {
      // Death animation - Pac-Man shrinking/disappearing
      const deathProgress = deathFrame / 11;
      const startAngle = Math.PI * 0.5 + Math.PI * deathProgress;
      const endAngle = Math.PI * 2.5 - Math.PI * deathProgress;

      if (deathProgress < 1) {
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.lineTo(centerX, centerY);
      }
    } else {
      // Normal animation - mouth opening/closing
      const mouthOpenings = [0, 0.15, 0.35, 0.15]; // Animation frames
      const mouthAngle = Math.PI * mouthOpenings[animationFrame % 4];

      let startAngle: number;
      let endAngle: number;

      switch (direction) {
        case Direction.RIGHT:
          startAngle = mouthAngle;
          endAngle = Math.PI * 2 - mouthAngle;
          break;
        case Direction.LEFT:
          startAngle = Math.PI + mouthAngle;
          endAngle = Math.PI - mouthAngle;
          break;
        case Direction.UP:
          startAngle = -Math.PI / 2 + mouthAngle;
          endAngle = -Math.PI / 2 - mouthAngle + Math.PI * 2;
          break;
        case Direction.DOWN:
          startAngle = Math.PI / 2 + mouthAngle;
          endAngle = Math.PI / 2 - mouthAngle + Math.PI * 2;
          break;
        default:
          startAngle = mouthAngle;
          endAngle = Math.PI * 2 - mouthAngle;
      }

      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.lineTo(centerX, centerY);
    }

    ctx.closePath();
    ctx.fill();
  }

  /**
   * Render a ghost
   */
  renderGhost(
    x: number,
    y: number,
    color: string,
    direction: number,
    mode: string,
    animationFrame: number,
    frightenedFlash: boolean = false
  ): void {
    const ctx = this.ctx;
    const size = SCALED_TILE - 2;
    const halfSize = size / 2;
    const left = x - halfSize;
    const top = y - halfSize;

    // Determine color based on mode
    let bodyColor = color;
    let eyeColor = '#fff';
    let pupilColor = '#00f';

    if (mode === GhostMode.FRIGHTENED) {
      bodyColor = frightenedFlash ? Colors.FRIGHTENED_FLASH : Colors.FRIGHTENED;
      eyeColor = frightenedFlash ? '#f00' : '#ffb8de';
      pupilColor = eyeColor;
    } else if (mode === GhostMode.EATEN) {
      // Only draw eyes when eaten
      this.renderGhostEyes(ctx, x, y, direction);
      return;
    }

    ctx.fillStyle = bodyColor;

    // Draw ghost body (rounded top, wavy bottom)
    ctx.beginPath();

    // Top arc
    ctx.arc(x, top + halfSize, halfSize, Math.PI, 0);

    // Right side
    ctx.lineTo(left + size, top + size);

    // Wavy bottom
    const waveHeight = 3;
    const waveCount = 3;
    const waveWidth = size / waveCount;
    const waveOffset = (animationFrame % 2) * (waveWidth / 2);

    for (let i = waveCount; i >= 0; i--) {
      const waveX = left + i * waveWidth + waveOffset;
      const waveY = top + size - (i % 2 === animationFrame % 2 ? waveHeight : 0);
      ctx.lineTo(Math.max(left, Math.min(left + size, waveX)), waveY);
    }

    ctx.closePath();
    ctx.fill();

    // Draw eyes (unless frightened)
    if (mode !== GhostMode.FRIGHTENED) {
      this.renderGhostEyes(ctx, x, y, direction);
    } else {
      // Frightened face
      this.renderFrightenedFace(ctx, x, y, eyeColor);
    }
  }

  /**
   * Render ghost eyes
   */
  private renderGhostEyes(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    direction: number
  ): void {
    const eyeOffsetX = 3;
    const eyeOffsetY = -2;
    const eyeRadius = 3;
    const pupilRadius = 1.5;

    // Calculate pupil offset based on direction
    let pupilOffsetX = 0;
    let pupilOffsetY = 0;

    switch (direction) {
      case Direction.UP:
        pupilOffsetY = -1.5;
        break;
      case Direction.DOWN:
        pupilOffsetY = 1.5;
        break;
      case Direction.LEFT:
        pupilOffsetX = -1.5;
        break;
      case Direction.RIGHT:
        pupilOffsetX = 1.5;
        break;
    }

    // Left eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x - eyeOffsetX, y + eyeOffsetY, eyeRadius, eyeRadius + 1, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00f';
    ctx.beginPath();
    ctx.arc(x - eyeOffsetX + pupilOffsetX, y + eyeOffsetY + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
    ctx.fill();

    // Right eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x + eyeOffsetX, y + eyeOffsetY, eyeRadius, eyeRadius + 1, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00f';
    ctx.beginPath();
    ctx.arc(x + eyeOffsetX + pupilOffsetX, y + eyeOffsetY + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Render frightened ghost face
   */
  private renderFrightenedFace(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string
  ): void {
    ctx.fillStyle = color;

    // Eyes (simple dots)
    ctx.beginPath();
    ctx.arc(x - 3, y - 2, 1.5, 0, Math.PI * 2);
    ctx.arc(x + 3, y - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Wavy mouth
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 3);
    for (let i = 0; i < 4; i++) {
      const px = x - 5 + (i + 0.5) * 2.5;
      const py = y + 3 + (i % 2 === 0 ? -2 : 2);
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  /**
   * Render score text
   */
  renderScore(score: number, highScore: number): void {
    const scoreEl = document.getElementById('score');
    const highScoreEl = document.getElementById('high-score');

    if (scoreEl) {
      scoreEl.textContent = score.toString().padStart(2, '0');
    }
    if (highScoreEl) {
      highScoreEl.textContent = highScore.toString().padStart(2, '0');
    }
  }

  /**
   * Render lives display
   */
  renderLives(lives: number): void {
    const livesEl = document.getElementById('lives-display');
    if (!livesEl) return;

    livesEl.innerHTML = '';
    for (let i = 0; i < lives - 1; i++) {
      const life = document.createElement('div');
      life.className = 'life-icon';
      livesEl.appendChild(life);
    }
  }

  /**
   * Render "READY!" text
   */
  renderReadyText(): void {
    this.ctx.fillStyle = Colors.READY_TEXT;
    this.ctx.font = '14px "Press Start 2P", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('READY!', CANVAS_WIDTH / 2, 17 * SCALED_TILE + SCALED_TILE / 2);
  }

  /**
   * Render "GAME OVER" text
   */
  renderGameOverText(): void {
    this.ctx.fillStyle = Colors.GAME_OVER_TEXT;
    this.ctx.font = '14px "Press Start 2P", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME  OVER', CANVAS_WIDTH / 2, 17 * SCALED_TILE + SCALED_TILE / 2);
  }

  /**
   * Render fruit
   */
  renderFruit(x: number, y: number, type: number): void {
    const ctx = this.ctx;
    const fruitColors = ['#f00', '#f00', '#ffa500', '#f00', '#0f0', '#ff0', '#ff0', '#0ff'];

    ctx.fillStyle = fruitColors[type] || '#f00';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();

    // Stem for most fruits
    if (type < 5) {
      ctx.fillStyle = '#0a0';
      ctx.fillRect(x - 1, y - 8, 2, 4);
    }
  }

  /**
   * Render ghost score popup
   */
  renderGhostScore(x: number, y: number, score: number): void {
    this.ctx.fillStyle = '#0ff';
    this.ctx.font = '8px "Press Start 2P", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(score.toString(), x, y);
  }

  /**
   * Get canvas context for direct access
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * Get canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
