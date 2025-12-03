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
   * Cleanup event listeners
   */
  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }
}
