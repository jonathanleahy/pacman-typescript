/**
 * Pac-Man Entity TDD tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PacMan } from '../../src/entities/PacMan';
import { Direction, SCALED_TILE, PACMAN_SPEED } from '../../src/constants';
import { START_POSITIONS } from '../../src/utils/MazeData';

describe('PacMan', () => {
  let pacman: PacMan;

  beforeEach(() => {
    pacman = new PacMan();
  });

  describe('initialization', () => {
    it('should start at correct position', () => {
      const expectedX = START_POSITIONS.PACMAN.col * SCALED_TILE + SCALED_TILE / 2;
      const expectedY = START_POSITIONS.PACMAN.row * SCALED_TILE + SCALED_TILE / 2;

      expect(pacman.position.x).toBe(expectedX);
      expect(pacman.position.y).toBe(expectedY);
    });

    it('should start with 3 lives', () => {
      expect(pacman.lives).toBe(3);
    });

    it('should start with no direction', () => {
      expect(pacman.direction).toBe(Direction.NONE);
    });

    it('should start with correct speed', () => {
      expect(pacman.speed).toBe(PACMAN_SPEED);
    });

    it('should not be dying initially', () => {
      expect(pacman.isDying).toBe(false);
    });

    it('should not be eating initially', () => {
      expect(pacman.isEating).toBe(false);
    });
  });

  describe('setDirection', () => {
    it('should queue a new direction', () => {
      pacman.setDirection(Direction.RIGHT);
      expect(pacman.nextDirection).toBe(Direction.RIGHT);
    });

    it('should override previous queued direction', () => {
      pacman.setDirection(Direction.RIGHT);
      pacman.setDirection(Direction.LEFT);
      expect(pacman.nextDirection).toBe(Direction.LEFT);
    });
  });

  describe('movement', () => {
    it('should move in current direction', () => {
      // Position pacman in a walkable area
      pacman.setTilePosition(1, 5);
      pacman.direction = Direction.RIGHT;

      const startX = pacman.position.x;
      pacman.update(16);

      expect(pacman.position.x).toBeGreaterThan(startX);
    });

    it('should not move when direction is NONE', () => {
      const startX = pacman.position.x;
      const startY = pacman.position.y;

      pacman.update(16);

      expect(pacman.position.x).toBe(startX);
      expect(pacman.position.y).toBe(startY);
    });
  });

  describe('tile position', () => {
    it('should calculate tile position correctly', () => {
      pacman.setTilePosition(5, 10);
      const tile = pacman.getTile();

      expect(tile.col).toBe(5);
      expect(tile.row).toBe(10);
    });

    it('should detect when at tile center', () => {
      pacman.setTilePosition(5, 10);
      expect(pacman.isAtTileCenter()).toBe(true);
    });

    it('should snap to tile center', () => {
      pacman.position.x = 5 * SCALED_TILE + 3;
      pacman.position.y = 10 * SCALED_TILE + 12;

      pacman.snapToTileCenter();

      expect(pacman.position.x).toBe(5 * SCALED_TILE + SCALED_TILE / 2);
      expect(pacman.position.y).toBe(10 * SCALED_TILE + SCALED_TILE / 2);
    });
  });

  describe('canMove', () => {
    it('should return false for NONE direction', () => {
      expect(pacman.canMove(Direction.NONE)).toBe(false);
    });

    it('should return true for valid direction', () => {
      pacman.setTilePosition(1, 5);
      expect(pacman.canMove(Direction.RIGHT)).toBe(true);
    });

    it('should return false when wall is in the way', () => {
      pacman.setTilePosition(1, 1);
      expect(pacman.canMove(Direction.UP)).toBe(false); // Row 0 is all walls
    });
  });

  describe('death', () => {
    it('should set isDying to true when die() is called', () => {
      pacman.die();
      expect(pacman.isDying).toBe(true);
    });

    it('should reset death animation frame when dying', () => {
      pacman.deathAnimationFrame = 5;
      pacman.die();
      expect(pacman.deathAnimationFrame).toBe(0);
    });

    it('should stop movement when dying', () => {
      pacman.direction = Direction.RIGHT;
      pacman.die();
      expect(pacman.direction).toBe(Direction.NONE);
    });

    it('should complete death animation after enough frames', () => {
      pacman.die();

      // Simulate many update calls
      for (let i = 0; i < 200; i++) {
        pacman.update(16);
      }

      expect(pacman.isDeathAnimationComplete()).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset position to start', () => {
      pacman.position.x = 100;
      pacman.position.y = 100;
      pacman.reset();

      const expectedX = START_POSITIONS.PACMAN.col * SCALED_TILE + SCALED_TILE / 2;
      const expectedY = START_POSITIONS.PACMAN.row * SCALED_TILE + SCALED_TILE / 2;

      expect(pacman.position.x).toBe(expectedX);
      expect(pacman.position.y).toBe(expectedY);
    });

    it('should reset direction', () => {
      pacman.direction = Direction.RIGHT;
      pacman.nextDirection = Direction.UP;
      pacman.reset();

      expect(pacman.direction).toBe(Direction.NONE);
      expect(pacman.nextDirection).toBe(Direction.NONE);
    });

    it('should reset dying state', () => {
      pacman.die();
      pacman.reset();

      expect(pacman.isDying).toBe(false);
    });

    it('should NOT reset lives on regular reset', () => {
      pacman.lives = 1;
      pacman.reset();

      expect(pacman.lives).toBe(1);
    });

    it('should reset lives on fullReset', () => {
      pacman.lives = 1;
      pacman.fullReset();

      expect(pacman.lives).toBe(3);
    });
  });

  describe('animation', () => {
    it('should cycle through animation frames', () => {
      pacman.setTilePosition(1, 5);
      pacman.direction = Direction.RIGHT;

      const frames: number[] = [];
      for (let i = 0; i < 20; i++) {
        pacman.update(16);
        frames.push(pacman.getAnimationFrame());
      }

      // Should have changed at least once
      const uniqueFrames = new Set(frames);
      expect(uniqueFrames.size).toBeGreaterThan(1);
    });

    it('should reset animation when resetAnimation is called', () => {
      pacman.setTilePosition(1, 5);
      pacman.direction = Direction.RIGHT;

      for (let i = 0; i < 10; i++) {
        pacman.update(16);
      }

      pacman.resetAnimation();
      expect(pacman.getAnimationFrame()).toBe(0);
    });
  });

  describe('render', () => {
    it('should call canvas drawing methods', () => {
      const mockCtx = {
        fillStyle: '',
        beginPath: vi.fn(),
        arc: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      pacman.render(mockCtx);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });
  });

  describe('speed changes', () => {
    it('should use faster speed during frightened mode', () => {
      pacman.setTilePosition(1, 5);
      pacman.direction = Direction.RIGHT;
      pacman.frightenedModeActive = true;

      pacman.update(16);

      expect(pacman.speed).toBeGreaterThan(PACMAN_SPEED);
    });
  });
});
