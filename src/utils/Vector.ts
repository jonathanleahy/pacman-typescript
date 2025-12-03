/**
 * 2D Vector utility class for game math
 */

export class Vector {
  constructor(
    public x: number = 0,
    public y: number = 0
  ) {}

  /**
   * Create a new vector from coordinates
   */
  static create(x: number, y: number): Vector {
    return new Vector(x, y);
  }

  /**
   * Create a zero vector
   */
  static zero(): Vector {
    return new Vector(0, 0);
  }

  /**
   * Clone this vector
   */
  clone(): Vector {
    return new Vector(this.x, this.y);
  }

  /**
   * Set vector components
   */
  set(x: number, y: number): Vector {
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * Copy from another vector
   */
  copy(v: Vector): Vector {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  /**
   * Add another vector
   */
  add(v: Vector): Vector {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  /**
   * Subtract another vector
   */
  subtract(v: Vector): Vector {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  /**
   * Multiply by scalar
   */
  multiply(scalar: number): Vector {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  /**
   * Divide by scalar
   */
  divide(scalar: number): Vector {
    if (scalar !== 0) {
      this.x /= scalar;
      this.y /= scalar;
    }
    return this;
  }

  /**
   * Get magnitude (length) of vector
   */
  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Get squared magnitude (faster, no sqrt)
   */
  magnitudeSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * Normalize to unit vector
   */
  normalize(): Vector {
    const mag = this.magnitude();
    if (mag > 0) {
      this.divide(mag);
    }
    return this;
  }

  /**
   * Calculate distance to another vector
   */
  distanceTo(v: Vector): number {
    const dx = v.x - this.x;
    const dy = v.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate squared distance (faster, no sqrt)
   */
  distanceSquaredTo(v: Vector): number {
    const dx = v.x - this.x;
    const dy = v.y - this.y;
    return dx * dx + dy * dy;
  }

  /**
   * Calculate Manhattan distance (for grid-based games)
   */
  manhattanDistanceTo(v: Vector): number {
    return Math.abs(v.x - this.x) + Math.abs(v.y - this.y);
  }

  /**
   * Dot product
   */
  dot(v: Vector): number {
    return this.x * v.x + this.y * v.y;
  }

  /**
   * Check equality
   */
  equals(v: Vector): boolean {
    return this.x === v.x && this.y === v.y;
  }

  /**
   * Check approximate equality (for floating point)
   */
  equalsApprox(v: Vector, epsilon: number = 0.001): boolean {
    return Math.abs(this.x - v.x) < epsilon && Math.abs(this.y - v.y) < epsilon;
  }

  /**
   * Floor components
   */
  floor(): Vector {
    this.x = Math.floor(this.x);
    this.y = Math.floor(this.y);
    return this;
  }

  /**
   * Round components
   */
  round(): Vector {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    return this;
  }

  /**
   * Lerp (linear interpolation) to another vector
   */
  lerp(v: Vector, t: number): Vector {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    return this;
  }

  /**
   * Convert to string for debugging
   */
  toString(): string {
    return `Vector(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
  }

  /**
   * Convert to tile position
   */
  toTile(tileSize: number): { col: number; row: number } {
    return {
      col: Math.floor(this.x / tileSize),
      row: Math.floor(this.y / tileSize),
    };
  }

  /**
   * Create vector from tile position
   */
  static fromTile(col: number, row: number, tileSize: number): Vector {
    return new Vector(col * tileSize + tileSize / 2, row * tileSize + tileSize / 2);
  }
}
