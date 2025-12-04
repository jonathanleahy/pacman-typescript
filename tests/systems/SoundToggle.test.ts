/**
 * Sound Toggle Tests
 *
 * TDD tests for mute functionality:
 * - Toggle state changes
 * - localStorage persistence
 * - M key shortcut integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Sound } from '../../src/systems/Sound';

describe('Sound Toggle', () => {
  let sound: Sound;
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
    });

    sound = new Sound();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('toggleMute', () => {
    it('should start unmuted by default', () => {
      expect(sound.isMuted()).toBe(false);
    });

    it('should toggle from unmuted to muted', () => {
      const result = sound.toggleMute();
      expect(result).toBe(true);
      expect(sound.isMuted()).toBe(true);
    });

    it('should toggle from muted back to unmuted', () => {
      sound.toggleMute(); // mute
      const result = sound.toggleMute(); // unmute
      expect(result).toBe(false);
      expect(sound.isMuted()).toBe(false);
    });

    it('should return the new mute state', () => {
      expect(sound.toggleMute()).toBe(true);
      expect(sound.toggleMute()).toBe(false);
      expect(sound.toggleMute()).toBe(true);
    });
  });

  describe('setMuted', () => {
    it('should set muted state directly', () => {
      sound.setMuted(true);
      expect(sound.isMuted()).toBe(true);
    });

    it('should set unmuted state directly', () => {
      sound.setMuted(true);
      sound.setMuted(false);
      expect(sound.isMuted()).toBe(false);
    });
  });

  describe('localStorage persistence', () => {
    it('should save mute state to localStorage when toggled', () => {
      sound.toggleMute();
      expect(localStorage.setItem).toHaveBeenCalledWith('pacman-sound-muted', 'true');
    });

    it('should save unmuted state to localStorage', () => {
      sound.toggleMute(); // mute
      sound.toggleMute(); // unmute
      expect(localStorage.setItem).toHaveBeenLastCalledWith('pacman-sound-muted', 'false');
    });

    it('should load mute state from localStorage on init', () => {
      localStorageMock['pacman-sound-muted'] = 'true';
      sound.loadMutePreference();
      expect(sound.isMuted()).toBe(true);
    });

    it('should remain unmuted if no localStorage value', () => {
      sound.loadMutePreference();
      expect(sound.isMuted()).toBe(false);
    });

    it('should handle invalid localStorage values gracefully', () => {
      localStorageMock['pacman-sound-muted'] = 'invalid';
      sound.loadMutePreference();
      expect(sound.isMuted()).toBe(false);
    });
  });

  describe('saveMutePreference', () => {
    it('should save current mute state', () => {
      sound.setMuted(true);
      sound.saveMutePreference();
      expect(localStorage.setItem).toHaveBeenCalledWith('pacman-sound-muted', 'true');
    });
  });
});

describe('Sound Toggle UI Integration', () => {
  describe('Mute button', () => {
    it('should have a STORAGE_KEY constant', () => {
      expect(Sound.STORAGE_KEY).toBe('pacman-sound-muted');
    });
  });
});

describe('M Key Shortcut', () => {
  let sound: Sound;
  let keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  beforeEach(() => {
    sound = new Sound();

    // Capture the keydown handler
    vi.spyOn(document, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'keydown') {
        keydownHandler = handler as (e: KeyboardEvent) => void;
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    keydownHandler = null;
  });

  it('should register M key listener when enabled', () => {
    sound.enableMuteShortcut();
    expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should toggle mute when M key is pressed', () => {
    sound.enableMuteShortcut();

    // Simulate M key press
    if (keydownHandler) {
      const event = new KeyboardEvent('keydown', { key: 'm' });
      keydownHandler(event);
    }

    expect(sound.isMuted()).toBe(true);
  });

  it('should toggle mute when uppercase M is pressed', () => {
    sound.enableMuteShortcut();

    if (keydownHandler) {
      const event = new KeyboardEvent('keydown', { key: 'M' });
      keydownHandler(event);
    }

    expect(sound.isMuted()).toBe(true);
  });

  it('should not toggle on other keys', () => {
    sound.enableMuteShortcut();

    if (keydownHandler) {
      const event = new KeyboardEvent('keydown', { key: 'a' });
      keydownHandler(event);
    }

    expect(sound.isMuted()).toBe(false);
  });

  it('should be able to disable the shortcut', () => {
    const removeListenerSpy = vi.spyOn(document, 'removeEventListener');

    sound.enableMuteShortcut();
    sound.disableMuteShortcut();

    expect(removeListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
