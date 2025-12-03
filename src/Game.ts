/**
 * Main Game Controller
 *
 * This is the heart of the Pac-Man game. It orchestrates all systems:
 * - Rendering (WebGL)
 * - Input handling
 * - Collision detection
 * - Sound effects
 * - Game state management
 *
 * ## Game Loop Architecture
 *
 * We use a fixed timestep game loop for consistent physics:
 *
 * ```
 * while (running) {
 *   processInput()
 *   while (accumulatedTime >= FIXED_TIMESTEP) {
 *     update(FIXED_TIMESTEP)
 *     accumulatedTime -= FIXED_TIMESTEP
 *   }
 *   render()
 * }
 * ```
 *
 * This ensures that game logic runs at the same speed regardless
 * of frame rate. Visual smoothness varies, but gameplay is consistent.
 *
 * ## State Machine
 *
 * The game progresses through states:
 *
 * START_SCREEN → READY → PLAYING → (DYING → PLAYING/GAME_OVER)
 *                                 ↓
 *                          LEVEL_COMPLETE → READY
 *
 * @module Game
 */

import { WebGLRenderer } from './systems/WebGLRenderer';
import { Input } from './systems/Input';
import { Collision, CollisionResult } from './systems/Collision';
import { Sound } from './systems/Sound';
import { PacMan } from './entities/PacMan';
import { Ghost } from './entities/Ghost';
import { Blinky } from './entities/Blinky';
import { Pinky } from './entities/Pinky';
import { Inky } from './entities/Inky';
import { Clyde } from './entities/Clyde';
import {
  GameState,
  GameStateType,
  GhostMode,
  GhostModeType,
  Direction,
  FRIGHT_DURATION,
  SCATTER_TIMES,
  CHASE_TIMES,
  SCORE_PELLET,
  SCORE_POWER_PELLET,
  EXTRA_LIFE_SCORE,
  TARGET_FPS,
  FRAME_TIME,
} from './constants';
import { SoundType } from './types';

/**
 * Game configuration
 */
interface GameConfig {
  /** Canvas element ID */
  canvasId: string;
  /** Enable sound */
  sound?: boolean;
}

/**
 * Main Game Class
 */
export class Game {
  /** WebGL renderer */
  private renderer: WebGLRenderer;

  /** Input handler */
  private input: Input;

  /** Collision system */
  private collision: Collision;

  /** Sound system */
  private sound: Sound;

  /** Pac-Man entity */
  private pacman: PacMan;

  /** Ghost entities */
  private ghosts: Ghost[];

  /** Blinky reference (needed for Inky's AI) */
  private blinky: Blinky;

  /** Current game state */
  private state: GameStateType = GameState.START_SCREEN;

  /** Current score */
  private score: number = 0;

  /** High score */
  private highScore: number = 0;

  /** Current level */
  private level: number = 1;

  /** Pellets eaten this level */
  private pelletsEaten: number = 0;

  /** Ghost mode timer */
  private modeTimer: number = 0;

  /** Current ghost mode index (for scatter/chase cycle) */
  private modeIndex: number = 0;

  /** Current global ghost mode */
  private globalGhostMode: GhostModeType = GhostMode.SCATTER;

  /** Frightened mode timer */
  private frightenedTimer: number = 0;

  /** State timer (for READY, DYING, etc.) */
  private stateTimer: number = 0;

  /** Animation frame ID for cancellation */
  private animationFrameId: number = 0;

  /** Last frame timestamp */
  private lastTime: number = 0;

  /** Accumulated time for fixed timestep */
  private accumulator: number = 0;

  /** Is game running? */
  private running: boolean = false;

  /** Extra life awarded flag */
  private extraLifeAwarded: boolean = false;

  /**
   * Create a new game instance
   */
  constructor(config: GameConfig) {
    // Initialize systems
    this.renderer = new WebGLRenderer(config.canvasId);
    this.input = new Input();
    this.collision = new Collision();
    this.sound = new Sound();

    // Initialize entities
    this.pacman = new PacMan();

    // Initialize ghosts
    this.blinky = new Blinky();
    const pinky = new Pinky();
    const inky = new Inky();
    const clyde = new Clyde();

    this.ghosts = [this.blinky, pinky, inky, clyde];

    // Load high score from localStorage
    const savedHighScore = localStorage.getItem('pacman-highscore');
    if (savedHighScore) {
      this.highScore = parseInt(savedHighScore, 10);
    }

    // Initialize sound on first user interaction
    document.addEventListener('click', () => this.sound.init(), { once: true });
    document.addEventListener('keydown', () => this.sound.init(), { once: true });
  }

