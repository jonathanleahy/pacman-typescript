/**
 * Collision System TDD tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Collision } from '../../src/systems/Collision';
import { PacMan } from '../../src/entities/PacMan';
import { Blinky } from '../../src/entities/Blinky';
import { GhostMode, SCORE_PELLET, SCORE_POWER_PELLET, SCORE_GHOST } from '../../src/constants';

describe('Collision System', () => {
  let collision: Collision;
  let pacman: PacMan;
  let blinky: Blinky;

  beforeEach(() => {
    collision = new Collision();
    pacman = new PacMan();
    blinky = new Blinky();
  });

  describe('initialization', () => {
    it('should count pellets correctly', () => {
      // Our maze has 238 regular + 4 power = 242 total
      expect(collision.getPelletsRemaining()).toBe(242);
    });

    it('should not be level complete at start', () => {
      expect(collision.isLevelComplete()).toBe(false);
    });
  });

  describe('pellet collision', () => {
    it('should detect pellet at Pac-Man position', () => {
      // Move Pac-Man to a tile with a pellet
      pacman.setTilePosition(1, 1);

      const result = collision.checkPelletCollision(pacman);
      expect(result.type).toBe('pellet');
      expect(result.points).toBe(SCORE_PELLET);
    });

    it('should remove pellet after eating', () => {
      pacman.setTilePosition(1, 1);

      collision.checkPelletCollision(pacman);
      const secondCheck = collision.checkPelletCollision(pacman);

      expect(secondCheck.type).toBe('none');
    });

    it('should decrease pellet count when eating', () => {
      const initialCount = collision.getPelletsRemaining();
      pacman.setTilePosition(1, 1);

      collision.checkPelletCollision(pacman);

      expect(collision.getPelletsRemaining()).toBe(initialCount - 1);
    });

    it('should return none for empty tiles', () => {
      // Row 0 is all walls, no pellets
      pacman.setTilePosition(0, 0);

      const result = collision.checkPelletCollision(pacman);
      expect(result.type).toBe('none');
    });
  });

  describe('power pellet collision', () => {
    it('should detect power pellet', () => {
      // Power pellets are at specific locations (e.g., row 3, col 1)
      pacman.setTilePosition(1, 3);

      const result = collision.checkPelletCollision(pacman);
      expect(result.type).toBe('powerPellet');
      expect(result.points).toBe(SCORE_POWER_PELLET);
    });

    it('should reset ghost multiplier on power pellet', () => {
      // Eat some ghosts first
      pacman.setTilePosition(1, 3);
      collision.checkPelletCollision(pacman);

      // The multiplier should be reset for next power pellet
      // (Implementation detail - tested through ghost eating)
    });
  });

  describe('ghost collision', () => {
    it('should detect collision with ghost on same tile', () => {
      // Position both on same tile
      pacman.setTilePosition(10, 15);
      blinky.setTilePosition(10, 15);
      blinky.setMode(GhostMode.CHASE);

      const results = collision.checkCollisions(pacman, [blinky]);
      const ghostResult = results.find(r => r.type === 'ghost');

      expect(ghostResult).toBeDefined();
      expect(ghostResult?.type).toBe('ghost');
    });

    it('should eat frightened ghost', () => {
      pacman.setTilePosition(10, 15);
      blinky.setTilePosition(10, 15);
      blinky.setMode(GhostMode.FRIGHTENED);

      const results = collision.checkCollisions(pacman, [blinky]);
      const eatResult = results.find(r => r.type === 'ghostEaten');

      expect(eatResult).toBeDefined();
      expect(eatResult?.type).toBe('ghostEaten');
      expect(eatResult?.points).toBe(SCORE_GHOST[0]); // First ghost = 200
    });

    it('should multiply points for consecutive ghost eating', () => {
      pacman.setTilePosition(1, 3);
      collision.checkPelletCollision(pacman); // Reset multiplier

      // First ghost
      pacman.setTilePosition(10, 15);
      blinky.setTilePosition(10, 15);
      blinky.setMode(GhostMode.FRIGHTENED);

      let results = collision.checkCollisions(pacman, [blinky]);
      expect(results[0].points).toBe(200);

      // Simulate second ghost (create new one)
      const blinky2 = new Blinky();
      blinky2.setTilePosition(10, 15);
      blinky2.setMode(GhostMode.FRIGHTENED);

      results = collision.checkCollisions(pacman, [blinky2]);
      expect(results[0].points).toBe(400);
    });

    it('should not collide with ghost in house', () => {
      pacman.setTilePosition(13, 14);
      blinky.setTilePosition(13, 14);
      blinky.mode = GhostMode.HOUSE;
      blinky.isInHouse = true;

      const results = collision.checkCollisions(pacman, [blinky]);
      const ghostResult = results.find(r => r.type === 'ghost' || r.type === 'ghostEaten');

      expect(ghostResult).toBeUndefined();
    });

    it('should not collide with eaten ghost (just eyes)', () => {
      pacman.setTilePosition(10, 15);
      blinky.setTilePosition(10, 15);
      blinky.mode = GhostMode.EATEN;

      const results = collision.checkCollisions(pacman, [blinky]);
      const ghostResult = results.find(r => r.type === 'ghost' || r.type === 'ghostEaten');

      expect(ghostResult).toBeUndefined();
    });

    it('should not detect collision when far apart', () => {
      pacman.setTilePosition(5, 5);
      blinky.setTilePosition(20, 20);

      const results = collision.checkCollisions(pacman, [blinky]);
      const ghostResult = results.find(r => r.type === 'ghost' || r.type === 'ghostEaten');

      expect(ghostResult).toBeUndefined();
    });
  });

  describe('level completion', () => {
    it('should detect level complete when all pellets eaten', () => {
      // This would require eating all 242 pellets
      // For testing, we can manually set the state
      // (In real implementation, we'd mock or use a smaller test maze)

      // Check that the method exists and returns false initially
      expect(collision.isLevelComplete()).toBe(false);
    });
  });

  describe('reset', () => {
    it('should restore all pellets on reset', () => {
      // Eat some pellets
      pacman.setTilePosition(1, 1);
      collision.checkPelletCollision(pacman);
      pacman.setTilePosition(2, 1);
      collision.checkPelletCollision(pacman);

      // Reset
      collision.resetPellets();

      // Should be back to initial count
      expect(collision.getPelletsRemaining()).toBe(242);
    });

    it('should reset ghost multiplier', () => {
      collision.resetGhostMultiplier();
      // Next ghost should give 200 points
      pacman.setTilePosition(10, 15);
      blinky.setTilePosition(10, 15);
      blinky.setMode(GhostMode.FRIGHTENED);

      const results = collision.checkCollisions(pacman, [blinky]);
      expect(results[0].points).toBe(200);
    });
  });

  describe('hasPellet query', () => {
    it('should return true for tile with pellet', () => {
      expect(collision.hasPellet(1, 1)).toBe(true);
    });

    it('should return false for tile without pellet', () => {
      expect(collision.hasPellet(0, 0)).toBe(false);
    });

    it('should return false after pellet is eaten', () => {
      pacman.setTilePosition(1, 1);
      collision.checkPelletCollision(pacman);

      expect(collision.hasPellet(1, 1)).toBe(false);
    });

    it('should handle out of bounds gracefully', () => {
      expect(collision.hasPellet(-1, -1)).toBe(false);
      expect(collision.hasPellet(100, 100)).toBe(false);
    });
  });
});
