/**
 * PAC-MAN TypeScript - Entry Point
 *
 * This is where the game begins. We:
 * 1. Wait for the DOM to be ready
 * 2. Create the game instance
 * 3. Start the game loop
 *
 * ## Browser Compatibility
 *
 * Requirements:
 * - WebGL support (for rendering)
 * - Web Audio API (for sound)
 * - ES2020 features (modern browser)
 *
 * Tested on:
 * - Chrome 90+
 * - Firefox 88+
 * - Safari 14+
 * - Edge 90+
 *
 * @module main
 */

import { Game } from './Game';
import './styles.css';

/**
 * Initialize the game when DOM is ready
 */
function init(): void {
  console.log('🎮 PAC-MAN TypeScript');
  console.log('====================');
  console.log('');
  console.log('Controls:');
  console.log('  Arrow Keys / WASD - Move');
  console.log('  Space / Enter     - Start');
  console.log('  P / Escape        - Pause');
  console.log('');
  console.log('Good luck!');
  console.log('');

  try {
    // Create and start the game
    const game = new Game({
      canvasId: 'game-canvas',
      sound: true,
    });

    game.start();

    // Expose game instance for debugging
    (window as unknown as { game: Game }).game = game;

    // Handle page visibility (pause when tab is hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Could pause game here if desired
      }
    });

    // Handle window resize (for future responsive scaling)
    window.addEventListener('resize', () => {
      // Could handle canvas scaling here
    });

  } catch (error) {
    console.error('Failed to initialize game:', error);

    // Show error message to user
    const container = document.getElementById('game-container');
    if (container) {
      container.innerHTML = `
        <div style="color: #f00; font-family: monospace; padding: 20px; text-align: center;">
          <h2>Failed to start game</h2>
          <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
          <p>Make sure WebGL is enabled in your browser.</p>
        </div>
      `;
    }
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