  /**
   * Start the game
   */
  start(): void {
    this.running = true;
    this.state = GameState.START_SCREEN;

    // Show start screen
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
      startScreen.classList.remove('hidden');
    }

    // Start game loop
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  /**
   * Main game loop
   */
  private gameLoop(currentTime: number): void {
    if (!this.running) return;

    // Calculate delta time
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Accumulate time for fixed timestep
    this.accumulator += deltaTime;

    // Process input
    this.processInput();

    // Fixed timestep updates
    while (this.accumulator >= FRAME_TIME) {
      this.update(FRAME_TIME);
      this.accumulator -= FRAME_TIME;
    }

    // Render
    this.render();

    // Next frame
    this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  /**
   * Process input
   */
  private processInput(): void {
    // Handle start screen
    if (this.state === GameState.START_SCREEN) {
      if (this.input.isStartPressed()) {
        this.startNewGame();
      }
      return;
    }

    // Handle pause
    if (this.input.isPausePressed()) {
      this.togglePause();
      return;
    }

    // Handle game over - restart
    if (this.state === GameState.GAME_OVER && this.input.isStartPressed()) {
      this.startNewGame();
      return;
    }

    // Pass direction input to Pac-Man
    const queuedDir = this.input.getQueuedDirection();
    if (queuedDir !== Direction.NONE) {
      this.pacman.setDirection(queuedDir);
    }
  }

  /**
   * Update game state
   */
  private update(_deltaTime: number): void {
    switch (this.state) {
      case GameState.START_SCREEN:
        // Just waiting for input
        break;

      case GameState.READY:
        this.updateReady();
        break;

      case GameState.PLAYING:
        this.updatePlaying();
        break;

      case GameState.DYING:
        this.updateDying();
        break;

      case GameState.LEVEL_COMPLETE:
        this.updateLevelComplete();
        break;

      case GameState.GAME_OVER:
        // Just waiting for input
        break;

      case GameState.PAUSED:
        // Nothing to update
        break;
    }
  }

  /**
   * Update during READY state
   */
  private updateReady(): void {
    this.stateTimer--;

    if (this.stateTimer <= 0) {
      this.state = GameState.PLAYING;
      this.renderer.clearReadyText();

      // Start background sound
      const intensity = this.pelletsEaten / this.collision.getPelletsRemaining();
      this.sound.startSiren(intensity);

      // Release ghosts based on level
      this.blinky.exitHouse();

      // Pinky exits almost immediately
      setTimeout(() => {
        if (this.state === GameState.PLAYING) {
          this.ghosts[1].exitHouse();
        }
      }, 2000);
    }
  }

  /**
   * Update during PLAYING state
   */
  private updatePlaying(): void {
    // Update mode timer
    this.updateGhostModes();

    // Update Pac-Man
    this.pacman.update(FRAME_TIME);

    // Update ghosts
    for (const ghost of this.ghosts) {
      ghost.updateTarget(this.pacman, this.blinky);
      ghost.update(FRAME_TIME);
      ghost.checkReachedHouse();
    }

    // Update renderer animations
    this.renderer.updatePowerPelletBlink();

    // Check collisions
    const collisions = this.collision.checkCollisions(this.pacman, this.ghosts);
    this.handleCollisions(collisions);

    // Check level complete
    if (this.collision.isLevelComplete()) {
      this.completeLevel();
    }

    // Release more ghosts based on pellets eaten
    this.checkGhostRelease();
  }

  /**
   * Update ghost mode timing (scatter/chase cycles)
   */
  private updateGhostModes(): void {
    // Handle frightened mode
    if (this.frightenedTimer > 0) {
      this.frightenedTimer--;

      if (this.frightenedTimer <= 0) {
        // Frightened mode ended
        this.endFrightenedMode();
      }
      return;
    }

    // Normal mode cycling
    this.modeTimer++;

    const scatterTime = (SCATTER_TIMES[this.modeIndex] ?? 5) * TARGET_FPS;
    const chaseTime = (CHASE_TIMES[this.modeIndex] ?? Infinity) * TARGET_FPS;

    if (this.globalGhostMode === GhostMode.SCATTER) {
      if (this.modeTimer >= scatterTime) {
        this.modeTimer = 0;
        this.globalGhostMode = GhostMode.CHASE;
        this.setGhostMode(GhostMode.CHASE);
      }
    } else if (this.globalGhostMode === GhostMode.CHASE) {
      if (this.modeTimer >= chaseTime && this.modeIndex < 3) {
        this.modeTimer = 0;
        this.modeIndex++;
        this.globalGhostMode = GhostMode.SCATTER;
        this.setGhostMode(GhostMode.SCATTER);
      }
    }
  }

  /**
   * Set mode for all ghosts
   */
  private setGhostMode(mode: GhostModeType): void {
    for (const ghost of this.ghosts) {
      if (ghost.mode !== GhostMode.EATEN && !ghost.isInHouse) {
        ghost.setMode(mode);
      }
    }
  }

  /**
   * Start frightened mode
   */
  private startFrightenedMode(): void {
    // Get duration for current level
    const duration = FRIGHT_DURATION[Math.min(this.level - 1, FRIGHT_DURATION.length - 1)] ?? 0;

    if (duration === 0) {
      // No frightened mode at this level!
      return;
    }

    this.frightenedTimer = duration;

    // Set ghosts to frightened
    for (const ghost of this.ghosts) {
      if (ghost.mode !== GhostMode.EATEN && !ghost.isInHouse) {
        ghost.setMode(GhostMode.FRIGHTENED, duration);
      }
    }

    // Switch to fright sound
    this.sound.stopSiren();
    this.sound.startFrightSound();
  }

  /**
   * End frightened mode
   */
  private endFrightenedMode(): void {
    this.collision.resetGhostMultiplier();

    // Return ghosts to current mode
    for (const ghost of this.ghosts) {
      if (ghost.mode === GhostMode.FRIGHTENED) {
        ghost.setMode(this.globalGhostMode);
      }
    }

    // Switch back to siren
    this.sound.stopFrightSound();
    const intensity = this.pelletsEaten / (this.pelletsEaten + this.collision.getPelletsRemaining());
    this.sound.startSiren(intensity);
  }

  /**
   * Check if more ghosts should be released
   */
  private checkGhostRelease(): void {
    for (const ghost of this.ghosts) {
      if (ghost.isInHouse && ghost.mode === GhostMode.HOUSE) {
        if (this.pelletsEaten >= ghost.dotLimit) {
          ghost.exitHouse();
        }
      }
    }
  }

  /**
   * Handle collision results
   */
  private handleCollisions(collisions: CollisionResult[]): void {
    for (const result of collisions) {
      switch (result.type) {
        case 'pellet':
          this.onPelletEaten(result);
          break;

        case 'powerPellet':
          this.onPowerPelletEaten(result);
          break;

        case 'ghost':
          this.onGhostCollision(result);
          break;

        case 'ghostEaten':
          this.onGhostEaten(result);
          break;
      }
    }
  }

  /**
   * Handle pellet eaten
   */
  private onPelletEaten(result: CollisionResult): void {
    this.addScore(result.points);
    this.pelletsEaten++;

    // Update renderer
    if (result.tile) {
      this.renderer.eatPellet(result.tile.col, result.tile.row);
    }

    // Play sound
    this.sound.playWaka();

    // Update siren intensity
    const intensity = this.pelletsEaten / (this.pelletsEaten + this.collision.getPelletsRemaining());
    this.sound.updateSirenIntensity(intensity);

    // Brief slowdown while eating
    this.pacman.isEating = true;
    setTimeout(() => {
      this.pacman.isEating = false;
    }, 10);
  }

  /**
   * Handle power pellet eaten
   */
  private onPowerPelletEaten(result: CollisionResult): void {
    this.addScore(result.points);
    this.pelletsEaten++;

    // Update renderer
    if (result.tile) {
      this.renderer.eatPellet(result.tile.col, result.tile.row);
    }

    // Start frightened mode
    this.startFrightenedMode();
  }

  /**
   * Handle ghost collision (Pac-Man dies)
   */
  private onGhostCollision(_result: CollisionResult): void {
    this.state = GameState.DYING;
    this.stateTimer = 60; // 1 second pause before death animation

    // Stop sounds
    this.sound.stopAll();

    // Freeze everything
    this.pacman.die();
  }

  /**
   * Handle ghost eaten
   */
  private onGhostEaten(result: CollisionResult): void {
    if (!result.ghost) return;

    this.addScore(result.points);
    result.ghost.eaten();

    // Play sound
    this.sound.play(SoundType.EAT_GHOST);

    // Show score popup
    if (result.tile) {
      this.renderer.renderGhostScore(
        result.tile.col * 16 + 8,
        result.tile.row * 16 + 8,
        result.points
      );
    }

    // Brief pause
    this.pacman.frightenedModeActive = true;
  }

  /**
   * Update during DYING state
   */
  private updateDying(): void {
    if (this.stateTimer > 0) {
      this.stateTimer--;
      return;
    }

    // Play death animation
    this.pacman.update(FRAME_TIME);

    if (this.pacman.isDeathAnimationComplete()) {
      this.sound.play(SoundType.DEATH);

      // Check lives
      this.pacman.lives--;

      if (this.pacman.lives <= 0) {
        this.gameOver();
      } else {
        // Continue with remaining lives
        this.resetPositions();
        this.state = GameState.READY;
        this.stateTimer = 120; // 2 seconds
        this.renderer.renderReadyText();
      }
    }
  }

  /**
   * Update during LEVEL_COMPLETE state
   */
  private updateLevelComplete(): void {
    this.stateTimer--;

    if (this.stateTimer <= 0) {
      this.startNextLevel();
    }
  }

  /**
   * Complete current level
   */
  private completeLevel(): void {
    this.state = GameState.LEVEL_COMPLETE;
    this.stateTimer = 120; // 2 seconds

    this.sound.stopAll();

    // Flash maze animation could go here
  }

  /**
   * Start next level
   */
  private startNextLevel(): void {
    this.level++;
    this.pelletsEaten = 0;

    // Reset pellets
    this.collision.resetPellets();
    this.renderer.resetPellets();

    // Reset positions
    this.resetPositions();

    // Enter ready state
    this.state = GameState.READY;
    this.stateTimer = 120;
    this.renderer.renderReadyText();

    // Reset ghost mode cycle
    this.modeIndex = 0;
    this.modeTimer = 0;
    this.globalGhostMode = GhostMode.SCATTER;
  }

  /**
   * Reset entity positions
   */
  private resetPositions(): void {
    this.pacman.reset();

    for (const ghost of this.ghosts) {
      ghost.reset();
    }
  }

  /**
   * Game over
   */
  private gameOver(): void {
    this.state = GameState.GAME_OVER;

    // Update high score
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('pacman-highscore', this.highScore.toString());
    }

    this.renderer.renderGameOverText();
  }

