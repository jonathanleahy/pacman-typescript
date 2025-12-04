/**
 * WebGL Renderer System
 *
 * This module provides high-performance rendering using WebGL.
 * WebGL is significantly faster than Canvas 2D because:
 *
 * 1. GPU ACCELERATION: All rendering happens on the GPU, freeing the CPU
 * 2. BATCH RENDERING: We can draw hundreds of sprites in a single draw call
 * 3. SHADER PROGRAMS: Custom shaders allow efficient color manipulation
 * 4. TEXTURE ATLASES: All sprites in one texture = fewer state changes
 *
 * Architecture:
 * - Vertex shader: Transforms 2D positions to clip space
 * - Fragment shader: Applies colors and textures to pixels
 * - Sprite batching: Accumulate sprites, draw all at once
 *
 * @author Pac-Man TypeScript Project
 */

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  SCALED_TILE,
  GRID_WIDTH,
  GRID_HEIGHT,
  Colors,
  Direction,
  GhostMode,
} from '../constants';
import { MAZE_DATA } from '../utils/MazeData';
import { TileType } from '../types';
import { CutsceneSprite } from './Intermission';

/**
 * Vertex shader source code
 *
 * This shader runs once per vertex (corner of each sprite quad).
 * It transforms our pixel coordinates into WebGL's clip space (-1 to 1).
 *
 * Attributes:
 * - a_position: The x,y position in pixels
 * - a_texCoord: Texture coordinates (0-1 range)
 * - a_color: RGBA color for this vertex
 *
 * Uniforms:
 * - u_resolution: Canvas width/height for coordinate transformation
 */
const VERTEX_SHADER_SOURCE = `
  // Input attributes from our vertex buffer
  attribute vec2 a_position;    // Position in pixels
  attribute vec2 a_texCoord;    // UV coordinates for texturing
  attribute vec4 a_color;       // RGBA color (0-1 range)

  // Canvas dimensions for coordinate conversion
  uniform vec2 u_resolution;

  // Output to fragment shader
  varying vec2 v_texCoord;
  varying vec4 v_color;

  void main() {
    // Convert from pixels to 0.0 to 1.0 range
    vec2 zeroToOne = a_position / u_resolution;

    // Convert from 0->1 to 0->2
    vec2 zeroToTwo = zeroToOne * 2.0;

    // Convert from 0->2 to -1->+1 (clip space)
    // Also flip Y axis (WebGL has Y going up, we want Y going down)
    vec2 clipSpace = zeroToTwo - 1.0;
    clipSpace.y = -clipSpace.y;

    // Set the final position
    gl_Position = vec4(clipSpace, 0.0, 1.0);

    // Pass texture coords and color to fragment shader
    v_texCoord = a_texCoord;
    v_color = a_color;
  }
`;

/**
 * Fragment shader source code
 *
 * This shader runs once per pixel (fragment) being drawn.
 * It determines the final color of each pixel.
 *
 * For solid shapes: Uses the interpolated vertex color
 * For textured shapes: Would sample from a texture (future enhancement)
 */
const FRAGMENT_SHADER_SOURCE = `
  // Required for mobile/older devices - set float precision
  precision mediump float;

  // Interpolated values from vertex shader
  varying vec2 v_texCoord;
  varying vec4 v_color;

  // Texture sampler (for future sprite sheet support)
  uniform sampler2D u_texture;
  uniform bool u_useTexture;

  void main() {
    if (u_useTexture) {
      // Sample texture and multiply by vertex color
      gl_FragColor = texture2D(u_texture, v_texCoord) * v_color;
    } else {
      // Just use the vertex color directly
      gl_FragColor = v_color;
    }
  }
`;

// Sprite data structure for batch rendering
// Each sprite is a quad (rectangle) defined by position, size, and color
// x: Center X position in pixels
// y: Center Y position in pixels
// width: Width in pixels
// height: Height in pixels
// color: RGBA color (0-1 range)
// rotation: Optional rotation in radians

/**
 * WebGL Renderer Class
 *
 * Provides efficient 2D rendering using WebGL.
 * Uses sprite batching to minimize draw calls.
 */
export class WebGLRenderer {
  /** The WebGL rendering context */
  private gl: WebGLRenderingContext;

  /** The canvas element we're rendering to */
  private canvas: HTMLCanvasElement;

  /** Compiled and linked shader program */
  private program: WebGLProgram;

  /** Buffer for vertex position data */
  private positionBuffer: WebGLBuffer;

  /** Buffer for texture coordinate data */
  private texCoordBuffer: WebGLBuffer;

  /** Buffer for vertex color data */
  private colorBuffer: WebGLBuffer;

  /** Location of the position attribute in the shader */
  private positionLocation: number;

  /** Location of the texCoord attribute in the shader */
  private texCoordLocation: number;

  /** Location of the color attribute in the shader */
  private colorLocation: number;

  /** Location of the resolution uniform in the shader */
  private resolutionLocation: WebGLUniformLocation | null;

  /** Location of the useTexture uniform */
  private useTextureLocation: WebGLUniformLocation | null;

  /** Accumulated vertices for batch rendering */
  private vertices: number[] = [];

  /** Accumulated colors for batch rendering */
  private colors: number[] = [];

  /** Accumulated texture coordinates for batch rendering */
  private texCoords: number[] = [];

  /** Pre-rendered maze as a texture */
  private mazeTexture: WebGLTexture | null = null;

  /** Pre-rendered pellets state */
  private pelletState: boolean[][] = [];

  /** Power pellet blink state */
  private powerPelletVisible: boolean = true;

  /** Timer for power pellet blinking */
  private powerPelletTimer: number = 0;

  /** Current game level for theming */
  private currentLevel: number = 1;

  /** Whether maze should flash (level complete) */
  private mazeFlashing: boolean = false;

  /** Timer for maze flashing animation */
  private mazeFlashTimer: number = 0;

