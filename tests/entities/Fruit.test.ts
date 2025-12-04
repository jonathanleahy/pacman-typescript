/**
 * Fruit Entity TDD tests
 *
 * Tests for bonus fruit that appears twice per level:
 * - First at 70 pellets eaten
 * - Second at 170 pellets eaten
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Fruit, FruitType } from '../../src/entities/Fruit';
import { SCALED_TILE } from '../../src/constants';

describe('Fruit', () => {
  let fruit: Fruit;

  beforeEach(() => {
    fruit = new Fruit(FruitType.CHERRY);
  });

  describe('initialization', () => {
    it('should spawn at center of maze (tile 13.5, 17)', () => {
      // Tile col is 14 because position is 13.5 * SCALED_TILE + SCALED_TILE/2
      // which places it in tile 14 when floored
      expect(fruit.getTile().col).toBe(14);
      expect(fruit.getTile().row).toBe(17);
    });

    it('should have correct fruit type', () => {
      expect(fruit.type).toBe(FruitType.CHERRY);
    });

    it('should be active when created', () => {
      expect(fruit.isActive()).toBe(true);
    });

    it('should have despawn timer set', () => {
      expect(fruit.getRemainingTime()).toBeGreaterThan(0);
    });
  });

  describe('fruit types and points', () => {
    it('should award 100 points for cherry (level 1)', () => {
      const cherry = new Fruit(FruitType.CHERRY);
      expect(cherry.getPoints()).toBe(100);
    });

    it('should award 300 points for strawberry (level 2)', () => {
      const strawberry = new Fruit(FruitType.STRAWBERRY);
      expect(strawberry.getPoints()).toBe(300);
    });

    it('should award 500 points for orange (level 3-4)', () => {
      const orange = new Fruit(FruitType.ORANGE);
      expect(orange.getPoints()).toBe(500);
    });

    it('should award 700 points for apple (level 5-6)', () => {
      const apple = new Fruit(FruitType.APPLE);
      expect(apple.getPoints()).toBe(700);
    });

    it('should award 1000 points for melon (level 7-8)', () => {
      const melon = new Fruit(FruitType.MELON);
      expect(melon.getPoints()).toBe(1000);
    });

    it('should award 2000 points for galaxian (level 9-10)', () => {
      const galaxian = new Fruit(FruitType.GALAXIAN);
      expect(galaxian.getPoints()).toBe(2000);
    });

    it('should award 3000 points for bell (level 11-12)', () => {
      const bell = new Fruit(FruitType.BELL);
      expect(bell.getPoints()).toBe(3000);
    });

    it('should award 5000 points for key (level 13+)', () => {
      const key = new Fruit(FruitType.KEY);
      expect(key.getPoints()).toBe(5000);
    });
  });

  describe('despawn timer', () => {
    it('should despawn after approximately 10 seconds (600 frames)', () => {
      // Fast-forward through updates
      for (let i = 0; i < 600; i++) {
        fruit.update();
      }
      expect(fruit.isActive()).toBe(false);
    });

    it('should remain active before timeout', () => {
      for (let i = 0; i < 300; i++) {
        fruit.update();
      }
      expect(fruit.isActive()).toBe(true);
    });
  });

  describe('collection', () => {
    it('should deactivate when collected', () => {
      fruit.collect();
      expect(fruit.isActive()).toBe(false);
    });

    it('should return points when collected', () => {
      const points = fruit.collect();
      expect(points).toBe(100); // Cherry
    });

    it('should return 0 if collected twice', () => {
      fruit.collect();
      const points = fruit.collect();
      expect(points).toBe(0);
    });
  });

  describe('position', () => {
    it('should be positioned at pixel center of spawn tile', () => {
      const expectedX = 13.5 * SCALED_TILE + SCALED_TILE / 2;
      const expectedY = 17 * SCALED_TILE + SCALED_TILE / 2;
      // Allow small tolerance for floating point
      expect(Math.abs(fruit.position.x - expectedX)).toBeLessThan(SCALED_TILE);
      expect(Math.abs(fruit.position.y - expectedY)).toBeLessThan(SCALED_TILE);
    });
  });
});

describe('FruitType helpers', () => {
  it('should get correct fruit type for level 1', () => {
    expect(Fruit.getFruitTypeForLevel(1)).toBe(FruitType.CHERRY);
  });

  it('should get correct fruit type for level 2', () => {
    expect(Fruit.getFruitTypeForLevel(2)).toBe(FruitType.STRAWBERRY);
  });

  it('should get correct fruit type for level 3', () => {
    expect(Fruit.getFruitTypeForLevel(3)).toBe(FruitType.ORANGE);
  });

  it('should get correct fruit type for level 4', () => {
    expect(Fruit.getFruitTypeForLevel(4)).toBe(FruitType.ORANGE);
  });

  it('should get correct fruit type for level 5', () => {
    expect(Fruit.getFruitTypeForLevel(5)).toBe(FruitType.APPLE);
  });

  it('should get correct fruit type for level 7', () => {
    expect(Fruit.getFruitTypeForLevel(7)).toBe(FruitType.MELON);
  });

  it('should get correct fruit type for level 9', () => {
    expect(Fruit.getFruitTypeForLevel(9)).toBe(FruitType.GALAXIAN);
  });

  it('should get correct fruit type for level 11', () => {
    expect(Fruit.getFruitTypeForLevel(11)).toBe(FruitType.BELL);
  });

  it('should get key for level 13 and beyond', () => {
    expect(Fruit.getFruitTypeForLevel(13)).toBe(FruitType.KEY);
    expect(Fruit.getFruitTypeForLevel(20)).toBe(FruitType.KEY);
    expect(Fruit.getFruitTypeForLevel(100)).toBe(FruitType.KEY);
  });
});
