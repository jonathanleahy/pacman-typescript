/**
 * Intermission System
 *
 * Handles cutscenes that play after completing levels 2, 3, 4, and 5.
 * Max level is 5 - completing it wins the game.
 */

export class Intermission {
  private isPlaying: boolean = false;
  private currentScene: number = 0;
  private sceneTimer: number = 0;
  private onComplete: (() => void) | null = null;
  private skipHandler: ((e: KeyboardEvent) => void) | null = null;

  static readonly SCENE_DURATION = 180; // 3 seconds at 60fps
  static readonly MAX_LEVEL = 5;

  /**
   * Check if an intermission should play after completing a level
   */
  static shouldPlayAfterLevel(level: number): boolean {
    // Intermissions after levels 2, 3, 4, and 5
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
    this.onComplete = onComplete;
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

    this.sceneTimer++;
    if (this.sceneTimer >= Intermission.SCENE_DURATION) {
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
    return Math.min(this.sceneTimer / Intermission.SCENE_DURATION, 1);
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
    this.disableSkip();
    if (this.onComplete) {
      this.onComplete();
    }
  }

  /**
   * Get scene description for rendering
   */
  getSceneDescription(): { title: string; message: string } {
    switch (this.currentScene) {
      case 2:
        return { title: 'ACT I', message: 'THE CHASE BEGINS' };
      case 3:
        return { title: 'ACT II', message: 'THEY CORNER HIM' };
      case 4:
        return { title: 'ACT III', message: 'THE TABLES TURN' };
      case 5:
        return { title: 'FINALE', message: 'VICTORY!' };
      default:
        return { title: '', message: '' };
    }
  }
}