  /** Level theme configurations */
  private readonly levelThemes = {
    // Level 1: Classic Blue - The original arcade look
    1: {
      name: 'Classic Blue',
      wallColor: [0.13, 0.13, 0.87, 1.0],      // #2121de
      wallGlow: [0.15, 0.15, 0.55, 1.0],
      wallHighlight: [0.4, 0.4, 1.0, 1.0],
      floorColor1: [0.02, 0.02, 0.05, 1.0],
      floorColor2: [0.04, 0.04, 0.08, 1.0],
      doorColor: [1.0, 0.72, 0.87, 1.0],       // Pink
      doorGlow: [0.6, 0.45, 0.55, 0.5],
    },
    // Level 2: Forest Green - Softer, more retro green
    2: {
      name: 'Forest Green',
      wallColor: [0.15, 0.55, 0.35, 1.0],      // Softer forest green
      wallGlow: [0.08, 0.3, 0.18, 1.0],
      wallHighlight: [0.3, 0.7, 0.45, 1.0],
      floorColor1: [0.01, 0.04, 0.02, 1.0],
      floorColor2: [0.02, 0.06, 0.03, 1.0],
      doorColor: [0.6, 0.8, 0.3, 1.0],         // Muted yellow-green
      doorGlow: [0.3, 0.5, 0.15, 0.5],
    },
    // Level 3: Muted Red - Softer danger zone
    3: {
      name: 'Muted Red',
      wallColor: [0.8, 0.27, 0.27, 1.0],       // Muted red (#cc4444)
      wallGlow: [0.4, 0.13, 0.13, 1.0],
      wallHighlight: [0.87, 0.47, 0.47, 1.0],
      floorColor1: [0.04, 0.01, 0.01, 1.0],
      floorColor2: [0.06, 0.02, 0.02, 1.0],
      doorColor: [1.0, 0.6, 0.2, 1.0],         // Orange
      doorGlow: [0.6, 0.3, 0.1, 0.5],
    },
  } as const;