  /**
   * Start a new game
   */
  private startNewGame(): void {
    // Hide start screen
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
      startScreen.classList.add('hidden');
    }

    // Clear game over text
    this.renderer.clearGameOverText();

    // Reset game state
    this.score = 0;
    this.level = 1;
    this.pelletsEaten = 0;
    this.modeIndex = 0;
    this.modeTimer = 0;
    this.globalGhostMode = GhostMode.SCATTER;
    this.extraLifeAwarded = false;

    // Reset entities
    this.pacman.fullReset();
    this.collision.resetPellets();
    this.renderer.resetPellets();
    this.resetPositions();

    // Play intro
    this.sound.init();
    this.sound.playIntro().then(() => {
      // Enter ready state
      this.state = GameState.READY;
      this.stateTimer = 120;
      this.renderer.renderReadyText();
    });
  }

  /**
   * Toggle pause
   */
  private togglePause(): void {
    if (this.state === GameState.PLAYING) {
      this.state = GameState.PAUSED;
      this.sound.stopAll();
    } else if (this.state === GameState.PAUSED) {
      this.state = GameState.PLAYING;
      this.sound.startSiren(this.pelletsEaten / (this.pelletsEaten + this.collision.getPelletsRemaining()));
    }
  }

  /**
   * Add to score
   */
  private addScore(points: number): void {
    this.score += points;

    // Check for extra life
    if (!this.extraLifeAwarded && this.score >= EXTRA_LIFE_SCORE) {
      this.extraLifeAwarded = true;
      this.pacman.lives++;
      this.sound.play(SoundType.EXTRA_LIFE);
    }
  }

  /**
   * Render the current frame
   */
  private render(): void {
    // Clear screen
    this.renderer.clear();

    // Render maze
    this.renderer.renderMaze();

    // Render pellets
    this.renderer.renderPellets();

    // Render entities (except during start screen)
    if (this.state !== GameState.START_SCREEN) {
      // Render Pac-Man
      this.renderer.renderPacMan(
        this.pacman.position.x,
        this.pacman.position.y,
        this.pacman.direction,
        this.pacman.getAnimationFrame(),
        this.pacman.isDying,
        this.pacman.deathAnimationFrame
      );

      // Render ghosts (unless dying)
      if (this.state !== GameState.DYING || this.stateTimer > 0) {
        for (const ghost of this.ghosts) {
          this.renderer.renderGhost(
            ghost.position.x,
            ghost.position.y,
            ghost.color,
            ghost.direction,
            ghost.mode,
            ghost.getAnimationFrame(),
            ghost.frightenedFlashing
          );
        }
      }
    }

    // Flush rendering
    this.renderer.present();

    // Update UI
    this.renderer.renderScore(this.score, this.highScore);
    this.renderer.renderLives(this.pacman.lives);
  }

  /**
   * Stop the game
   */
  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.animationFrameId);
    this.sound.destroy();
    this.input.destroy();
  }

  /**
   * Get current game state (for testing)
   */
  getState(): GameStateType {
    return this.state;
  }

  /**
   * Get current score (for testing)
   */
  getScore(): number {
    return this.score;
  }
}
