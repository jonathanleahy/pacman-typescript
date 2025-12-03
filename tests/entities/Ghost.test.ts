/**
 * Ghost Entity TDD tests
 *
 * Tests for base Ghost class and all four ghost personalities:
 * - Blinky (Red) - Direct chase
 * - Pinky (Pink) - Ambush
 * - Inky (Cyan) - Erratic
 * - Clyde (Orange) - Shy
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Blinky } from '../../src/entities/Blinky';
import { Pinky } from '../../src/entities/Pinky';
import { Inky } from '../../src/entities/Inky';
import { Clyde } from '../../src/entities/Clyde';
import { PacMan } from '../../src/entities/PacMan';
import { Direction, GhostMode } from '../../src/constants';
import { SCATTER_TARGETS } from '../../src/utils/MazeData';

describe('Blinky (Red Ghost)', () => {
  let blinky: Blinky;
  let pacman: PacMan;

  beforeEach(() => {
    blinky = new Blinky();
    pacman = new PacMan();
  });

  describe('initialization', () => {
    it('should have correct name', () => {
      expect(blinky.name).toBe('Blinky');
    });

    it('should have red color', () => {
      expect(blinky.color).toBe('#ff0000');
    });

    it('should start outside ghost house', () => {
      expect(blinky.isInHouse).toBe(false);
    });

    it('should start in scatter mode', () => {
      expect(blinky.mode).toBe(GhostMode.SCATTER);
    });

    it('should have correct scatter target (top-right)', () => {
      expect(blinky.scatterTarget).toEqual(SCATTER_TARGETS.BLINKY);
    });
  });

  describe('chase targeting', () => {
    it('should target Pac-Man directly', () => {
      pacman.setTilePosition(10, 15);
      const target = blinky.calculateChaseTarget(pacman);

      expect(target.col).toBe(10);
      expect(target.row).toBe(15);
    });

    it('should update target when Pac-Man moves', () => {
      pacman.setTilePosition(5, 5);
      let target = blinky.calculateChaseTarget(pacman);
      expect(target.col).toBe(5);
      expect(target.row).toBe(5);

      pacman.setTilePosition(20, 10);
      target = blinky.calculateChaseTarget(pacman);
      expect(target.col).toBe(20);
      expect(target.row).toBe(10);
    });
  });

  describe('cruise elroy', () => {
    it('should start at elroy level 0', () => {
      expect(blinky.getCruiseElroyLevel()).toBe(0);
    });

    it('should set elroy level', () => {
      blinky.setCruiseElroy(1);
      expect(blinky.getCruiseElroyLevel()).toBe(1);
    });

    it('should clamp elroy level to max 2', () => {
      blinky.setCruiseElroy(5);
      expect(blinky.getCruiseElroyLevel()).toBe(2);
    });
  });
});

describe('Pinky (Pink Ghost)', () => {
  let pinky: Pinky;
  let pacman: PacMan;

  beforeEach(() => {
    pinky = new Pinky();
    pacman = new PacMan();
  });

  describe('initialization', () => {
    it('should have correct name', () => {
      expect(pinky.name).toBe('Pinky');
    });

    it('should have pink color', () => {
      expect(pinky.color).toBe('#ffb8ff');
    });

    it('should start in ghost house', () => {
      expect(pinky.isInHouse).toBe(true);
    });

    it('should have correct scatter target (top-left)', () => {
      expect(pinky.scatterTarget).toEqual(SCATTER_TARGETS.PINKY);
    });
  });

  describe('chase targeting', () => {
    it('should target 4 tiles ahead of Pac-Man facing right', () => {
      pacman.setTilePosition(10, 15);
      pacman.direction = Direction.RIGHT;

      const target = pinky.calculateChaseTarget(pacman);
      expect(target.col).toBe(14); // 10 + 4
      expect(target.row).toBe(15);
    });

    it('should target 4 tiles ahead of Pac-Man facing left', () => {
      pacman.setTilePosition(10, 15);
      pacman.direction = Direction.LEFT;

      const target = pinky.calculateChaseTarget(pacman);
      expect(target.col).toBe(6); // 10 - 4
      expect(target.row).toBe(15);
    });

    it('should target 4 tiles ahead of Pac-Man facing down', () => {
      pacman.setTilePosition(10, 15);
      pacman.direction = Direction.DOWN;

      const target = pinky.calculateChaseTarget(pacman);
      expect(target.col).toBe(10);
      expect(target.row).toBe(19); // 15 + 4
    });

    it('should have overflow bug when Pac-Man faces up', () => {
      pacman.setTilePosition(10, 15);
      pacman.direction = Direction.UP;

      const target = pinky.calculateChaseTarget(pacman);
      expect(target.col).toBe(6);  // 10 - 4 (bug!)
      expect(target.row).toBe(11); // 15 - 4
    });
  });
});

describe('Inky (Cyan Ghost)', () => {
  let inky: Inky;
  let blinky: Blinky;
  let pacman: PacMan;

  beforeEach(() => {
    inky = new Inky();
    blinky = new Blinky();
    pacman = new PacMan();
  });

  describe('initialization', () => {
    it('should have correct name', () => {
      expect(inky.name).toBe('Inky');
    });

    it('should have cyan color', () => {
      expect(inky.color).toBe('#00ffff');
    });

    it('should start in ghost house', () => {
      expect(inky.isInHouse).toBe(true);
    });

    it('should have high dot limit (exits late)', () => {
      expect(inky.dotLimit).toBe(30);
    });
  });

  describe('chase targeting', () => {
    it('should calculate target based on Blinky and Pac-Man positions', () => {
      // Pac-Man at (10, 15) facing right → 2 ahead = (12, 15)
      pacman.setTilePosition(10, 15);
      pacman.direction = Direction.RIGHT;

      // Blinky at (8, 15)
      blinky.setTilePosition(8, 15);

      // Vector from Blinky(8,15) to ahead(12,15) = (4, 0)
      // Doubled = (8, 0)
      // Final target = Blinky(8,15) + (8,0) = (16, 15)
      const target = inky.calculateChaseTarget(pacman, blinky);
      expect(target.col).toBe(16);
      expect(target.row).toBe(15);
    });

    it('should work without Blinky reference (fallback)', () => {
      pacman.setTilePosition(10, 15);
      pacman.direction = Direction.RIGHT;

      // Without Blinky, should just return 2 tiles ahead
      const target = inky.calculateChaseTarget(pacman);
      expect(target.col).toBe(12);
      expect(target.row).toBe(15);
    });

    it('should have overflow bug when Pac-Man faces up', () => {
      pacman.setTilePosition(10, 15);
      pacman.direction = Direction.UP;
      blinky.setTilePosition(10, 15);

      // 2 ahead when facing up with bug = (10-2, 15-2) = (8, 13)
      // Vector from Blinky(10,15) to (8,13) = (-2, -2)
      // Doubled = (-4, -4)
      // Final = Blinky + doubled = (10-4, 15-4) = (6, 11)
      const target = inky.calculateChaseTarget(pacman, blinky);
      expect(target.col).toBe(6);
      expect(target.row).toBe(11);
    });
  });
});

describe('Clyde (Orange Ghost)', () => {
  let clyde: Clyde;
  let pacman: PacMan;

  beforeEach(() => {
    clyde = new Clyde();
    pacman = new PacMan();
  });

  describe('initialization', () => {
    it('should have correct name', () => {
      expect(clyde.name).toBe('Clyde');
    });

    it('should have orange color', () => {
      expect(clyde.color).toBe('#ffb852');
    });

    it('should start in ghost house', () => {
      expect(clyde.isInHouse).toBe(true);
    });

    it('should have highest dot limit (exits last)', () => {
      expect(clyde.dotLimit).toBe(60);
    });
  });

  describe('chase targeting', () => {
    it('should target Pac-Man when far away (>8 tiles)', () => {
      // Place them far apart
      clyde.setTilePosition(5, 5);
      pacman.setTilePosition(20, 20);

      const target = clyde.calculateChaseTarget(pacman);
      expect(target.col).toBe(20);
      expect(target.row).toBe(20);
    });

    it('should target home corner when close (≤8 tiles)', () => {
      // Place them close together
      clyde.setTilePosition(10, 15);
      pacman.setTilePosition(12, 15);

      const target = clyde.calculateChaseTarget(pacman);
      expect(target).toEqual(SCATTER_TARGETS.CLYDE);
    });

    it('should switch behavior at exactly 8 tiles', () => {
      // At exactly 8 tiles (should retreat)
      clyde.setTilePosition(10, 15);
      pacman.setTilePosition(18, 15);

      const target = clyde.calculateChaseTarget(pacman);
      expect(target).toEqual(SCATTER_TARGETS.CLYDE);
    });

    it('should chase at just over 8 tiles', () => {
      // Just over 8 tiles (should chase)
      clyde.setTilePosition(10, 15);
      pacman.setTilePosition(19, 15);

      const target = clyde.calculateChaseTarget(pacman);
      expect(target.col).toBe(19);
      expect(target.row).toBe(15);
    });
  });
});

describe('Ghost Mode Switching', () => {
  let blinky: Blinky;

  beforeEach(() => {
    blinky = new Blinky();
  });

  it('should change mode when setMode is called', () => {
    blinky.setMode(GhostMode.CHASE);
    expect(blinky.mode).toBe(GhostMode.CHASE);
  });

  it('should reverse direction when entering frightened mode', () => {
    blinky.direction = Direction.RIGHT;
    blinky.setMode(GhostMode.FRIGHTENED);

    expect(blinky.direction).toBe(Direction.LEFT);
  });

  it('should track frightened flashing state', () => {
    blinky.setMode(GhostMode.FRIGHTENED, 100);
    expect(blinky.frightenedFlashing).toBe(false);
  });
});

describe('Ghost Reset', () => {
  it('should reset Blinky outside house', () => {
    const blinky = new Blinky();
    blinky.setMode(GhostMode.FRIGHTENED);
    blinky.reset();

    expect(blinky.isInHouse).toBe(false);
    expect(blinky.mode).toBe(GhostMode.SCATTER);
  });

  it('should reset other ghosts inside house', () => {
    const pinky = new Pinky();
    pinky.exitHouse();
    pinky.reset();

    expect(pinky.isInHouse).toBe(true);
    expect(pinky.mode).toBe(GhostMode.HOUSE);
  });
});
