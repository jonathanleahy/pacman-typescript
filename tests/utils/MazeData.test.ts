/**
 * MazeData TDD tests
 */

import { describe, it, expect } from 'vitest';
import {
  MAZE_DATA,
  SCATTER_TARGETS,
  START_POSITIONS,
  GHOST_HOUSE,
  countPellets,
  isWalkable,
  isInTunnel,
  isInGhostHouse,
  getAvailableDirections,
} from '../../src/utils/MazeData';

describe('MazeData', () => {
  describe('maze dimensions', () => {
    it('should have correct height (31 rows)', () => {
      expect(MAZE_DATA.length).toBe(31);
    });

    it('should have correct width (28 columns) for all rows', () => {
      for (let i = 0; i < MAZE_DATA.length; i++) {
        expect(MAZE_DATA[i].length).toBe(28);
      }
    });
  });

  describe('pellet count', () => {
    it('should have correct pellet count', () => {
      const { regular } = countPellets(MAZE_DATA);
      expect(regular).toBe(238);  // Our maze layout
    });

    it('should have 4 power pellets (original game spec)', () => {
      const { power } = countPellets(MAZE_DATA);
      expect(power).toBe(4);
    });

    it('should have power pellets in corners', () => {
      // Top-left area
      expect(MAZE_DATA[3][1]).toBe(3);
      // Top-right area
      expect(MAZE_DATA[3][26]).toBe(3);
      // Bottom-left area
      expect(MAZE_DATA[22][1]).toBe(3);
      // Bottom-right area
      expect(MAZE_DATA[22][26]).toBe(3);
    });
  });

  describe('maze walls', () => {
    it('should have walls on all borders', () => {
      // Top border
      for (let col = 0; col < 28; col++) {
        expect(MAZE_DATA[0][col]).toBe(1);
      }
      // Bottom border
      for (let col = 0; col < 28; col++) {
        expect(MAZE_DATA[30][col]).toBe(1);
      }
      // Left border (except tunnel)
      expect(MAZE_DATA[1][0]).toBe(1);
      expect(MAZE_DATA[29][0]).toBe(1);
      // Right border (except tunnel)
      expect(MAZE_DATA[1][27]).toBe(1);
      expect(MAZE_DATA[29][27]).toBe(1);
    });
  });

  describe('scatter targets', () => {
    it('should have Blinky target in top-right', () => {
      expect(SCATTER_TARGETS.BLINKY.col).toBe(25);
      expect(SCATTER_TARGETS.BLINKY.row).toBe(0);
    });

    it('should have Pinky target in top-left', () => {
      expect(SCATTER_TARGETS.PINKY.col).toBe(2);
      expect(SCATTER_TARGETS.PINKY.row).toBe(0);
    });

    it('should have Inky target in bottom-right', () => {
      expect(SCATTER_TARGETS.INKY.col).toBe(27);
      expect(SCATTER_TARGETS.INKY.row).toBe(30);
    });

    it('should have Clyde target in bottom-left', () => {
      expect(SCATTER_TARGETS.CLYDE.col).toBe(0);
      expect(SCATTER_TARGETS.CLYDE.row).toBe(30);
    });
  });

  describe('start positions', () => {
    it('should have Pac-Man start position below center', () => {
      expect(START_POSITIONS.PACMAN.col).toBe(13.5);
      expect(START_POSITIONS.PACMAN.row).toBe(23);
    });

    it('should have Blinky start outside ghost house', () => {
      expect(START_POSITIONS.BLINKY.col).toBe(13.5);
      expect(START_POSITIONS.BLINKY.row).toBe(11);
    });

    it('should have other ghosts inside ghost house', () => {
      expect(START_POSITIONS.PINKY.row).toBe(14);
      expect(START_POSITIONS.INKY.row).toBe(14);
      expect(START_POSITIONS.CLYDE.row).toBe(14);
    });
  });

  describe('isWalkable', () => {
    it('should return false for walls', () => {
      expect(isWalkable(MAZE_DATA, 0, 0)).toBe(false);
      expect(isWalkable(MAZE_DATA, 0, 1)).toBe(false);
    });

    it('should return true for pellet tiles', () => {
      expect(isWalkable(MAZE_DATA, 1, 1)).toBe(true);
    });

    it('should return true for power pellet tiles', () => {
      expect(isWalkable(MAZE_DATA, 1, 3)).toBe(true);
    });

    it('should return true for empty tiles', () => {
      expect(isWalkable(MAZE_DATA, 12, 9)).toBe(true);  // Position with 0 in maze
    });

    it('should return true for tunnel positions outside maze', () => {
      expect(isWalkable(MAZE_DATA, -1, 13)).toBe(true);
      expect(isWalkable(MAZE_DATA, 28, 13)).toBe(true);
    });

    it('should return false for out of bounds (non-tunnel)', () => {
      expect(isWalkable(MAZE_DATA, -1, 5)).toBe(false);
      expect(isWalkable(MAZE_DATA, 28, 5)).toBe(false);
    });
  });

  describe('isInTunnel', () => {
    it('should return true for left tunnel zone', () => {
      expect(isInTunnel(0, 13)).toBe(true);
      expect(isInTunnel(5, 13)).toBe(true);
    });

    it('should return true for right tunnel zone', () => {
      expect(isInTunnel(22, 13)).toBe(true);
      expect(isInTunnel(27, 13)).toBe(true);
    });

    it('should return false for center of tunnel row', () => {
      expect(isInTunnel(14, 13)).toBe(false);
    });

    it('should return false for non-tunnel rows', () => {
      expect(isInTunnel(0, 10)).toBe(false);
      expect(isInTunnel(0, 14)).toBe(false);
    });
  });

  describe('isInGhostHouse', () => {
    it('should return true for ghost house interior', () => {
      expect(isInGhostHouse(13, 14)).toBe(true);
      expect(isInGhostHouse(11, 14)).toBe(true);
      expect(isInGhostHouse(15, 14)).toBe(true);
    });

    it('should return false for outside ghost house', () => {
      expect(isInGhostHouse(13, 11)).toBe(false);
      expect(isInGhostHouse(5, 14)).toBe(false);
    });

    it('should include ghost house boundaries', () => {
      expect(isInGhostHouse(10, 12)).toBe(true);
      expect(isInGhostHouse(17, 16)).toBe(true);
    });
  });

  describe('getAvailableDirections', () => {
    it('should return available directions at intersection', () => {
      // At a T-junction
      const directions = getAvailableDirections(MAZE_DATA, 6, 5);
      expect(directions.length).toBeGreaterThan(1);
    });

    it('should exclude reverse direction when specified', () => {
      const directions = getAvailableDirections(MAZE_DATA, 1, 5, 3); // Exclude right
      expect(directions).not.toContain(3);
    });

    it('should return empty array when completely blocked', () => {
      // Inside a wall (shouldn't happen in gameplay)
      const directions = getAvailableDirections(MAZE_DATA, 0, 0);
      expect(directions.length).toBe(0);
    });
  });

  describe('ghost house config', () => {
    it('should have correct ghost house boundaries', () => {
      expect(GHOST_HOUSE.leftCol).toBe(10);
      expect(GHOST_HOUSE.rightCol).toBe(17);
      expect(GHOST_HOUSE.topRow).toBe(12);
      expect(GHOST_HOUSE.bottomRow).toBe(16);
    });

    it('should have ghost house door position', () => {
      expect(GHOST_HOUSE.doorRow).toBe(12);
      expect(GHOST_HOUSE.doorLeftCol).toBe(13);
      expect(GHOST_HOUSE.doorRightCol).toBe(14);
    });
  });
});
