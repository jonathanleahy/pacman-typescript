/**
 * Intermission System
 *
 * Animated cutscenes that play after completing levels 2, 3, 4, and 5.
 * Each scene features Pac-Man and ghosts in unique animated scenarios.
 */

import { Colors, Direction } from '../constants';

/** Sprite data for animated characters */
export interface CutsceneSprite {
  x: number;
  y: number;
  type: 'pacman' | 'ghost' | 'bigpacman';
  color?: string;
  direction: number;
  scale: number;
  frightened?: boolean;
  animFrame: number;
}

/** Scene configuration */
interface SceneConfig {
  title: string;
  message: string;
  duration: number;
  setup: () => CutsceneSprite[];
  update: (sprites: CutsceneSprite[], frame: number, duration: number) => void;
}

export class Intermission {
  private isPlaying: boolean = false;
  private currentScene: number = 0;
  private sceneTimer: number = 0;
  private onComplete: (() => void) | null = null;
  private skipHandler: ((e: KeyboardEvent) => void) | null = null;
  private sprites: CutsceneSprite[] = [];
  private animCounter: number = 0;

  static readonly SCENE_DURATION = 300; // 5 seconds at 60fps
  static readonly MAX_LEVEL = 5;

  /** Scene configurations for each level */
  private readonly scenes: Record<number, SceneConfig> = {
    // ACT I: The Chase - Ghosts chase Pac-Man across the screen
    2: {
      title: 'ACT I',
      message: 'THE CHASE',
      duration: 300,
      setup: () => [
        { x: 750, y: 200, type: 'pacman', direction: Direction.LEFT, scale: 1.5, animFrame: 0 },
        { x: 850, y: 200, type: 'ghost', color: Colors.BLINKY, direction: Direction.LEFT, scale: 1.5, animFrame: 0 },
        { x: 920, y: 200, type: 'ghost', color: Colors.PINKY, direction: Direction.LEFT, scale: 1.5, animFrame: 0 },
        { x: 990, y: 200, type: 'ghost', color: Colors.INKY, direction: Direction.LEFT, scale: 1.5, animFrame: 0 },
        { x: 1060, y: 200, type: 'ghost', color: Colors.CLYDE, direction: Direction.LEFT, scale: 1.5, animFrame: 0 },
      ],
      update: (sprites, frame, _duration) => {
        const speed = 4;
        for (const sprite of sprites) {
          sprite.x -= speed;
          sprite.animFrame = Math.floor(frame / 8) % 4;
        }
        // Loop when off screen
        if (sprites[0].x < -100) {
          sprites[0].x = 750;
          sprites[1].x = 850;
          sprites[2].x = 920;
          sprites[3].x = 990;
          sprites[4].x = 1060;
        }
      },
    },

    // ACT II: The Reversal - Giant Pac-Man chases frightened ghosts
    3: {
      title: 'ACT II',
      message: 'THE TABLES TURN',
      duration: 300,
      setup: () => [
        { x: -100, y: 200, type: 'ghost', color: Colors.BLINKY, direction: Direction.RIGHT, scale: 1.5, frightened: true, animFrame: 0 },
        { x: -170, y: 200, type: 'ghost', color: Colors.PINKY, direction: Direction.RIGHT, scale: 1.5, frightened: true, animFrame: 0 },
        { x: -240, y: 200, type: 'ghost', color: Colors.INKY, direction: Direction.RIGHT, scale: 1.5, frightened: true, animFrame: 0 },
        { x: -310, y: 200, type: 'ghost', color: Colors.CLYDE, direction: Direction.RIGHT, scale: 1.5, frightened: true, animFrame: 0 },
        { x: -450, y: 200, type: 'bigpacman', direction: Direction.RIGHT, scale: 3, animFrame: 0 },
      ],
      update: (sprites, frame) => {
        const speed = 5;
        for (const sprite of sprites) {
          sprite.x += speed;
          sprite.animFrame = Math.floor(frame / 6) % 4;
        }
        // Loop when off screen
        if (sprites[0].x > 800) {
          sprites[0].x = -100;
          sprites[1].x = -170;
          sprites[2].x = -240;
          sprites[3].x = -310;
          sprites[4].x = -450;
        }
      },
    },

    // ACT III: The Dance - Everyone bouncing and spinning
    4: {
      title: 'ACT III',
      message: 'THE CELEBRATION',
      duration: 300,
      setup: () => [
        { x: 336, y: 200, type: 'pacman', direction: Direction.RIGHT, scale: 2, animFrame: 0 },
        { x: 200, y: 150, type: 'ghost', color: Colors.BLINKY, direction: Direction.DOWN, scale: 1.5, animFrame: 0 },
        { x: 472, y: 150, type: 'ghost', color: Colors.PINKY, direction: Direction.DOWN, scale: 1.5, animFrame: 0 },
        { x: 200, y: 280, type: 'ghost', color: Colors.INKY, direction: Direction.UP, scale: 1.5, animFrame: 0 },
        { x: 472, y: 280, type: 'ghost', color: Colors.CLYDE, direction: Direction.UP, scale: 1.5, animFrame: 0 },
      ],
      update: (sprites, frame) => {
        // Pac-Man spins in center
        sprites[0].direction = Math.floor(frame / 15) % 4;
        sprites[0].animFrame = Math.floor(frame / 6) % 4;
        sprites[0].y = 200 + Math.sin(frame * 0.1) * 20;

        // Ghosts orbit around Pac-Man
        const centerX = 336;
        const centerY = 200;
        const radius = 120;
        const angleOffset = frame * 0.03;

        for (let i = 1; i < sprites.length; i++) {
          const angle = angleOffset + (i - 1) * (Math.PI / 2);
          sprites[i].x = centerX + Math.cos(angle) * radius;
          sprites[i].y = centerY + Math.sin(angle) * radius;
          sprites[i].animFrame = Math.floor(frame / 8) % 2;
        }
      },
    },

    // FINALE: Victory Parade - Pac-Man leads friendly ghosts
    5: {
      title: 'FINALE',
      message: 'VICTORY!',
      duration: 360, // Longer for finale
      setup: () => [
        { x: -100, y: 200, type: 'pacman', direction: Direction.RIGHT, scale: 2, animFrame: 0 },
        { x: -200, y: 180, type: 'ghost', color: Colors.BLINKY, direction: Direction.RIGHT, scale: 1.5, animFrame: 0 },
        { x: -270, y: 220, type: 'ghost', color: Colors.PINKY, direction: Direction.RIGHT, scale: 1.5, animFrame: 0 },
        { x: -340, y: 180, type: 'ghost', color: Colors.INKY, direction: Direction.RIGHT, scale: 1.5, animFrame: 0 },
        { x: -410, y: 220, type: 'ghost', color: Colors.CLYDE, direction: Direction.RIGHT, scale: 1.5, animFrame: 0 },
      ],
      update: (sprites, frame) => {
        const speed = 3;
        const waveHeight = 15;
        const waveSpeed = 0.15;

        for (let i = 0; i < sprites.length; i++) {
          sprites[i].x += speed;
          // Bouncing wave motion
          const baseY = i === 0 ? 200 : (i % 2 === 0 ? 180 : 220);
          sprites[i].y = baseY + Math.sin(frame * waveSpeed + i * 0.8) * waveHeight;
          sprites[i].animFrame = Math.floor(frame / 8) % 4;
        }
      },
    },
  };

