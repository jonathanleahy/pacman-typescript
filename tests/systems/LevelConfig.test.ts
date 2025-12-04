/**
 * Level Configuration TDD tests
 *
 * Tests for per-level game settings:
 * - Ghost/Pac-Man speeds
 * - Frightened mode duration
 * - Fruit type
 * - Maze colors
 */

import { describe, it, expect } from 'vitest';
import {
  getLevelConfig,
  LEVEL_CONFIGS,
} from '../../src/systems/LevelConfig';
import { FruitType } from '../../src/entities/Fruit';

describe('LevelConfig', () => {
  describe('getLevelConfig', () => {
    it('should return config for level 1', () => {
      const config = getLevelConfig(1);
      expect(config).toBeDefined();
      expect(config.level).toBe(1);
    });

    it('should return config for high levels (capped behavior)', () => {
      const config = getLevelConfig(21);
      expect(config).toBeDefined();
      expect(config.level).toBe(21);
    });
  });

  describe('speed progression', () => {
    it('should have slower ghosts on level 1', () => {
      const config1 = getLevelConfig(1);
      const config5 = getLevelConfig(5);
      expect(config1.ghostSpeed).toBeLessThan(config5.ghostSpeed);
    });

    it('should have faster Pac-Man on higher levels', () => {
      const config1 = getLevelConfig(1);
      const config5 = getLevelConfig(5);
      expect(config1.pacmanSpeed).toBeLessThanOrEqual(config5.pacmanSpeed);
    });

    it('should cap speed at reasonable maximum', () => {
      const config21 = getLevelConfig(21);
      // Speed should not exceed 1.0 (100% of base)
      expect(config21.ghostSpeed).toBeLessThanOrEqual(1.0);
      expect(config21.pacmanSpeed).toBeLessThanOrEqual(1.0);
    });
  });

  describe('frightened duration', () => {
    it('should have longest frightened time on level 1', () => {
      const config1 = getLevelConfig(1);
      expect(config1.frightenedDuration).toBe(6); // 6 seconds
    });

    it('should decrease frightened time on higher levels', () => {
      const config1 = getLevelConfig(1);
      const config5 = getLevelConfig(5);
      expect(config5.frightenedDuration).toBeLessThan(config1.frightenedDuration);
    });

    it('should have zero frightened time on very high levels', () => {
      const config19 = getLevelConfig(19);
      expect(config19.frightenedDuration).toBe(0);
    });
  });

  describe('fruit type per level', () => {
    it('should have cherry on level 1', () => {
      const config = getLevelConfig(1);
      expect(config.fruitType).toBe(FruitType.CHERRY);
    });

    it('should have strawberry on level 2', () => {
      const config = getLevelConfig(2);
      expect(config.fruitType).toBe(FruitType.STRAWBERRY);
    });

    it('should have orange on levels 3-4', () => {
      expect(getLevelConfig(3).fruitType).toBe(FruitType.ORANGE);
      expect(getLevelConfig(4).fruitType).toBe(FruitType.ORANGE);
    });

    it('should have apple on levels 5-6', () => {
      expect(getLevelConfig(5).fruitType).toBe(FruitType.APPLE);
      expect(getLevelConfig(6).fruitType).toBe(FruitType.APPLE);
    });

    it('should have melon on levels 7-8', () => {
      expect(getLevelConfig(7).fruitType).toBe(FruitType.MELON);
      expect(getLevelConfig(8).fruitType).toBe(FruitType.MELON);
    });

    it('should have galaxian on levels 9-10', () => {
      expect(getLevelConfig(9).fruitType).toBe(FruitType.GALAXIAN);
      expect(getLevelConfig(10).fruitType).toBe(FruitType.GALAXIAN);
    });

    it('should have bell on levels 11-12', () => {
      expect(getLevelConfig(11).fruitType).toBe(FruitType.BELL);
      expect(getLevelConfig(12).fruitType).toBe(FruitType.BELL);
    });

    it('should have key on level 13+', () => {
      expect(getLevelConfig(13).fruitType).toBe(FruitType.KEY);
      expect(getLevelConfig(20).fruitType).toBe(FruitType.KEY);
    });
  });

  describe('maze colors', () => {
    it('should have blue maze on level 1', () => {
      const config = getLevelConfig(1);
      expect(config.mazeColor).toBe('#2121de');
    });

    it('should have different maze colors on different levels', () => {
      const colors = new Set<string>();
      for (let i = 1; i <= 8; i++) {
        colors.add(getLevelConfig(i).mazeColor);
      }
      // Should have at least 3 different colors in first 8 levels
      expect(colors.size).toBeGreaterThanOrEqual(3);
    });

    it('should cycle maze colors after exhausting palette', () => {
      const config9 = getLevelConfig(9);
      // Colors may repeat but should be defined
      expect(config9.mazeColor).toBeDefined();
      expect(config9.mazeColor.startsWith('#')).toBe(true);
    });
  });

  describe('elroy mode (Blinky speed boost)', () => {
    it('should have elroy trigger around 20 pellets on level 1', () => {
      const config = getLevelConfig(1);
      // Formula: 20 + level * 2 = 22 for level 1
      expect(config.elroyDotsLeft1).toBe(22);
    });

    it('should trigger elroy earlier on higher levels', () => {
      const config1 = getLevelConfig(1);
      const config5 = getLevelConfig(5);
      expect(config5.elroyDotsLeft1).toBeGreaterThanOrEqual(config1.elroyDotsLeft1);
    });
  });
});

describe('LEVEL_CONFIGS constant', () => {
  it('should have at least 21 level configurations', () => {
    expect(LEVEL_CONFIGS.length).toBeGreaterThanOrEqual(21);
  });

  it('should have valid structure for all configs', () => {
    for (const config of LEVEL_CONFIGS) {
      expect(config.level).toBeGreaterThan(0);
      expect(config.ghostSpeed).toBeGreaterThan(0);
      expect(config.pacmanSpeed).toBeGreaterThan(0);
      expect(config.frightenedDuration).toBeGreaterThanOrEqual(0);
      expect(config.fruitType).toBeDefined();
      expect(config.mazeColor).toBeDefined();
    }
  });
});
