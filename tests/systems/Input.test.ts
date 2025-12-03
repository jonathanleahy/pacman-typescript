/**
 * Input System TDD tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Direction } from '../../src/constants';

describe('Input', () => {
  let Input: typeof import('../../src/systems/Input').Input;
  let input: InstanceType<typeof Input>;

  beforeEach(async () => {
    // Setup minimal DOM
    const listeners: Record<string, EventListener[]> = {};
    global.document = {
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(handler);
      }),
      removeEventListener: vi.fn((event: string, handler: EventListener) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter(h => h !== handler);
        }
      }),
      // Helper to trigger events in tests
      _trigger: (event: string, data: object) => {
        if (listeners[event]) {
          listeners[event].forEach(handler => handler(data as Event));
        }
      },
    } as unknown as Document;

    const module = await import('../../src/systems/Input');
    Input = module.Input;
    input = new Input();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should setup keyboard listeners', () => {
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
    });

    it('should setup touch listeners', () => {
      expect(document.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith('touchend', expect.any(Function));
    });
  });

  describe('keyboard input', () => {
    it('should queue UP direction on ArrowUp', () => {
      (document as unknown as { _trigger: Function })._trigger('keydown', {
        key: 'ArrowUp',
        preventDefault: vi.fn(),
      });

      expect(input.getQueuedDirection()).toBe(Direction.UP);
    });

    it('should queue DOWN direction on ArrowDown', () => {
      (document as unknown as { _trigger: Function })._trigger('keydown', {
        key: 'ArrowDown',
        preventDefault: vi.fn(),
      });

      expect(input.getQueuedDirection()).toBe(Direction.DOWN);
    });

    it('should queue LEFT direction on ArrowLeft', () => {
      (document as unknown as { _trigger: Function })._trigger('keydown', {
        key: 'ArrowLeft',
        preventDefault: vi.fn(),
      });

      expect(input.getQueuedDirection()).toBe(Direction.LEFT);
    });

    it('should queue RIGHT direction on ArrowRight', () => {
      (document as unknown as { _trigger: Function })._trigger('keydown', {
        key: 'ArrowRight',
        preventDefault: vi.fn(),
      });

      expect(input.getQueuedDirection()).toBe(Direction.RIGHT);
    });

    it('should support WASD keys', () => {
      (document as unknown as { _trigger: Function })._trigger('keydown', {
        key: 'w',
        preventDefault: vi.fn(),
      });
      expect(input.getQueuedDirection()).toBe(Direction.UP);

      (document as unknown as { _trigger: Function })._trigger('keydown', {
        key: 's',
        preventDefault: vi.fn(),
      });
      expect(input.getQueuedDirection()).toBe(Direction.DOWN);

      (document as unknown as { _trigger: Function })._trigger('keydown', {
        key: 'a',
        preventDefault: vi.fn(),
      });
      expect(input.getQueuedDirection()).toBe(Direction.LEFT);

      (document as unknown as { _trigger: Function })._trigger('keydown', {
        key: 'd',
        preventDefault: vi.fn(),
      });
      expect(input.getQueuedDirection()).toBe(Direction.RIGHT);
    });
  });

  describe('state tracking', () => {
    it('should track key down state', () => {
      (document as unknown as { _trigger: Function })._trigger('keydown', {
        key: 'ArrowUp',
        preventDefault: vi.fn(),
      });

      const state = input.getState();
      expect(state.up).toBe(true);
    });

    it('should clear key state on keyup', () => {
      (document as unknown as { _trigger: Function })._trigger('keydown', {
        key: 'ArrowUp',
        preventDefault: vi.fn(),
      });

      (document as unknown as { _trigger: Function })._trigger('keyup', {
        key: 'ArrowUp',
      });

      const state = input.getState();
      expect(state.up).toBe(false);
    });
  });

  describe('pause input', () => {
    it('should detect pause key press', () => {
      (document as unknown as { _trigger: Function })._trigger('keydown', {
        key: 'p',
        preventDefault: vi.fn(),
      });

      expect(input.isPausePressed()).toBe(true);
    });

    it('should consume pause press', () => {
      (document as unknown as { _trigger: Function })._trigger('keydown', {
        key: 'Escape',
        preventDefault: vi.fn(),
      });

      input.isPausePressed(); // First call consumes
      expect(input.isPausePressed()).toBe(false);
    });
  });

  describe('start input', () => {
    it('should detect space as start', () => {
      (document as unknown as { _trigger: Function })._trigger('keydown', {
        key: ' ',
        preventDefault: vi.fn(),
      });

      expect(input.isStartPressed()).toBe(true);
    });

    it('should detect enter as start', () => {
      (document as unknown as { _trigger: Function })._trigger('keydown', {
        key: 'Enter',
        preventDefault: vi.fn(),
      });

      expect(input.isStartPressed()).toBe(true);
    });

    it('should consume start press', () => {
      (document as unknown as { _trigger: Function })._trigger('keydown', {
        key: ' ',
        preventDefault: vi.fn(),
      });

      input.isStartPressed();
      expect(input.isStartPressed()).toBe(false);
    });
  });

  describe('enable/disable', () => {
    it('should ignore input when disabled', () => {
      input.disable();

      (document as unknown as { _trigger: Function })._trigger('keydown', {
        key: 'ArrowUp',
        preventDefault: vi.fn(),
      });

      expect(input.getQueuedDirection()).toBe(Direction.NONE);
    });

    it('should process input when re-enabled', () => {
      input.disable();
      input.enable();

      (document as unknown as { _trigger: Function })._trigger('keydown', {
        key: 'ArrowUp',
        preventDefault: vi.fn(),
      });

      expect(input.getQueuedDirection()).toBe(Direction.UP);
    });
  });

  describe('reset', () => {
    it('should clear all input state', () => {
      (document as unknown as { _trigger: Function })._trigger('keydown', {
        key: 'ArrowUp',
        preventDefault: vi.fn(),
      });

      input.reset();

      expect(input.getQueuedDirection()).toBe(Direction.NONE);
      expect(input.getState().up).toBe(false);
    });
  });

  describe('clearQueuedDirection', () => {
    it('should clear only the queued direction', () => {
      (document as unknown as { _trigger: Function })._trigger('keydown', {
        key: 'ArrowUp',
        preventDefault: vi.fn(),
      });

      input.clearQueuedDirection();

      expect(input.getQueuedDirection()).toBe(Direction.NONE);
      // State should still be tracked
      expect(input.getState().up).toBe(true);
    });
  });

  describe('isDirectionPressed', () => {
    it('should return true when direction key is held', () => {
      (document as unknown as { _trigger: Function })._trigger('keydown', {
        key: 'ArrowRight',
        preventDefault: vi.fn(),
      });

      expect(input.isDirectionPressed(Direction.RIGHT)).toBe(true);
      expect(input.isDirectionPressed(Direction.LEFT)).toBe(false);
    });
  });
});
