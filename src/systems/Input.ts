/**
 * Input System
 * Handles keyboard and touch input for the game
 */

import { Direction, DirectionType } from '../constants';
import { InputState } from '../types';

export class Input {
  private state: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    pause: false,
    start: false,
  };

  private queuedDirection: DirectionType = Direction.NONE;
  private enabled = true;

  /** Cheat code buffer - tracks recent key presses */
  private cheatBuffer: string = '';
  private cheatActivated: boolean = false;

  /** Cheat codes */
  private static readonly CHEAT_SKIP_LEVEL = '===';

  constructor() {
    this.setupKeyboardListeners();
    this.setupTouchListeners();
  }

  /**
   * Setup keyboard event listeners
   */
  private setupKeyboardListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  /**
   * Setup touch event listeners for mobile
   */
  private setupTouchListeners(): void {
    let touchStartX = 0;
    let touchStartY = 0;

    document.addEventListener('touchstart', (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    });

    document.addEventListener('touchend', (e: TouchEvent) => {
      if (!this.enabled) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      // Minimum swipe distance
      const minSwipe = 30;

      if (Math.abs(deltaX) < minSwipe && Math.abs(deltaY) < minSwipe) {
        // Tap - treat as start
        this.state.start = true;
        return;
      }

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 0) {
          this.queuedDirection = Direction.RIGHT;
        } else {
          this.queuedDirection = Direction.LEFT;
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          this.queuedDirection = Direction.DOWN;
        } else {
          this.queuedDirection = Direction.UP;
        }
      }
    });
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(e: KeyboardEvent): void {
    // Track cheat code input (works even when disabled)
    if (e.key === '=') {
      this.cheatBuffer += '=';
      // Keep only last 3 characters
      if (this.cheatBuffer.length > 3) {
        this.cheatBuffer = this.cheatBuffer.slice(-3);
      }
      // Check for cheat activation
      if (this.cheatBuffer === Input.CHEAT_SKIP_LEVEL) {
        this.cheatActivated = true;
        this.cheatBuffer = '';
      }
    } else {
      // Reset buffer on any other key
      this.cheatBuffer = '';
    }

    if (!this.enabled) return;

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.state.up = true;
        this.queuedDirection = Direction.UP;
        e.preventDefault();
        break;

      case 'ArrowDown':
      case 's':
      case 'S':
        this.state.down = true;
        this.queuedDirection = Direction.DOWN;
        e.preventDefault();
        break;

      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.state.left = true;
        this.queuedDirection = Direction.LEFT;
        e.preventDefault();
        break;

      case 'ArrowRight':
      case 'd':
      case 'D':
        this.state.right = true;
        this.queuedDirection = Direction.RIGHT;
        e.preventDefault();
        break;

      case 'p':
      case 'P':
      case 'Escape':
        this.state.pause = true;
        break;

      case ' ':
      case 'Enter':
        this.state.start = true;
        e.preventDefault();
        break;
    }

    // Track cheat codes (any printable character)
    if (e.key.length === 1) {
      this.cheatBuffer += e.key;
      // Keep buffer small
      if (this.cheatBuffer.length > 10) {
        this.cheatBuffer = this.cheatBuffer.slice(-10);
      }
      // Check for cheat codes
      if (this.cheatBuffer.endsWith(Input.CHEAT_SKIP_LEVEL)) {
        this.cheatActivated = true;
        this.cheatBuffer = '';
      }
    }
  }

  /**
   * Handle keyup events
   */
  private handleKeyUp(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.state.up = false;
        break;

      case 'ArrowDown':
      case 's':
      case 'S':
        this.state.down = false;
        break;

      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.state.left = false;
        break;

      case 'ArrowRight':
      case 'd':
      case 'D':
        this.state.right = false;
        break;

      case 'p':
      case 'P':
      case 'Escape':
        this.state.pause = false;
        break;

      case ' ':
      case 'Enter':
        this.state.start = false;
        break;
    }
  }

  /**
   * Get the current queued direction
   */
  getQueuedDirection(): DirectionType {
    return this.queuedDirection;
  }

  /**
   * Clear the queued direction
   */
  clearQueuedDirection(): void {
    this.queuedDirection = Direction.NONE;
  }

  /**
   * Get current input state
   */
  getState(): InputState {
    return { ...this.state };
  }

  /**
   * Check if a direction key is currently pressed
   */
  isDirectionPressed(direction: DirectionType): boolean {
    switch (direction) {
      case Direction.UP: return this.state.up;
      case Direction.DOWN: return this.state.down;
      case Direction.LEFT: return this.state.left;
      case Direction.RIGHT: return this.state.right;
      default: return false;
    }
  }

  /**
   * Check if start/action was pressed
   */
  isStartPressed(): boolean {
    const pressed = this.state.start;
    this.state.start = false; // Consume the press
    return pressed;
  }

  /**
   * Check if pause was pressed
   */
  isPausePressed(): boolean {
    const pressed = this.state.pause;
    this.state.pause = false; // Consume the press
    return pressed;
  }

  /**
   * Check if skip level cheat was activated
   */
  isCheatActivated(): boolean {
    const activated = this.cheatActivated;
    this.cheatActivated = false; // Consume the activation
    return activated;
  }

  /**
   * Enable input processing
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable input processing
   */
  disable(): void {
    this.enabled = false;
    this.queuedDirection = Direction.NONE;
  }

  /**
   * Reset all input state
   */
  reset(): void {
    this.state = {
      up: false,
      down: false,
      left: false,
      right: false,
      pause: false,
      start: false,
    };
    this.queuedDirection = Direction.NONE;
  }

  /**
   * Check if skip level cheat was activated (consumes the activation)
   */
  isSkipLevelCheatActivated(): boolean {
    if (this.cheatActivated) {
      this.cheatActivated = false;
      return true;
    }
    return false;
  }

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }
}
