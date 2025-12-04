/**
 * Tests for Intermission System
 *
 * TDD tests for cutscenes that play after completing levels 2, 3, 4, and 5.
 * Max level is 5 - completing it wins the game.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Intermission } from '../../src/systems/Intermission';

describe('Intermission', () => {
  let intermission: Intermission;

  beforeEach(() => {
    intermission = new Intermission();
  });

  describe('shouldPlayAfterLevel', () => {
    it('should NOT play after level 1', () => {
      expect(Intermission.shouldPlayAfterLevel(1)).toBe(false);
    });

    it('should play after level 2', () => {
      expect(Intermission.shouldPlayAfterLevel(2)).toBe(true);
    });

    it('should play after level 3', () => {
      expect(Intermission.shouldPlayAfterLevel(3)).toBe(true);
    });

    it('should play after level 4', () => {
      expect(Intermission.shouldPlayAfterLevel(4)).toBe(true);
    });

    it('should play after level 5 (final level)', () => {
      expect(Intermission.shouldPlayAfterLevel(5)).toBe(true);
    });

    it('should NOT play after level 6 (beyond max)', () => {
      expect(Intermission.shouldPlayAfterLevel(6)).toBe(false);
    });
  });

  describe('isFinalLevel', () => {
    it('should return false for levels 1-4', () => {
      expect(Intermission.isFinalLevel(1)).toBe(false);
      expect(Intermission.isFinalLevel(2)).toBe(false);
      expect(Intermission.isFinalLevel(3)).toBe(false);
      expect(Intermission.isFinalLevel(4)).toBe(false);
    });

    it('should return true for level 5', () => {
      expect(Intermission.isFinalLevel(5)).toBe(true);
    });

    it('should return true for levels beyond 5', () => {
      expect(Intermission.isFinalLevel(6)).toBe(true);
      expect(Intermission.isFinalLevel(10)).toBe(true);
    });
  });

  describe('MAX_LEVEL constant', () => {
    it('should be 5', () => {
      expect(Intermission.MAX_LEVEL).toBe(5);
    });
  });

  describe('start', () => {
    it('should set isActive to true', () => {
      intermission.start(2, () => {});
      expect(intermission.isActive()).toBe(true);
    });

    it('should set the current scene to the level', () => {
      intermission.start(3, () => {});
      expect(intermission.getScene()).toBe(3);
    });

    it('should reset progress to 0', () => {
      intermission.start(2, () => {});
      expect(intermission.getProgress()).toBe(0);
    });
  });

  describe('isActive', () => {
    it('should return false initially', () => {
      expect(intermission.isActive()).toBe(false);
    });

    it('should return true after start', () => {
      intermission.start(2, () => {});
      expect(intermission.isActive()).toBe(true);
    });

    it('should return false after completion', () => {
      intermission.start(2, () => {});
      // Run until complete
      for (let i = 0; i < Intermission.SCENE_DURATION; i++) {
        intermission.update();
      }
      expect(intermission.isActive()).toBe(false);
    });
  });

  describe('update', () => {
    it('should increment progress each frame', () => {
      intermission.start(2, () => {});
      const initialProgress = intermission.getProgress();
      intermission.update();
      expect(intermission.getProgress()).toBeGreaterThan(initialProgress);
    });

    it('should complete after SCENE_DURATION frames', () => {
      const onComplete = vi.fn();
      intermission.start(2, onComplete);

      for (let i = 0; i < Intermission.SCENE_DURATION; i++) {
        intermission.update();
      }

      expect(onComplete).toHaveBeenCalled();
      expect(intermission.isActive()).toBe(false);
    });

    it('should do nothing if not playing', () => {
      const initialProgress = intermission.getProgress();
      intermission.update();
      expect(intermission.getProgress()).toBe(initialProgress);
    });
  });

  describe('skip', () => {
    it('should immediately complete the intermission', () => {
      const onComplete = vi.fn();
      intermission.start(2, onComplete);
      intermission.skip();

      expect(onComplete).toHaveBeenCalled();
      expect(intermission.isActive()).toBe(false);
    });

    it('should do nothing if not playing', () => {
      const onComplete = vi.fn();
      intermission.skip();
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('getProgress', () => {
    it('should return 0 at start', () => {
      intermission.start(2, () => {});
      expect(intermission.getProgress()).toBe(0);
    });

    it('should return 1 at completion', () => {
      intermission.start(2, () => {});
      for (let i = 0; i < Intermission.SCENE_DURATION; i++) {
        intermission.update();
      }
      // After completion, check last known progress
      expect(intermission.getProgress()).toBe(1);
    });

    it('should return value between 0 and 1 during playback', () => {
      intermission.start(2, () => {});
      for (let i = 0; i < Intermission.SCENE_DURATION / 2; i++) {
        intermission.update();
      }
      const progress = intermission.getProgress();
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(1);
    });
  });

  describe('getSceneDescription', () => {
    it('should return ACT I for level 2', () => {
      intermission.start(2, () => {});
      const desc = intermission.getSceneDescription();
      expect(desc.title).toBe('ACT I');
      expect(desc.message).toBe('THE CHASE BEGINS');
    });

    it('should return ACT II for level 3', () => {
      intermission.start(3, () => {});
      const desc = intermission.getSceneDescription();
      expect(desc.title).toBe('ACT II');
      expect(desc.message).toBe('THEY CORNER HIM');
    });

    it('should return ACT III for level 4', () => {
      intermission.start(4, () => {});
      const desc = intermission.getSceneDescription();
      expect(desc.title).toBe('ACT III');
      expect(desc.message).toBe('THE TABLES TURN');
    });

    it('should return FINALE for level 5', () => {
      intermission.start(5, () => {});
      const desc = intermission.getSceneDescription();
      expect(desc.title).toBe('FINALE');
      expect(desc.message).toBe('VICTORY!');
    });

    it('should return empty strings for invalid levels', () => {
      intermission.start(1, () => {});
      const desc = intermission.getSceneDescription();
      expect(desc.title).toBe('');
      expect(desc.message).toBe('');
    });
  });

  describe('SCENE_DURATION', () => {
    it('should be 180 frames (3 seconds at 60fps)', () => {
      expect(Intermission.SCENE_DURATION).toBe(180);
    });
  });

  describe('callback behavior', () => {
    it('should call onComplete callback exactly once', () => {
      const onComplete = vi.fn();
      intermission.start(2, onComplete);

      for (let i = 0; i < Intermission.SCENE_DURATION + 10; i++) {
        intermission.update();
      }

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should allow starting a new intermission after completion', () => {
      const onComplete1 = vi.fn();
      const onComplete2 = vi.fn();

      intermission.start(2, onComplete1);
      intermission.skip();

      intermission.start(3, onComplete2);
      expect(intermission.isActive()).toBe(true);
      expect(intermission.getScene()).toBe(3);

      intermission.skip();
      expect(onComplete2).toHaveBeenCalled();
    });
  });
});