  /**
   * Constructor - Initialize WebGL context and shaders
   *
   * @param canvasId - The ID of the canvas element to render to
   * @throws Error if canvas not found or WebGL not supported
   */
  constructor(canvasId: string) {
    // Find the canvas element
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id "${canvasId}" not found`);
    }

    this.canvas = canvas;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    // Try to get WebGL context (try WebGL 1 for broader compatibility)
    const gl = this.canvas.getContext('webgl', {
      alpha: false,              // No transparency in background
      antialias: false,          // Crisp pixel art look
      preserveDrawingBuffer: true // Allow screenshots
    });

    if (!gl) {
      throw new Error('WebGL not supported in this browser');
    }

    this.gl = gl;

    // Initialize shader program
    this.program = this.createShaderProgram();

    // Get attribute locations (where to put vertex data)
    this.positionLocation = gl.getAttribLocation(this.program, 'a_position');
    this.texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');
    this.colorLocation = gl.getAttribLocation(this.program, 'a_color');

    // Get uniform locations (global shader variables)
    this.resolutionLocation = gl.getUniformLocation(this.program, 'u_resolution');
    this.useTextureLocation = gl.getUniformLocation(this.program, 'u_useTexture');

    // Create buffers for vertex data
    this.positionBuffer = gl.createBuffer()!;
    this.texCoordBuffer = gl.createBuffer()!;
    this.colorBuffer = gl.createBuffer()!;

    // Initialize OpenGL state
    this.initGL();

    // Initialize pellet tracking
    this.initPelletState();
  }

  /**
   * Initialize WebGL state
   * Sets up blending, clear color, and viewport
   */
  private initGL(): void {
    const gl = this.gl;

    // Enable alpha blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Set the viewport to match canvas size
    gl.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Set clear color to black
    gl.clearColor(0, 0, 0, 1);

    // Use our shader program
    gl.useProgram(this.program);

    // Set the resolution uniform
    gl.uniform2f(this.resolutionLocation, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Don't use textures by default
    gl.uniform1i(this.useTextureLocation, 0);
  }

  /**
   * Create and compile the shader program
   *
   * A shader program consists of:
   * 1. Vertex shader - processes each vertex
   * 2. Fragment shader - processes each pixel
   *
   * @returns Compiled and linked WebGLProgram
   */
  private createShaderProgram(): WebGLProgram {
    const gl = this.gl;

    // Compile vertex shader
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);

    // Compile fragment shader
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);

    // Create program and attach shaders
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    // Link the program (combines shaders into executable)
    gl.linkProgram(program);

    // Check for linking errors
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program);
      throw new Error(`Failed to link shader program: ${error}`);
    }

    return program;
  }

  /**
   * Compile a shader from source code
   *
   * @param type - gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
   * @param source - GLSL source code
   * @returns Compiled WebGLShader
   */
  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;

    // Create shader object
    const shader = gl.createShader(type)!;

    // Set the source code
    gl.shaderSource(shader, source);

    // Compile to GPU-executable code
    gl.compileShader(shader);

    // Check for compilation errors
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      const shaderType = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
      throw new Error(`Failed to compile ${shaderType} shader: ${error}`);
    }

    return shader;
  }

  /**
   * Initialize pellet state tracking
   * Creates a 2D array tracking which pellets still exist
   */
  private initPelletState(): void {
    this.pelletState = [];
    for (let row = 0; row < GRID_HEIGHT; row++) {
      this.pelletState[row] = [];
      for (let col = 0; col < GRID_WIDTH; col++) {
        const tile = MAZE_DATA[row]?.[col];
        // Pellets exist where maze data has pellet or power pellet tiles
        this.pelletState[row][col] = tile === TileType.PELLET || tile === TileType.POWER_PELLET;
      }
    }
  }

  /**
   * Set the current level for theming
   * @param level - Current game level (1-based)
   */
  setLevel(level: number): void {
    this.currentLevel = level;
  }

  /**
   * Enable/disable maze flashing (for level complete)
   */
  setMazeFlashing(enabled: boolean): void {
    this.mazeFlashing = enabled;
    if (enabled) {
      this.mazeFlashTimer = 0;
    }
  }

  /**
   * Update maze flash timer (call each frame during level complete)
   */
  updateMazeFlash(): void {
    if (this.mazeFlashing) {
      this.mazeFlashTimer++;
    }
  }

  /**
   * Get the current level's theme, cycling through themes for levels > 3
   */
  private getTheme() {
    // Cycle through themes: 1->1, 2->2, 3->3, 4->1, 5->2, 6->3, etc.
    const themeIndex = ((this.currentLevel - 1) % 3) + 1;
    return this.levelThemes[themeIndex as 1 | 2 | 3];
  }

  /**
   * Parse a hex color string to RGBA values (0-1 range)
   *
   * @param hex - Color in '#RRGGBB' format
   * @returns Array of [r, g, b, a] values (0-1)
   */
  private hexToRGBA(hex: string): number[] {
    // Remove # if present
    const h = hex.replace('#', '');

    // Parse hex values
    const r = parseInt(h.substring(0, 2), 16) / 255;
    const g = parseInt(h.substring(2, 4), 16) / 255;
    const b = parseInt(h.substring(4, 6), 16) / 255;

    return [r, g, b, 1.0];
  }

  /**
   * Add a rectangle to the batch
   *
   * WebGL draws triangles, so each rectangle is 2 triangles (6 vertices).
   * We store position, color, and texture coordinates for each vertex.
   *
   * @param x - Center X position
   * @param y - Center Y position
   * @param width - Width in pixels
   * @param height - Height in pixels
   * @param color - RGBA color array (0-1 range)
   */
  private addRect(x: number, y: number, width: number, height: number, color: number[]): void {
    // Calculate corner positions from center
    const halfW = width / 2;
    const halfH = height / 2;

    const left = x - halfW;
    const right = x + halfW;
    const top = y - halfH;
    const bottom = y + halfH;

    // Two triangles make a rectangle:
    // Triangle 1: top-left, top-right, bottom-left
    // Triangle 2: bottom-left, top-right, bottom-right

    // Add positions (6 vertices, 2 components each = 12 values)
    this.vertices.push(
      // Triangle 1
      left, top,
      right, top,
      left, bottom,
      // Triangle 2
      left, bottom,
      right, top,
      right, bottom
    );

    // Add colors (6 vertices, 4 components each = 24 values)
    for (let i = 0; i < 6; i++) {
      this.colors.push(...color);
    }

    // Add texture coordinates (not used for solid colors, but needed)
    this.texCoords.push(
      0, 0,
      1, 0,
      0, 1,
      0, 1,
      1, 0,
      1, 1
    );
  }

  /**
   * Add a circle to the batch (approximated with triangles)
   *
   * Circles are drawn as a "fan" of triangles from the center.
   * More segments = smoother circle, but more vertices.
   *
   * @param x - Center X position
   * @param y - Center Y position
   * @param radius - Radius in pixels
   * @param color - RGBA color array
   * @param segments - Number of triangle segments (default 16)
   */
  private addCircle(x: number, y: number, radius: number, color: number[], segments: number = 16): void {
    const angleStep = (Math.PI * 2) / segments;

    // Draw as a triangle fan from center
    for (let i = 0; i < segments; i++) {
      const angle1 = i * angleStep;
      const angle2 = (i + 1) * angleStep;

      // Triangle: center, edge point 1, edge point 2
      this.vertices.push(
        x, y,                                          // Center
        x + Math.cos(angle1) * radius, y + Math.sin(angle1) * radius,  // Edge 1
        x + Math.cos(angle2) * radius, y + Math.sin(angle2) * radius   // Edge 2
      );

      // Same color for all 3 vertices
      for (let j = 0; j < 3; j++) {
        this.colors.push(...color);
      }

      // Texture coords (not used but needed)
      this.texCoords.push(0.5, 0.5, 0, 0, 1, 1);
    }
  }

  /**
   * Add Pac-Man shape to batch
   *
   * Pac-Man is a circle with a triangular "mouth" cut out.
   * We draw this as a series of triangles, excluding the mouth area.
   *
   * @param x - Center X position
   * @param y - Center Y position
   * @param radius - Radius in pixels
   * @param direction - Current facing direction
   * @param mouthAngle - How open the mouth is (radians)
   * @param color - RGBA color
   */
  private addPacMan(
    x: number,
    y: number,
    radius: number,
    direction: number,
    mouthAngle: number,
    color: number[],
    extraRotation: number = 0
  ): void {
    // Calculate rotation based on direction
    let rotation = 0;
    switch (direction) {
      case Direction.RIGHT: rotation = 0; break;
      case Direction.DOWN: rotation = Math.PI / 2; break;
      case Direction.LEFT: rotation = Math.PI; break;
      case Direction.UP: rotation = -Math.PI / 2; break;
    }
    // Add extra rotation for victory spin
    rotation += extraRotation;

    // Draw circle segments, skipping the mouth area
    const segments = 20;
    const startAngle = rotation + mouthAngle;
    const endAngle = rotation + Math.PI * 2 - mouthAngle;
    const angleRange = endAngle - startAngle;
    const angleStep = angleRange / segments;

    for (let i = 0; i < segments; i++) {
      const angle1 = startAngle + i * angleStep;
      const angle2 = startAngle + (i + 1) * angleStep;

      this.vertices.push(
        x, y,
        x + Math.cos(angle1) * radius, y + Math.sin(angle1) * radius,
        x + Math.cos(angle2) * radius, y + Math.sin(angle2) * radius
      );

      for (let j = 0; j < 3; j++) {
        this.colors.push(...color);
      }

      this.texCoords.push(0.5, 0.5, 0, 0, 1, 1);
    }
  }

  /**
   * Add ghost shape to batch
   *
   * Ghosts have a rounded top and wavy bottom.
   * We construct this from multiple triangles.
   *
   * @param x - Center X position
   * @param y - Center Y position
   * @param size - Width/height of ghost
   * @param color - Body color
   * @param animFrame - Animation frame for wavy bottom
   */
  private addGhost(
    x: number,
    y: number,
    size: number,
    color: number[],
    animFrame: number
  ): void {
    const halfSize = size / 2;
    const bottom = y + halfSize;
    const left = x - halfSize;

    // Draw rounded top as a semicircle
    const segments = 10;
    const centerY = y - halfSize / 3;

    for (let i = 0; i < segments; i++) {
      const angle1 = Math.PI + (i / segments) * Math.PI;
      const angle2 = Math.PI + ((i + 1) / segments) * Math.PI;

      this.vertices.push(
        x, centerY,
        x + Math.cos(angle1) * halfSize, centerY + Math.sin(angle1) * halfSize,
        x + Math.cos(angle2) * halfSize, centerY + Math.sin(angle2) * halfSize
      );

      for (let j = 0; j < 3; j++) {
        this.colors.push(...color);
      }

      this.texCoords.push(0.5, 0.5, 0, 0, 1, 1);
    }

    // Draw body rectangle
    this.addRect(x, y + halfSize / 4, size, halfSize * 1.5, color);

    // Draw wavy bottom (3 bumps)
    const waveWidth = size / 3;
    const waveHeight = 4;

    for (let i = 0; i < 3; i++) {
      const bumpX = left + waveWidth / 2 + i * waveWidth;
      const bumpY = bottom - waveHeight / 2 + (i % 2 === animFrame % 2 ? 0 : waveHeight);
      this.addCircle(bumpX, bumpY, waveWidth / 2, color, 8);
    }
  }

  /**
   * Add ghost eyes to batch
   *
   * Eyes track the ghost's movement direction.
   * Each eye is a white ellipse with a blue pupil.
   *
   * @param x - Ghost center X
   * @param y - Ghost center Y
   * @param direction - Direction ghost is facing
   */
  private addGhostEyes(x: number, y: number, direction: number): void {
    const eyeOffsetX = 4;
    const eyeOffsetY = -3;
    const eyeRadius = 4;
    const pupilRadius = 2;

    // Calculate pupil offset based on direction
    let pupilOffsetX = 0;
    let pupilOffsetY = 0;
    switch (direction) {
      case Direction.UP: pupilOffsetY = -2; break;
      case Direction.DOWN: pupilOffsetY = 2; break;
      case Direction.LEFT: pupilOffsetX = -2; break;
      case Direction.RIGHT: pupilOffsetX = 2; break;
    }

    const white = [1, 1, 1, 1];
    const blue = [0, 0, 1, 1];

    // Left eye
    this.addCircle(x - eyeOffsetX, y + eyeOffsetY, eyeRadius, white, 12);
    this.addCircle(x - eyeOffsetX + pupilOffsetX, y + eyeOffsetY + pupilOffsetY, pupilRadius, blue, 8);

    // Right eye
    this.addCircle(x + eyeOffsetX, y + eyeOffsetY, eyeRadius, white, 12);
    this.addCircle(x + eyeOffsetX + pupilOffsetX, y + eyeOffsetY + pupilOffsetY, pupilRadius, blue, 8);
  }

  /**
   * Flush the batch - send all accumulated geometry to the GPU
   *
   * This is where the magic happens! All the sprites we've added
   * get drawn in a single draw call, which is very efficient.
   */
  private flush(): void {
    const gl = this.gl;

    if (this.vertices.length === 0) return;

    // Upload position data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Upload color data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colors), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.colorLocation);
    gl.vertexAttribPointer(this.colorLocation, 4, gl.FLOAT, false, 0, 0);

    // Upload texture coordinate data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.texCoords), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.texCoordLocation);
    gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    // Draw all triangles in one call!
    const vertexCount = this.vertices.length / 2;
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);

    // Clear buffers for next batch
    this.vertices = [];
    this.colors = [];
    this.texCoords = [];
  }

  /**
   * Clear the screen to black
   */
  clear(): void {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  /**
   * Render the maze walls
   *
   * Clean retro style - solid walls with level-based theming.
   */
  renderMaze(): void {
    // Get theme colors for current level
    const theme = this.getTheme();
    let wallColor: [number, number, number, number] = [
      theme.wallColor[0],
      theme.wallColor[1],
      theme.wallColor[2],
      theme.wallColor[3]
    ];
    const doorColor = [...theme.doorColor];
    const lineWidth = 2;

    // Gentle pulse effect during level complete (no harsh flashing)
    if (this.mazeFlashing) {
      // Smooth sine wave pulse - brightens walls gently
      const pulse = Math.sin(this.mazeFlashTimer * 0.15) * 0.5 + 0.5;
      const brighten = pulse * 0.4; // Max 40% brighter
      wallColor = [
        Math.min(1, wallColor[0] + brighten),
        Math.min(1, wallColor[1] + brighten),
        Math.min(1, wallColor[2] + brighten),
        1.0
      ];
    }

    for (let row = 0; row < GRID_HEIGHT; row++) {
      for (let col = 0; col < GRID_WIDTH; col++) {
        const tile = MAZE_DATA[row]?.[col];

        if (tile === TileType.WALL) {
          const x = col * SCALED_TILE + SCALED_TILE / 2;
          const y = row * SCALED_TILE + SCALED_TILE / 2;

          const hasTop = this.isWall(col, row - 1);
          const hasBottom = this.isWall(col, row + 1);
          const hasLeft = this.isWall(col - 1, row);
          const hasRight = this.isWall(col + 1, row);

          // Draw solid wall connections
          if (hasTop) {
            this.addRect(x, y - SCALED_TILE / 4, lineWidth, SCALED_TILE / 2, wallColor);
          }
          if (hasBottom) {
            this.addRect(x, y + SCALED_TILE / 4, lineWidth, SCALED_TILE / 2, wallColor);
          }
          if (hasLeft) {
            this.addRect(x - SCALED_TILE / 4, y, SCALED_TILE / 2, lineWidth, wallColor);
          }
          if (hasRight) {
            this.addRect(x + SCALED_TILE / 4, y, SCALED_TILE / 2, lineWidth, wallColor);
          }

          // Draw center point
          this.addCircle(x, y, lineWidth, wallColor, 6);
        } else if (tile === TileType.GHOST_DOOR) {
          // Ghost house door (themed)
          const x = col * SCALED_TILE + SCALED_TILE / 2;
          const y = row * SCALED_TILE + SCALED_TILE / 2;
          this.addRect(x, y, SCALED_TILE, 4, doorColor);
        }
      }
    }
  }

  /**
   * Check if a tile position contains a wall
   */
  private isWall(col: number, row: number): boolean {
    if (col < 0 || col >= GRID_WIDTH || row < 0 || row >= GRID_HEIGHT) {
      return false;
    }
    return MAZE_DATA[row][col] === TileType.WALL;
  }

  /**
   * Render all pellets with glow effect
   */
  renderPellets(): void {
    const pelletColor = this.hexToRGBA(Colors.PELLET);

    for (let row = 0; row < GRID_HEIGHT; row++) {
      for (let col = 0; col < GRID_WIDTH; col++) {
        if (!this.pelletState[row][col]) continue;

        const tile = MAZE_DATA[row]?.[col];
        const x = col * SCALED_TILE + SCALED_TILE / 2;
        const y = row * SCALED_TILE + SCALED_TILE / 2;

        if (tile === TileType.PELLET) {
          // Small pellet
          this.addCircle(x, y, 2, pelletColor, 8);
        } else if (tile === TileType.POWER_PELLET && this.powerPelletVisible) {
          // Large power pellet
          this.addCircle(x, y, 6, pelletColor, 12);
        }
      }
    }
  }

  /**
   * Update power pellet blinking animation
   */
  updatePowerPelletBlink(): void {
    this.powerPelletTimer++;
    if (this.powerPelletTimer >= 10) {
      this.powerPelletTimer = 0;
      this.powerPelletVisible = !this.powerPelletVisible;
    }
  }

  /**
   * Mark a pellet as eaten
   */
  eatPellet(col: number, row: number): void {
    if (this.pelletState[row]?.[col]) {
      this.pelletState[row][col] = false;
    }
  }

  /**
   * Reset all pellets
   */
  resetPellets(): void {
    this.initPelletState();
  }

  /**
   * Clear all pellets (for cheat code)
   */
  clearAllPellets(): void {
    for (let row = 0; row < this.pelletState.length; row++) {
      for (let col = 0; col < this.pelletState[row].length; col++) {
        this.pelletState[row][col] = false;
      }
    }
  }

  /**
   * Clear all pellets except for specified positions
   * @param keepPositions - Array of [col, row] positions to keep
   */
  clearAllPelletsExcept(keepPositions: [number, number][]): void {
    const keepSet = new Set(keepPositions.map(([col, row]) => `${col},${row}`));

    for (let row = 0; row < this.pelletState.length; row++) {
      for (let col = 0; col < this.pelletState[row].length; col++) {
        const key = `${col},${row}`;
        if (!keepSet.has(key)) {
          this.pelletState[row][col] = false;
        }
      }
    }
  }

  /**
   * Render Pac-Man with glow effect
   */
  renderPacMan(
    x: number,
    y: number,
    direction: number,
    animationFrame: number,
    isDying: boolean = false,
    deathFrame: number = 0,
    isVictory: boolean = false,
    victoryRotation: number = 0,
    victoryJump: number = 0
  ): void {
    const radius = SCALED_TILE / 2 + 4;  // Larger Pac-Man
    const color = this.hexToRGBA(Colors.PACMAN);

    // Apply victory jump offset
    const renderY = isVictory ? y - victoryJump : y;

    if (isDying) {
      // Death animation - shrinking
      const progress = deathFrame / 11;
      if (progress < 1) {
        const mouthAngle = Math.PI * progress;
        this.addPacMan(x, renderY, radius, Direction.UP, mouthAngle, color, victoryRotation);
      }
    } else if (isVictory) {
      // Victory animation - spinning with EXCITED fast chomping!
      // Rapid mouth animation - chomps 8x faster than normal
      const victoryMouthOpenings = [0.1, 0.4, 0.1, 0.4];
      const fastFrame = Math.floor(animationFrame * 2) % 4;
      const mouthAngle = Math.PI * victoryMouthOpenings[fastFrame];
      this.addPacMan(x, renderY, radius * 1, Direction.RIGHT, mouthAngle, color, victoryRotation);
    } else {
      // Normal animation
      const mouthOpenings = [0, 0.15, 0.35, 0.15];
      const mouthAngle = Math.PI * mouthOpenings[animationFrame % 4];
      this.addPacMan(x, renderY, radius, direction, mouthAngle, color);
    }
  }

  /**
   * Render a ghost
   */
  renderGhost(
    x: number,
    y: number,
    color: string,
    direction: number,
    mode: string,
    animationFrame: number,
    frightenedFlash: boolean = false
  ): void {
    const size = SCALED_TILE + 8;  // Larger ghosts

    // Determine color based on mode
    let bodyColor: number[];

    if (mode === GhostMode.FRIGHTENED) {
      bodyColor = frightenedFlash
        ? this.hexToRGBA(Colors.FRIGHTENED_FLASH)
        : this.hexToRGBA(Colors.FRIGHTENED);
    } else if (mode === GhostMode.EATEN) {
      // Only draw eyes when eaten
      this.addGhostEyes(x, y, direction);
      return;
    } else {
      bodyColor = this.hexToRGBA(color);
    }

    // Draw ghost body
    this.addGhost(x, y, size, bodyColor, animationFrame);

    // Draw eyes (unless frightened)
    if (mode !== GhostMode.FRIGHTENED) {
      this.addGhostEyes(x, y, direction);
    } else {
      // Frightened face - small dots for eyes
      const eyeColor = frightenedFlash ? [1, 0, 0, 1] : [1, 0.72, 0.87, 1];
      this.addCircle(x - 3, y - 2, 2, eyeColor, 6);
      this.addCircle(x + 3, y - 2, 2, eyeColor, 6);
    }
  }

  /**
   * Render score and high score displays
   * (Updates DOM elements - text rendering in WebGL is complex)
   */
  renderScore(score: number, highScore: number): void {
    const scoreEl = document.getElementById('score');
    const highScoreEl = document.getElementById('high-score');

    if (scoreEl) {
      scoreEl.textContent = score.toString().padStart(2, '0');
    }
    if (highScoreEl) {
      highScoreEl.textContent = highScore.toString().padStart(2, '0');
    }
  }

  /**
   * Render current level display
   */
  renderLevel(level: number): void {
    const levelEl = document.getElementById('level');
    if (levelEl) {
      levelEl.textContent = level.toString();
    }
  }

  /**
   * Render lives display
   */
  renderLives(lives: number): void {
    const livesEl = document.getElementById('lives-display');
    if (!livesEl) return;

    livesEl.innerHTML = '';
    for (let i = 0; i < lives - 1; i++) {
      const life = document.createElement('div');
      life.className = 'life-icon';
      livesEl.appendChild(life);
    }
  }

  /**
   * Render a fruit bonus item
   */
  renderFruit(x: number, y: number, color: string, fruitType: number): void {
    const fruitColor = this.hexToRGBA(color);
    const size = 8; // Slightly larger than pellets

    // Draw based on fruit type for variety
    switch (fruitType) {
      case 0: // Cherry - two circles with stem
        this.addCircle(x - 4, y + 2, size - 2, fruitColor, 10);
        this.addCircle(x + 4, y + 2, size - 2, fruitColor, 10);
        // Stem
        this.addRect(x, y - 6, 2, 8, [0.4, 0.26, 0.13, 1]);
        break;
      case 1: // Strawberry - triangular shape
        this.addCircle(x, y + 2, size, fruitColor, 12);
        this.addCircle(x, y - 3, size - 3, fruitColor, 8);
        // Seeds (white dots)
        this.addCircle(x - 3, y + 1, 1, [1, 1, 1, 1], 4);
        this.addCircle(x + 3, y + 1, 1, [1, 1, 1, 1], 4);
        this.addCircle(x, y + 4, 1, [1, 1, 1, 1], 4);
        break;
      case 2: // Orange - simple circle with leaf
        this.addCircle(x, y, size + 1, fruitColor, 14);
        this.addCircle(x + 2, y - 7, 3, [0, 0.8, 0, 1], 6); // Leaf
        break;
      case 3: // Apple - red with stem
        this.addCircle(x, y, size + 1, fruitColor, 14);
        this.addRect(x, y - 8, 2, 4, [0.4, 0.26, 0.13, 1]); // Stem
        this.addCircle(x + 3, y - 6, 2, [0, 0.8, 0, 1], 5); // Leaf
        break;
      case 4: // Melon - large oval
        this.addCircle(x, y, size + 2, fruitColor, 16);
        // Stripes
        this.addRect(x - 4, y, 1, 8, [0, 0.6, 0, 1]);
        this.addRect(x, y, 1, 10, [0, 0.6, 0, 1]);
        this.addRect(x + 4, y, 1, 8, [0, 0.6, 0, 1]);
        break;
      case 5: // Galaxian - spaceship shape
        this.addCircle(x, y - 2, size - 2, fruitColor, 8);
        this.addRect(x, y + 4, 10, 4, fruitColor);
        this.addRect(x - 6, y + 2, 4, 6, fruitColor);
        this.addRect(x + 6, y + 2, 4, 6, fruitColor);
        break;
      case 6: // Bell - bell shape
        this.addCircle(x, y - 2, size, fruitColor, 12);
        this.addRect(x, y + 4, 12, 4, fruitColor);
        this.addCircle(x, y + 8, 3, fruitColor, 6);
        break;
      case 7: // Key
        this.addCircle(x, y - 4, size - 2, fruitColor, 10);
        this.addRect(x, y + 2, 4, 10, fruitColor);
        this.addRect(x + 3, y + 4, 4, 2, fruitColor);
        this.addRect(x + 3, y + 8, 4, 2, fruitColor);
        break;
      default:
        // Fallback: simple circle
        this.addCircle(x, y, size, fruitColor, 12);
    }
  }

  /**
   * Render "READY!" text
   * Uses Canvas 2D for text (WebGL text is complex)
   */
  renderReadyText(): void {
    // We'll use an overlay canvas for text
    // For now, use DOM
    const existing = document.getElementById('ready-text');
    if (!existing) {
      const text = document.createElement('div');
      text.id = 'ready-text';
      text.className = 'ready-text';
      text.style.cssText = `
        position: absolute;
        top: ${17 * SCALED_TILE}px;
        left: 50%;
        transform: translateX(-50%);
        color: #ffff00;
        font-family: 'Press Start 2P', monospace;
        font-size: 20px;
        z-index: 10;
      `;
      text.textContent = 'READY!';
      document.getElementById('game-container')?.appendChild(text);
    }
  }

  /**
   * Clear ready text
   */
  clearReadyText(): void {
    const text = document.getElementById('ready-text');
    if (text) text.remove();
  }

  /**
   * Render "GAME OVER" text
   */
  renderGameOverText(): void {
    const existing = document.getElementById('gameover-text');
    if (!existing) {
      const text = document.createElement('div');
      text.id = 'gameover-text';
      text.style.cssText = `
        position: absolute;
        top: ${17 * SCALED_TILE}px;
        left: 50%;
        transform: translateX(-50%);
        color: #ff0000;
        font-family: 'Press Start 2P', monospace;
        font-size: 20px;
        z-index: 10;
      `;
      text.textContent = 'GAME  OVER';
      document.getElementById('game-container')?.appendChild(text);
    }
  }

  /**
   * Clear game over text
   */
  clearGameOverText(): void {
    const text = document.getElementById('gameover-text');
    if (text) text.remove();
  }

  private gameWonAnimFrame: number = 0;

  /**
   * Render epic "YOU WIN!" celebration screen
   */
  renderGameWonText(): void {
    this.gameWonAnimFrame++;

    let container = document.getElementById('gamewon-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'gamewon-container';
      container.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(ellipse at center, #1a0a2e 0%, #000 70%);
        z-index: 100;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      `;

      // Animated background stars
      for (let i = 0; i < 50; i++) {
        const star = document.createElement('div');
        star.className = 'win-star';
        star.style.cssText = `
          position: absolute;
          width: ${2 + Math.random() * 4}px;
          height: ${2 + Math.random() * 4}px;
          background: #fff;
          border-radius: 50%;
          left: ${Math.random() * 100}%;
          top: ${Math.random() * 100}%;
          animation: twinkle ${1 + Math.random() * 2}s ease-in-out infinite;
          animation-delay: ${Math.random() * 2}s;
          opacity: ${0.3 + Math.random() * 0.7};
        `;
        container.appendChild(star);
      }

      // Main title container for animations
      const titleWrapper = document.createElement('div');
      titleWrapper.id = 'gamewon-title-wrapper';
      titleWrapper.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        animation: bounceIn 0.8s ease-out;
      `;

      // Giant "YOU WIN!" text with rainbow animation
      const text = document.createElement('div');
      text.id = 'gamewon-text';
      text.style.cssText = `
        color: #00ff00;
        font-family: 'Press Start 2P', monospace;
        font-size: 48px;
        z-index: 10;
        text-shadow:
          0 0 20px #00ff00,
          0 0 40px #00ff00,
          0 0 60px #00ff00,
          0 0 80px #00ff00,
          4px 4px 0 #005500;
        animation: rainbowGlow 2s ease-in-out infinite, bigPulse 0.5s ease-in-out infinite;
        letter-spacing: 8px;
      `;
      text.textContent = 'YOU WIN!';
      titleWrapper.appendChild(text);

      // Score display
      const scoreDisplay = document.createElement('div');
      scoreDisplay.id = 'gamewon-score';
      scoreDisplay.style.cssText = `
        color: #ffff00;
        font-family: 'Press Start 2P', monospace;
        font-size: 20px;
        margin-top: 40px;
        text-shadow: 0 0 10px #ffff00;
        animation: fadeInUp 1s ease-out 0.5s both;
      `;
      titleWrapper.appendChild(scoreDisplay);

      // Champion message
      const champion = document.createElement('div');
      champion.id = 'gamewon-champion';
      champion.style.cssText = `
        color: #ff00ff;
        font-family: 'Press Start 2P', monospace;
        font-size: 16px;
        margin-top: 20px;
        text-shadow: 0 0 15px #ff00ff;
        animation: fadeInUp 1s ease-out 1s both;
      `;
      champion.textContent = 'CHAMPION!';
      titleWrapper.appendChild(champion);

      // Subtitle
      const subtitle = document.createElement('div');
      subtitle.id = 'gamewon-subtitle';
      subtitle.style.cssText = `
        color: #888888;
        font-family: 'Press Start 2P', monospace;
        font-size: 12px;
        margin-top: 60px;
        animation: blink 1s step-end infinite, fadeInUp 1s ease-out 1.5s both;
      `;
      subtitle.textContent = 'PRESS SPACE TO PLAY AGAIN';
      titleWrapper.appendChild(subtitle);

      container.appendChild(titleWrapper);

      // Floating ghosts celebration
      const ghostColors = ['#ff0000', '#ffb8ff', '#00ffff', '#ffb852'];
      for (let i = 0; i < 4; i++) {
        const ghost = document.createElement('div');
        ghost.className = 'win-ghost';
        ghost.innerHTML = `
          <svg viewBox="0 0 24 28" width="40" height="48">
            <path fill="${ghostColors[i]}" d="M12 0C6 0 1 5 1 11v13l3-4 3 4 3-4 3 4 3-4 3 4V11c0-6-5-11-11-11z"/>
            <circle fill="white" cx="8" cy="10" r="3"/>
            <circle fill="white" cx="16" cy="10" r="3"/>
            <circle fill="blue" cx="9" cy="10" r="1.5"/>
            <circle fill="blue" cx="17" cy="10" r="1.5"/>
          </svg>
        `;
        ghost.style.cssText = `
          position: absolute;
          left: ${10 + i * 22}%;
          bottom: -60px;
          animation: floatUp 4s ease-out ${i * 0.3}s infinite;
          filter: drop-shadow(0 0 10px ${ghostColors[i]});
        `;
        container.appendChild(ghost);
      }

      // Confetti elements
      for (let i = 0; i < 30; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'win-confetti';
        const colors = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff8800'];
        confetti.style.cssText = `
          position: absolute;
          width: ${5 + Math.random() * 10}px;
          height: ${5 + Math.random() * 10}px;
          background: ${colors[Math.floor(Math.random() * colors.length)]};
          left: ${Math.random() * 100}%;
          top: -20px;
          animation: confettiFall ${3 + Math.random() * 4}s linear infinite;
          animation-delay: ${Math.random() * 3}s;
          transform: rotate(${Math.random() * 360}deg);
          opacity: 0.9;
        `;
        container.appendChild(confetti);
      }

      // Add CSS animations
      const style = document.createElement('style');
      style.id = 'gamewon-styles';
      style.textContent = `
        @keyframes rainbowGlow {
          0% { color: #00ff00; text-shadow: 0 0 20px #00ff00, 0 0 40px #00ff00, 0 0 60px #00ff00; }
          25% { color: #00ffff; text-shadow: 0 0 20px #00ffff, 0 0 40px #00ffff, 0 0 60px #00ffff; }
          50% { color: #ffff00; text-shadow: 0 0 20px #ffff00, 0 0 40px #ffff00, 0 0 60px #ffff00; }
          75% { color: #ff00ff; text-shadow: 0 0 20px #ff00ff, 0 0 40px #ff00ff, 0 0 60px #ff00ff; }
          100% { color: #00ff00; text-shadow: 0 0 20px #00ff00, 0 0 40px #00ff00, 0 0 60px #00ff00; }
        }
        @keyframes bigPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes bounceIn {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes floatUp {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-600px); opacity: 0; }
        }
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(600px) rotate(720deg); opacity: 0; }
        }
      `;
      document.head.appendChild(style);

      document.getElementById('game-container')?.appendChild(container);
    }
  }

  /**
   * Update game won score display
   */
  updateGameWonScore(score: number): void {
    const scoreEl = document.getElementById('gamewon-score');
    if (scoreEl) {
      scoreEl.textContent = `FINAL SCORE: ${score.toString().padStart(8, '0')}`;
    }
  }

  /**
   * Clear game won text
   */
  clearGameWonText(): void {
    const container = document.getElementById('gamewon-container');
    const styles = document.getElementById('gamewon-styles');
    if (container) container.remove();
    if (styles) styles.remove();
    this.gameWonAnimFrame = 0;
  }

  /**
   * Render intermission screen with animated cutscene
   */
  renderIntermission(title: string, message: string, progress: number, sprites?: CutsceneSprite[]): void {
    let container = document.getElementById('intermission-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'intermission-container';
      container.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        background: #000;
        z-index: 100;
        overflow: hidden;
      `;

      // Title at top
      const titleEl = document.createElement('div');
      titleEl.id = 'intermission-title';
      titleEl.style.cssText = `
        color: #00ffff;
        font-family: 'Press Start 2P', monospace;
        font-size: 32px;
        margin-top: 60px;
        margin-bottom: 10px;
        text-shadow: 0 0 20px #00ffff, 0 0 40px #00ffff;
      `;
      container.appendChild(titleEl);

      // Message below title
      const messageEl = document.createElement('div');
      messageEl.id = 'intermission-message';
      messageEl.style.cssText = `
        color: #ffff00;
        font-family: 'Press Start 2P', monospace;
        font-size: 16px;
        margin-bottom: 20px;
        text-shadow: 0 0 10px #ffff00;
      `;
      container.appendChild(messageEl);

      // Canvas for animated sprites
      const cutsceneCanvas = document.createElement('canvas');
      cutsceneCanvas.id = 'cutscene-canvas';
      cutsceneCanvas.width = 672;
      cutsceneCanvas.height = 400;
      cutsceneCanvas.style.cssText = `
        margin-top: 20px;
      `;
      container.appendChild(cutsceneCanvas);

      // Skip text at bottom
      const skipEl = document.createElement('div');
      skipEl.id = 'intermission-skip';
      skipEl.style.cssText = `
        color: #666666;
        font-family: 'Press Start 2P', monospace;
        font-size: 10px;
        position: absolute;
        bottom: 40px;
      `;
      skipEl.textContent = 'PRESS SPACE TO SKIP';
      container.appendChild(skipEl);

      document.getElementById('game-container')?.appendChild(container);
    }

    // Update content
    const titleEl = document.getElementById('intermission-title');
    const messageEl = document.getElementById('intermission-message');
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;

    // Render sprites on canvas
    const canvas = document.getElementById('cutscene-canvas') as HTMLCanvasElement;
    if (canvas && sprites && sprites.length > 0) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const sprite of sprites) {
          this.renderCutsceneSprite(ctx, sprite);
        }
      }
    }

    // Fade effect based on progress
    if (progress < 0.1) {
      container.style.opacity = String(progress * 10);
    } else if (progress > 0.9) {
      container.style.opacity = String((1 - progress) * 10);
    } else {
      container.style.opacity = '1';
    }
  }

  /**
   * Render a single cutscene sprite on canvas
   */
  private renderCutsceneSprite(ctx: CanvasRenderingContext2D, sprite: CutsceneSprite): void {
    ctx.save();
    ctx.translate(sprite.x, sprite.y);

    const baseSize = 24 * sprite.scale;

    if (sprite.type === 'pacman' || sprite.type === 'bigpacman') {
      // Draw Pac-Man
      ctx.fillStyle = '#ffff00';

      const mouthOpenings = [0, 0.15, 0.35, 0.15];
      const mouthAngle = Math.PI * mouthOpenings[sprite.animFrame % 4];

      let startAngle: number, endAngle: number;

      switch (sprite.direction) {
        case 3: // RIGHT
          startAngle = mouthAngle;
          endAngle = Math.PI * 2 - mouthAngle;
          break;
        case 2: // LEFT
          startAngle = Math.PI + mouthAngle;
          endAngle = Math.PI - mouthAngle;
          break;
        case 0: // UP
          startAngle = -Math.PI / 2 + mouthAngle;
          endAngle = -Math.PI / 2 - mouthAngle + Math.PI * 2;
          break;
        case 1: // DOWN
          startAngle = Math.PI / 2 + mouthAngle;
          endAngle = Math.PI / 2 - mouthAngle + Math.PI * 2;
          break;
        default:
          startAngle = mouthAngle;
          endAngle = Math.PI * 2 - mouthAngle;
      }

      ctx.beginPath();
      ctx.arc(0, 0, baseSize / 2, startAngle, endAngle);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();

      // Add glow
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 15 * sprite.scale;
      ctx.fill();
    } else {
      // Draw Ghost
      const ghostColor = sprite.frightened ? '#2121de' : (sprite.color || '#ff0000');
      ctx.fillStyle = ghostColor;

      const radius = baseSize / 2;
      const waveOffset = (sprite.animFrame % 2) * 3;

      // Ghost body (rounded top)
      ctx.beginPath();
      ctx.arc(0, -radius / 4, radius, Math.PI, 0, false);

      // Wavy bottom
      const waveCount = 3;
      const waveWidth = (radius * 2) / waveCount;
      const waveHeight = radius / 3;

      ctx.lineTo(radius, radius / 2);
      for (let i = waveCount; i > 0; i--) {
        const wx = radius - (waveCount - i + 0.5) * waveWidth;
        const wy = radius / 2 + ((i + waveOffset) % 2 === 0 ? waveHeight : 0);
        ctx.lineTo(wx, wy);
      }
      ctx.lineTo(-radius, radius / 2);
      ctx.closePath();
      ctx.fill();

      // Add glow
      ctx.shadowColor = ghostColor;
      ctx.shadowBlur = 10 * sprite.scale;
      ctx.fill();

      // Eyes
      ctx.shadowBlur = 0;
      const eyeRadius = radius / 4;
      const eyeY = -radius / 4;
      const pupilRadius = eyeRadius / 2;

      // Frightened mode - different eyes
      if (sprite.frightened) {
        ctx.fillStyle = '#ffffff';
        // Worried expression - small dots
        ctx.beginPath();
        ctx.arc(-radius / 3, eyeY, eyeRadius / 2, 0, Math.PI * 2);
        ctx.arc(radius / 3, eyeY, eyeRadius / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Normal eyes - white with pupils
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-radius / 3, eyeY, eyeRadius, 0, Math.PI * 2);
        ctx.arc(radius / 3, eyeY, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Pupils - direction based
        ctx.fillStyle = '#0000ff';
        let pupilOffsetX = 0, pupilOffsetY = 0;
        switch (sprite.direction) {
          case 2: pupilOffsetX = -pupilRadius / 2; break; // LEFT
          case 3: pupilOffsetX = pupilRadius / 2; break; // RIGHT
          case 0: pupilOffsetY = -pupilRadius / 2; break; // UP
          case 1: pupilOffsetY = pupilRadius / 2; break; // DOWN
        }
        ctx.beginPath();
        ctx.arc(-radius / 3 + pupilOffsetX, eyeY + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
        ctx.arc(radius / 3 + pupilOffsetX, eyeY + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Clear intermission screen
   */
  clearIntermission(): void {
    const container = document.getElementById('intermission-container');
    if (container) container.remove();
  }

  /**
   * Render ghost score popup
   */
  renderGhostScore(x: number, y: number, score: number): void {
    // Use DOM for text
    const popup = document.createElement('div');
    popup.className = 'ghost-score-popup';
    popup.style.cssText = `
      position: absolute;
      left: ${x - 20}px;
      top: ${y - 10}px;
      color: #0ff;
      font-family: 'Press Start 2P', monospace;
      font-size: 8px;
      z-index: 20;
      animation: fadeUp 1s ease-out forwards;
    `;
    popup.textContent = score.toString();
    document.getElementById('game-container')?.appendChild(popup);

    setTimeout(() => popup.remove(), 1000);
  }

  /**
   * Render fruit score popup
   */
  renderFruitScore(x: number, y: number, score: number): void {
    const popup = document.createElement('div');
    popup.className = 'fruit-score-popup';
    popup.style.cssText = `
      position: absolute;
      left: ${x - 20}px;
      top: ${y - 10}px;
      color: #ff0;
      font-family: 'Press Start 2P', monospace;
      font-size: 10px;
      z-index: 20;
      animation: fadeUp 1.5s ease-out forwards;
      text-shadow: 0 0 5px #ff0;
    `;
    popup.textContent = score.toString();
    document.getElementById('game-container')?.appendChild(popup);

    setTimeout(() => popup.remove(), 1500);
  }

  /**
   * Render particles from a ParticleSystem
   *
   * Accepts render data from ParticleSystem.getRenderData()
   * and adds it to the current batch.
   */
  renderParticles(renderData: { positions: number[]; colors: number[] }): void {
    if (renderData.positions.length === 0) return;

    // Add particle geometry directly to batch
    this.vertices.push(...renderData.positions);
    this.colors.push(...renderData.colors);

    // Texture coords (not used but required)
    const vertexCount = renderData.positions.length / 2;
    for (let i = 0; i < vertexCount; i++) {
      this.texCoords.push(0, 0);
    }
  }

  /**
   * Complete the frame - flush all batched geometry
   */
  present(): void {
    this.flush();
  }

  /**
   * Get the WebGL context
   */
  getContext(): WebGLRenderingContext {
    return this.gl;
  }

  /**
   * Get the canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Cleanup WebGL resources
   */
  destroy(): void {
    const gl = this.gl;

    gl.deleteBuffer(this.positionBuffer);
    gl.deleteBuffer(this.colorBuffer);
    gl.deleteBuffer(this.texCoordBuffer);
    gl.deleteProgram(this.program);

    if (this.mazeTexture) {
      gl.deleteTexture(this.mazeTexture);
    }
  }
}
