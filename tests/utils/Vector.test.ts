/**
 * Vector class TDD tests
 */

import { describe, it, expect } from 'vitest';
import { Vector } from '../../src/utils/Vector';

describe('Vector', () => {
  describe('creation', () => {
    it('should create a vector with default values', () => {
      const v = new Vector();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });

    it('should create a vector with specified values', () => {
      const v = new Vector(3, 4);
      expect(v.x).toBe(3);
      expect(v.y).toBe(4);
    });

    it('should create a vector using static create method', () => {
      const v = Vector.create(5, 6);
      expect(v.x).toBe(5);
      expect(v.y).toBe(6);
    });

    it('should create a zero vector', () => {
      const v = Vector.zero();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });
  });

  describe('cloning and copying', () => {
    it('should clone a vector', () => {
      const v1 = new Vector(3, 4);
      const v2 = v1.clone();
      expect(v2.x).toBe(3);
      expect(v2.y).toBe(4);
      expect(v2).not.toBe(v1);
    });

    it('should copy from another vector', () => {
      const v1 = new Vector(3, 4);
      const v2 = new Vector();
      v2.copy(v1);
      expect(v2.x).toBe(3);
      expect(v2.y).toBe(4);
    });

    it('should set components', () => {
      const v = new Vector();
      v.set(7, 8);
      expect(v.x).toBe(7);
      expect(v.y).toBe(8);
    });
  });

  describe('arithmetic operations', () => {
    it('should add vectors', () => {
      const v1 = new Vector(1, 2);
      const v2 = new Vector(3, 4);
      v1.add(v2);
      expect(v1.x).toBe(4);
      expect(v1.y).toBe(6);
    });

    it('should subtract vectors', () => {
      const v1 = new Vector(5, 7);
      const v2 = new Vector(2, 3);
      v1.subtract(v2);
      expect(v1.x).toBe(3);
      expect(v1.y).toBe(4);
    });

    it('should multiply by scalar', () => {
      const v = new Vector(3, 4);
      v.multiply(2);
      expect(v.x).toBe(6);
      expect(v.y).toBe(8);
    });

    it('should divide by scalar', () => {
      const v = new Vector(6, 8);
      v.divide(2);
      expect(v.x).toBe(3);
      expect(v.y).toBe(4);
    });

    it('should handle division by zero gracefully', () => {
      const v = new Vector(6, 8);
      v.divide(0);
      expect(v.x).toBe(6);
      expect(v.y).toBe(8);
    });
  });

  describe('magnitude and normalization', () => {
    it('should calculate magnitude', () => {
      const v = new Vector(3, 4);
      expect(v.magnitude()).toBe(5);
    });

    it('should calculate squared magnitude', () => {
      const v = new Vector(3, 4);
      expect(v.magnitudeSquared()).toBe(25);
    });

    it('should normalize to unit vector', () => {
      const v = new Vector(3, 4);
      v.normalize();
      expect(v.magnitude()).toBeCloseTo(1, 5);
      expect(v.x).toBeCloseTo(0.6, 5);
      expect(v.y).toBeCloseTo(0.8, 5);
    });

    it('should handle normalizing zero vector', () => {
      const v = Vector.zero();
      v.normalize();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });
  });

  describe('distance calculations', () => {
    it('should calculate distance to another vector', () => {
      const v1 = new Vector(0, 0);
      const v2 = new Vector(3, 4);
      expect(v1.distanceTo(v2)).toBe(5);
    });

    it('should calculate squared distance', () => {
      const v1 = new Vector(0, 0);
      const v2 = new Vector(3, 4);
      expect(v1.distanceSquaredTo(v2)).toBe(25);
    });

    it('should calculate Manhattan distance', () => {
      const v1 = new Vector(0, 0);
      const v2 = new Vector(3, 4);
      expect(v1.manhattanDistanceTo(v2)).toBe(7);
    });
  });

  describe('dot product', () => {
    it('should calculate dot product', () => {
      const v1 = new Vector(1, 2);
      const v2 = new Vector(3, 4);
      expect(v1.dot(v2)).toBe(11);
    });

    it('should return 0 for perpendicular vectors', () => {
      const v1 = new Vector(1, 0);
      const v2 = new Vector(0, 1);
      expect(v1.dot(v2)).toBe(0);
    });
  });

  describe('equality checks', () => {
    it('should check exact equality', () => {
      const v1 = new Vector(3, 4);
      const v2 = new Vector(3, 4);
      const v3 = new Vector(3, 5);
      expect(v1.equals(v2)).toBe(true);
      expect(v1.equals(v3)).toBe(false);
    });

    it('should check approximate equality', () => {
      const v1 = new Vector(3.0001, 4.0001);
      const v2 = new Vector(3, 4);
      expect(v1.equalsApprox(v2, 0.001)).toBe(true);
      expect(v1.equalsApprox(v2, 0.00001)).toBe(false);
    });
  });

  describe('rounding operations', () => {
    it('should floor components', () => {
      const v = new Vector(3.7, 4.2);
      v.floor();
      expect(v.x).toBe(3);
      expect(v.y).toBe(4);
    });

    it('should round components', () => {
      const v = new Vector(3.4, 4.6);
      v.round();
      expect(v.x).toBe(3);
      expect(v.y).toBe(5);
    });
  });

  describe('interpolation', () => {
    it('should lerp between vectors', () => {
      const v1 = new Vector(0, 0);
      const v2 = new Vector(10, 10);
      v1.lerp(v2, 0.5);
      expect(v1.x).toBe(5);
      expect(v1.y).toBe(5);
    });

    it('should lerp at t=0 to stay same', () => {
      const v1 = new Vector(0, 0);
      const v2 = new Vector(10, 10);
      v1.lerp(v2, 0);
      expect(v1.x).toBe(0);
      expect(v1.y).toBe(0);
    });

    it('should lerp at t=1 to reach target', () => {
      const v1 = new Vector(0, 0);
      const v2 = new Vector(10, 10);
      v1.lerp(v2, 1);
      expect(v1.x).toBe(10);
      expect(v1.y).toBe(10);
    });
  });

  describe('tile conversion', () => {
    it('should convert to tile position', () => {
      const v = new Vector(25, 35);
      const tile = v.toTile(16);
      expect(tile.col).toBe(1);
      expect(tile.row).toBe(2);
    });

    it('should create vector from tile position', () => {
      const v = Vector.fromTile(2, 3, 16);
      expect(v.x).toBe(40);  // 2 * 16 + 8
      expect(v.y).toBe(56);  // 3 * 16 + 8
    });
  });

  describe('string representation', () => {
    it('should convert to string', () => {
      const v = new Vector(3.14159, 2.71828);
      expect(v.toString()).toBe('Vector(3.14, 2.72)');
    });
  });
});
