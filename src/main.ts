/**
 * PAC-MAN TypeScript - Entry Point
 *
 * This is where the game begins. We:
 * 1. Wait for the DOM to be ready
 * 2. Show splash screen with high score
 * 3. Wait for player input to start
 * 4. Create the game instance and start
 *
 * ## 2025 Visual Overhaul
 *
 * The splash screen features:
 * - Animated neon logo
 * - Floating ghost animations
 * - High score display with glow
 * - Press Start prompt
 *
 * @module main
 */

import { Game } from './Game';
import './styles.css';

/** Game instance (created after splash) */
let game: Game | null = null;

/**
 * Load high score from localStorage
 */
function loadHighScore(): number {
  const saved = localStorage.getItem('pacman-highscore');
  return saved ? parseInt(saved, 10) : 0;
}

/**
 * Update splash screen high score display
 */
function updateSplashHighScore(): void {
  const highScore = loadHighScore();
  const display = document.getElementById('splash-high-score');
  if (display) {
    display.textContent = highScore.toString().padStart(2, '0');
  }
}

/**
 * Transition from splash screen to game
 */
function startGameFromSplash(): void {
  const splashScreen = document.getElementById('splash-screen');
  const gameContainer = document.getElementById('game-container');

  if (!splashScreen || !gameContainer) return;

  // Fade out splash
  splashScreen.classList.add('hidden');

  // Wait for transition, then show game
  setTimeout(() => {
    splashScreen.style.display = 'none';
    gameContainer.classList.remove('hidden');

    // Create and start the game if not already created
    if (!game) {
      try {
        game = new Game({
          canvasId: 'game-canvas',
          sound: true,
        });

        // Expose for debugging
        (window as unknown as { game: Game }).game = game;
      } catch (error) {
        console.error('Failed to initialize game:', error);
        showError(error);
        return;
      }
    }

    game.start();
  }, 500); // Match CSS transition duration
}

/**
 * Show error message
 */
function showError(error: unknown): void {
  const container = document.getElementById('game-container');
  if (container) {
    container.classList.remove('hidden');
    container.innerHTML = `
      <div style="color: #f00; font-family: 'Press Start 2P', monospace; padding: 20px; text-align: center;">
        <h2 style="margin-bottom: 20px;">GAME ERROR</h2>
        <p style="margin-bottom: 10px;">${error instanceof Error ? error.message : 'Unknown error'}</p>
        <p>Make sure WebGL is enabled</p>
      </div>
    `;
  }
}

/**
 * Initialize splash screen and input handlers
 */
function init(): void {
  console.log('🎮 PAC-MAN TypeScript - 2025 Edition');
  console.log('====================================');
  console.log('');
  console.log('Controls:');
  console.log('  Arrow Keys / WASD - Move');
  console.log('  Space / Enter     - Start');
  console.log('  P / Escape        - Pause');
  console.log('');

  // Update splash high score
  updateSplashHighScore();

  // Handle input on splash screen
  const handleStart = (e: Event): void => {
    // Prevent default space scrolling
    if (e instanceof KeyboardEvent && e.code === 'Space') {
      e.preventDefault();
    }

    // Only start if splash is visible
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen && !splashScreen.classList.contains('hidden')) {
      startGameFromSplash();
    }
  };

  // Listen for keyboard
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      handleStart(e);
    }
  });

  // Listen for click/touch on splash
  const splashScreen = document.getElementById('splash-screen');
  if (splashScreen) {
    splashScreen.addEventListener('click', handleStart);
    splashScreen.addEventListener('touchstart', handleStart);
  }

  // Handle page visibility
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game) {
      // Could pause game here
    }
  });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
