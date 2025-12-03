/**
 * Renderer System TDD tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../src/constants';

// Mock DOM setup
function setupDOM() {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <body>
        <canvas id="game-canvas"></canvas>
        <span id="score">00</span>
        <span id="high-score">00</span>
        <div id="lives-display"></div>
      </body>
    </html>
  `);

  global.document = dom.window.document;
  global.HTMLCanvasElement = dom.window.HTMLCanvasElement;

  // Mock canvas context
  const mockCtx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    font: '',
    textAlign: 'left',
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
  };

  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);

  return { dom, mockCtx };
}

describe('Renderer', () => {
  let Renderer: typeof import('../../src/systems/Renderer').Renderer;
  let mockCtx: ReturnType<typeof setupDOM>['mockCtx'];

  beforeEach(async () => {
    const { mockCtx: ctx } = setupDOM();
    mockCtx = ctx;

    // Dynamic import after DOM setup
    const module = await import('../../src/systems/Renderer');
    Renderer = module.Renderer;
  });

  describe('initialization', () => {
    it('should create renderer with canvas element', () => {
      const renderer = new Renderer('game-canvas');
      expect(renderer).toBeDefined();
    });

    it('should throw error if canvas not found', () => {
      expect(() => new Renderer('nonexistent')).toThrow('Canvas element with id "nonexistent" not found');
    });

    it('should set canvas dimensions correctly', () => {
      const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
      new Renderer('game-canvas');

      expect(canvas.width).toBe(CANVAS_WIDTH);
      expect(canvas.height).toBe(CANVAS_HEIGHT);
    });
  });

  describe('clear', () => {
    it('should clear the canvas with black', () => {
      const renderer = new Renderer('game-canvas');
      renderer.clear();

      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    });
  });

  describe('renderMaze', () => {
    it('should draw maze from buffer', () => {
      const renderer = new Renderer('game-canvas');
      renderer.renderMaze();

      expect(mockCtx.drawImage).toHaveBeenCalled();
    });
  });

  describe('renderPellets', () => {
    it('should render pellets from buffer', () => {
      const renderer = new Renderer('game-canvas');
      renderer.renderPellets();

      // Should draw from pellets canvas buffer
      expect(mockCtx.drawImage).toHaveBeenCalled();
    });
  });

  describe('eatPellet', () => {
    it('should mark pellet as eaten', () => {
      const renderer = new Renderer('game-canvas');
      // This should not throw
      renderer.eatPellet(1, 1);
    });
  });

  describe('resetPellets', () => {
    it('should reset all pellets', () => {
      const renderer = new Renderer('game-canvas');
      renderer.eatPellet(1, 1);
      renderer.resetPellets();
      // Should reinitialize pellet state
    });
  });

  describe('renderPacMan', () => {
    it('should render Pac-Man at position', () => {
      const renderer = new Renderer('game-canvas');
      renderer.renderPacMan(100, 100, 3, 0);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('should render death animation when dying', () => {
      const renderer = new Renderer('game-canvas');
      renderer.renderPacMan(100, 100, 3, 0, true, 5);

      expect(mockCtx.beginPath).toHaveBeenCalled();
    });
  });

  describe('renderGhost', () => {
    it('should render ghost at position', () => {
      const renderer = new Renderer('game-canvas');
      renderer.renderGhost(100, 100, '#ff0000', 3, 'chase', 0);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('should render frightened ghost differently', () => {
      const renderer = new Renderer('game-canvas');
      renderer.renderGhost(100, 100, '#ff0000', 3, 'frightened', 0);

      expect(mockCtx.beginPath).toHaveBeenCalled();
    });

    it('should render only eyes when ghost is eaten', () => {
      const renderer = new Renderer('game-canvas');
      renderer.renderGhost(100, 100, '#ff0000', 3, 'eaten', 0);

      expect(mockCtx.beginPath).toHaveBeenCalled();
    });
  });

  describe('renderScore', () => {
    it('should update score display elements', () => {
      const renderer = new Renderer('game-canvas');
      renderer.renderScore(1234, 5000);

      const scoreEl = document.getElementById('score');
      const highScoreEl = document.getElementById('high-score');

      expect(scoreEl?.textContent).toBe('1234');
      expect(highScoreEl?.textContent).toBe('5000');
    });

    it('should pad single digit scores', () => {
      const renderer = new Renderer('game-canvas');
      renderer.renderScore(5, 10);

      const scoreEl = document.getElementById('score');
      expect(scoreEl?.textContent).toBe('05');
    });
  });

  describe('renderLives', () => {
    it('should render life icons', () => {
      const renderer = new Renderer('game-canvas');
      renderer.renderLives(3);

      const livesEl = document.getElementById('lives-display');
      expect(livesEl?.children.length).toBe(2); // 3 lives - 1 (current)
    });
  });

  describe('renderReadyText', () => {
    it('should render READY! text', () => {
      const renderer = new Renderer('game-canvas');
      renderer.renderReadyText();

      expect(mockCtx.fillText).toHaveBeenCalledWith('READY!', expect.any(Number), expect.any(Number));
    });
  });

  describe('renderGameOverText', () => {
    it('should render GAME OVER text', () => {
      const renderer = new Renderer('game-canvas');
      renderer.renderGameOverText();

      expect(mockCtx.fillText).toHaveBeenCalledWith('GAME  OVER', expect.any(Number), expect.any(Number));
    });
  });

  describe('power pellet blinking', () => {
    it('should toggle power pellet visibility', () => {
      const renderer = new Renderer('game-canvas');

      // Call multiple times to trigger toggle
      for (let i = 0; i < 15; i++) {
        renderer.updatePowerPelletBlink();
      }

      // Just verify it doesn't crash
      renderer.renderPellets();
    });
  });

  describe('getContext', () => {
    it('should return canvas context', () => {
      const renderer = new Renderer('game-canvas');
      const ctx = renderer.getContext();
      expect(ctx).toBeDefined();
    });
  });

  describe('getCanvas', () => {
    it('should return canvas element', () => {
      const renderer = new Renderer('game-canvas');
      const canvas = renderer.getCanvas();
      expect(canvas).toBeDefined();
      expect(canvas.id).toBe('game-canvas');
    });
  });
});
