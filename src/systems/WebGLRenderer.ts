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
    // Level 2: Neon Green - Cyber/Matrix theme
    2: {
      name: 'Neon Green',
      wallColor: [0.0, 0.8, 0.2, 1.0],         // Bright green
      wallGlow: [0.0, 0.4, 0.1, 1.0],
      wallHighlight: [0.4, 1.0, 0.5, 1.0],
      floorColor1: [0.01, 0.04, 0.02, 1.0],
      floorColor2: [0.02, 0.06, 0.03, 1.0],
      doorColor: [0.8, 1.0, 0.2, 1.0],         // Yellow-green
      doorGlow: [0.4, 0.6, 0.1, 0.5],
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
    color: number[]
  ): void {
    // Calculate rotation based on direction
    let rotation = 0;
    switch (direction) {
      case Direction.RIGHT: rotation = 0; break;
      case Direction.DOWN: rotation = Math.PI / 2; break;
      case Direction.LEFT: rotation = Math.PI; break;
      case Direction.UP: rotation = -Math.PI / 2; break;
    }

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
   * Render the floor with subtle grid pattern based on current theme
   */
  renderFloor(): void {
    const theme = this.getTheme();
    const floorColor = [...theme.floorColor1];
    const gridColor = [...theme.floorColor2];

    // Draw floor tiles with alternating pattern
    for (let row = 0; row < GRID_HEIGHT; row++) {
      for (let col = 0; col < GRID_WIDTH; col++) {
        const tile = MAZE_DATA[row]?.[col];
        // Only draw floor for walkable areas
        if (tile !== TileType.WALL) {
          const x = col * SCALED_TILE + SCALED_TILE / 2;
          const y = row * SCALED_TILE + SCALED_TILE / 2;
          const color = (row + col) % 2 === 0 ? floorColor : gridColor;
          this.addRect(x, y, SCALED_TILE, SCALED_TILE, color);
        }
      }
    }
  }

  /**
   * Render the maze walls
   *
   * The maze is drawn with thick, glowing walls in the iconic Pac-Man style.
   * Walls have a main color with a lighter inner edge for depth.
   * Colors are based on the current level's theme.
   */
  renderMaze(): void {
    // First render the floor
    this.renderFloor();

    // Get theme colors for current level
    const theme = this.getTheme();
    const wallColor = [...theme.wallColor];
    const wallGlow = [...theme.wallGlow];
    const wallHighlight = [...theme.wallHighlight];
    const doorColor = [...theme.doorColor];
    const doorGlow = [...theme.doorGlow];
    const lineWidth = 4;  // Thicker walls
    const glowWidth = 8;  // Glow around walls

    // First pass: Draw glow layer
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

          // Draw glow connections
          if (hasTop) {
            this.addRect(x, y - SCALED_TILE / 4, glowWidth, SCALED_TILE / 2 + 2, wallGlow);
          }
          if (hasBottom) {
            this.addRect(x, y + SCALED_TILE / 4, glowWidth, SCALED_TILE / 2 + 2, wallGlow);
          }
          if (hasLeft) {
            this.addRect(x - SCALED_TILE / 4, y, SCALED_TILE / 2 + 2, glowWidth, wallGlow);
          }
          if (hasRight) {
            this.addRect(x + SCALED_TILE / 4, y, SCALED_TILE / 2 + 2, glowWidth, wallGlow);
          }
          // Glow center
          this.addCircle(x, y, glowWidth / 2, wallGlow, 8);
        }
      }
    }

    // Second pass: Draw main wall lines
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

          // Draw rounded corner/junction
          this.addCircle(x, y, lineWidth / 2, wallColor, 8);
        } else if (tile === TileType.GHOST_DOOR) {
          // Ghost house door with glow (themed)
          const x = col * SCALED_TILE + SCALED_TILE / 2;
          const y = row * SCALED_TILE + SCALED_TILE / 2;
          // Glow
          this.addRect(x, y, SCALED_TILE + 2, 8, doorGlow);
          // Door
          this.addRect(x, y, SCALED_TILE, 4, doorColor);
        }
      }
    }

    // Third pass: Draw inner highlights for 3D effect
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

          // Draw thin highlight on top/left edges
          if (hasTop) {
            this.addRect(x - 1, y - SCALED_TILE / 4, 1, SCALED_TILE / 2, wallHighlight);
          }
          if (hasBottom) {
            this.addRect(x - 1, y + SCALED_TILE / 4, 1, SCALED_TILE / 2, wallHighlight);
          }
          if (hasLeft) {
            this.addRect(x - SCALED_TILE / 4, y - 1, SCALED_TILE / 2, 1, wallHighlight);
          }
          if (hasRight) {
            this.addRect(x + SCALED_TILE / 4, y - 1, SCALED_TILE / 2, 1, wallHighlight);
          }
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
    // Very subtle glow
    const glowColor = [pelletColor[0], pelletColor[1], pelletColor[2], 0.15];

    for (let row = 0; row < GRID_HEIGHT; row++) {
      for (let col = 0; col < GRID_WIDTH; col++) {
        if (!this.pelletState[row][col]) continue;

        const tile = MAZE_DATA[row]?.[col];
        const x = col * SCALED_TILE + SCALED_TILE / 2;
        const y = row * SCALED_TILE + SCALED_TILE / 2;

        if (tile === TileType.PELLET) {
          // Subtle glow behind pellet
          this.addCircle(x, y, 4, glowColor, 8);
          // Small pellet
          this.addCircle(x, y, 2, pelletColor, 8);
        } else if (tile === TileType.POWER_PELLET && this.powerPelletVisible) {
          // Subtle glow for power pellet
          this.addCircle(x, y, 12, glowColor, 12);
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
   * Render Pac-Man with glow effect
   */
  renderPacMan(
    x: number,
    y: number,
    direction: number,
    animationFrame: number,
    isDying: boolean = false,
    deathFrame: number = 0
  ): void {
    const radius = SCALED_TILE / 2 + 4;  // Larger Pac-Man
    const color = this.hexToRGBA(Colors.PACMAN);

    if (isDying) {
      // Death animation - shrinking
      const progress = deathFrame / 11;
      if (progress < 1) {
        const mouthAngle = Math.PI * progress;
        // Soft multi-layer glow
        this.addCircle(x, y, radius + 14, [color[0], color[1], color[2], 0.04], 16);
        this.addCircle(x, y, radius + 8, [color[0], color[1], color[2], 0.06], 16);
        this.addPacMan(x, y, radius, Direction.UP, mouthAngle, color);
      }
    } else {
      // Soft multi-layer glow
      this.addCircle(x, y, radius + 14, [color[0], color[1], color[2], 0.04], 16);
      this.addCircle(x, y, radius + 8, [color[0], color[1], color[2], 0.06], 16);
      // Normal animation
      const mouthOpenings = [0, 0.15, 0.35, 0.15];
      const mouthAngle = Math.PI * mouthOpenings[animationFrame % 4];
      this.addPacMan(x, y, radius, direction, mouthAngle, color);
    }
  }

  /**
   * Render a ghost with glow effect
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
      // Only draw eyes when eaten - with subtle glow
      const eyeGlow = [1, 1, 1, 0.2];
      this.addCircle(x, y, 15, eyeGlow, 12);
      this.addGhostEyes(x, y, direction);
      return;
    } else {
      bodyColor = this.hexToRGBA(color);
    }

    // Soft glow effect - multiple layers for blur-like effect
    this.addCircle(x, y, size / 2 + 16, [bodyColor[0], bodyColor[1], bodyColor[2], 0.04], 16);
    this.addCircle(x, y, size / 2 + 10, [bodyColor[0], bodyColor[1], bodyColor[2], 0.06], 16);
    this.addCircle(x, y, size / 2 + 5, [bodyColor[0], bodyColor[1], bodyColor[2], 0.08], 16);

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

  /**
   * Render "YOU WIN!" text for completing all levels
   */
  renderGameWonText(): void {
    const existing = document.getElementById('gamewon-text');
    if (!existing) {
      const text = document.createElement('div');
      text.id = 'gamewon-text';
      text.style.cssText = `
        position: absolute;
        top: ${14 * SCALED_TILE}px;
        left: 50%;
        transform: translateX(-50%);
        color: #00ff00;
        font-family: 'Press Start 2P', monospace;
        font-size: 24px;
        z-index: 10;
        text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00;
        animation: pulse 1s ease-in-out infinite;
      `;
      text.textContent = 'YOU WIN!';
      document.getElementById('game-container')?.appendChild(text);

      // Add subtitle
      const subtitle = document.createElement('div');
      subtitle.id = 'gamewon-subtitle';
      subtitle.style.cssText = `
        position: absolute;
        top: ${18 * SCALED_TILE}px;
        left: 50%;
        transform: translateX(-50%);
        color: #ffff00;
        font-family: 'Press Start 2P', monospace;
        font-size: 12px;
        z-index: 10;
      `;
      subtitle.textContent = 'PRESS SPACE TO PLAY AGAIN';
      document.getElementById('game-container')?.appendChild(subtitle);
    }
  }

  /**
   * Clear game won text
   */
  clearGameWonText(): void {
    const text = document.getElementById('gamewon-text');
    const subtitle = document.getElementById('gamewon-subtitle');
    if (text) text.remove();
    if (subtitle) subtitle.remove();
  }

  /**
   * Render intermission screen
   */
  renderIntermission(title: string, message: string, progress: number): void {
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
        justify-content: center;
        align-items: center;
        background: rgba(0, 0, 0, 0.9);
        z-index: 100;
      `;

      const titleEl = document.createElement('div');
      titleEl.id = 'intermission-title';
      titleEl.style.cssText = `
        color: #00ffff;
        font-family: 'Press Start 2P', monospace;
        font-size: 32px;
        margin-bottom: 20px;
        text-shadow: 0 0 10px #00ffff;
      `;
      container.appendChild(titleEl);

      const messageEl = document.createElement('div');
      messageEl.id = 'intermission-message';
      messageEl.style.cssText = `
        color: #ffff00;
        font-family: 'Press Start 2P', monospace;
        font-size: 16px;
        margin-bottom: 40px;
      `;
      container.appendChild(messageEl);

      const skipEl = document.createElement('div');
      skipEl.id = 'intermission-skip';
      skipEl.style.cssText = `
        color: #888888;
        font-family: 'Press Start 2P', monospace;
        font-size: 10px;
      `;
      skipEl.textContent = 'PRESS ANY KEY TO SKIP';
      container.appendChild(skipEl);

      document.getElementById('game-container')?.appendChild(container);
    }

    // Update content
    const titleEl = document.getElementById('intermission-title');
    const messageEl = document.getElementById('intermission-message');
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;

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