  /**
   * Check if an intermission should play after completing a level
   */
  static shouldPlayAfterLevel(level: number): boolean {
    return level >= 2 && level <= 5;
  }

  /**
   * Check if level is the final level
   */
  static isFinalLevel(level: number): boolean {
    return level >= Intermission.MAX_LEVEL;
  }

  /**
   * Start playing an intermission for a specific level
   */
  start(level: number, onComplete: () => void): void {
    this.isPlaying = true;
    this.currentScene = level;
    this.sceneTimer = 0;
    this.animCounter = 0;
    this.onComplete = onComplete;

    // Initialize sprites for this scene
    const scene = this.scenes[level];
    if (scene) {
      this.sprites = scene.setup();
    } else {
      this.sprites = [];
    }

    this.enableSkip();
  }

  /**
   * Check if intermission is currently playing
   */
  isActive(): boolean {
    return this.isPlaying;
  }

  /**
   * Get the current scene/level being shown
   */
  getScene(): number {
    return this.currentScene;
  }

  /**
   * Update the intermission (call each frame)
   */
  update(): void {
    if (!this.isPlaying) return;

    const scene = this.scenes[this.currentScene];
    const duration = scene?.duration ?? Intermission.SCENE_DURATION;

    // Update sprite animations
    if (scene) {
      scene.update(this.sprites, this.sceneTimer, duration);
    }

    this.sceneTimer++;
    this.animCounter++;

    if (this.sceneTimer >= duration) {
      this.complete();
    }
  }

  /**
   * Skip the current intermission
   */
  skip(): void {
    if (this.isPlaying) {
      this.complete();
    }
  }

  /**
   * Get progress through current scene (0-1)
   */
  getProgress(): number {
    const scene = this.scenes[this.currentScene];
    const duration = scene?.duration ?? Intermission.SCENE_DURATION;
    return Math.min(this.sceneTimer / duration, 1);
  }

  /**
   * Get current sprites for rendering
   */
  getSprites(): CutsceneSprite[] {
    return this.sprites;
  }

  /**
   * Enable keyboard skip
   */
  private enableSkip(): void {
    this.skipHandler = (_e: KeyboardEvent) => {
      this.skip();
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', this.skipHandler);
    }
  }

  /**
   * Disable keyboard skip
   */
  private disableSkip(): void {
    if (this.skipHandler && typeof document !== 'undefined') {
      document.removeEventListener('keydown', this.skipHandler);
      this.skipHandler = null;
    }
  }

  /**
   * Complete the intermission
   */
  private complete(): void {
    this.isPlaying = false;
    this.sprites = [];
    this.disableSkip();
    if (this.onComplete) {
      this.onComplete();
    }
  }

  /**
   * Get scene description for rendering
   */
  getSceneDescription(): { title: string; message: string } {
    const scene = this.scenes[this.currentScene];
    if (scene) {
      return { title: scene.title, message: scene.message };
    }
    return { title: '', message: '' };
  }
}
