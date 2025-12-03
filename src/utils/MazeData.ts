/**
 * Original Pac-Man Maze Layout
 *
 * Legend:
 * 0 = Empty (no pellet, walkable)
 * 1 = Wall
 * 2 = Pellet
 * 3 = Power Pellet
 * 4 = Ghost House interior
 * 5 = Ghost House Door
 * 6 = Tunnel
 * 7 = Fruit spawn point (no pellet)
 */

export const MAZE_DATA: number[][] = [
  // Row 0 - top border
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  // Row 1
  [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
  // Row 2
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  // Row 3 - power pellets
  [1,3,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,3,1],
  // Row 4
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  // Row 5
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  // Row 6
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
  // Row 7
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
  // Row 8
  [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
  // Row 9
  [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
  // Row 10
  [0,0,0,0,0,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,0,0,0,0,0],
  // Row 11
  [0,0,0,0,0,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0],
  // Row 12
  [0,0,0,0,0,1,2,1,1,0,1,1,1,5,5,1,1,1,0,1,1,2,1,0,0,0,0,0],
  // Row 13 - ghost house row with tunnels
  [6,6,6,6,6,1,2,1,1,0,1,4,4,4,4,4,4,1,0,1,1,2,1,6,6,6,6,6],
  // Row 14 - ghost house middle
  [0,0,0,0,0,1,2,0,0,0,1,4,4,4,4,4,4,1,0,0,0,2,1,0,0,0,0,0],
  // Row 15
  [0,0,0,0,0,1,2,1,1,0,1,4,4,4,4,4,4,1,0,1,1,2,1,0,0,0,0,0],
  // Row 16
  [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0],
  // Row 17
  [0,0,0,0,0,1,2,1,1,0,0,0,0,7,0,0,0,0,0,1,1,2,1,0,0,0,0,0],
  // Row 18
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
  // Row 19
  [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
  // Row 20
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  // Row 21
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  // Row 22 - power pellets
  [1,3,2,2,1,1,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,1,1,2,2,3,1],
  // Row 23
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
  // Row 24
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
  // Row 25
  [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
  // Row 26
  [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
  // Row 27
  [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
  // Row 28
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  // Row 29
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  // Row 30 - bottom border
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

/**
 * Ghost scatter targets (corners)
 */
export const SCATTER_TARGETS = {
  BLINKY: { col: 25, row: 0 },   // Top-right
  PINKY: { col: 2, row: 0 },     // Top-left
  INKY: { col: 27, row: 30 },    // Bottom-right
  CLYDE: { col: 0, row: 30 },    // Bottom-left
};

/**
 * Starting positions
 */
export const START_POSITIONS = {
  PACMAN: { col: 13.5, row: 22 },  // Row 22 has empty space at center
  BLINKY: { col: 13.5, row: 11 },
  PINKY: { col: 13.5, row: 14 },
  INKY: { col: 11.5, row: 14 },
  CLYDE: { col: 15.5, row: 14 },
};

/**
 * Ghost house configuration
 */
export const GHOST_HOUSE = {
  leftCol: 10,
  rightCol: 17,
  topRow: 12,
  bottomRow: 16,
  doorRow: 12,
  doorLeftCol: 13,
  doorRightCol: 14,
  centerCol: 13.5,
  centerRow: 14,
  exitRow: 11,
};

/**
 * Tunnel configuration
 */
export const TUNNELS = {
  leftExit: { col: -1, row: 13 },
  rightExit: { col: 28, row: 13 },
  slowZoneLeft: { startCol: 0, endCol: 5 },
  slowZoneRight: { startCol: 22, endCol: 27 },
};

/**
 * Fruit spawn location
 */
export const FRUIT_SPAWN = { col: 13.5, row: 17 };

/**
 * Count pellets in maze
 */
export function countPellets(maze: number[][]): { regular: number; power: number } {
  let regular = 0;
  let power = 0;

  for (const row of maze) {
    for (const cell of row) {
      if (cell === 2) regular++;
      if (cell === 3) power++;
    }
  }

  return { regular, power };
}

/**
 * Check if a tile is walkable
 */
export function isWalkable(maze: number[][], col: number, row: number): boolean {
  // Handle tunnel wrapping
  if (row === 13 && (col < 0 || col >= 28)) {
    return true;
  }

  // Out of bounds
  if (col < 0 || col >= 28 || row < 0 || row >= 31) {
    return false;
  }

  const tile = maze[row][col];
  return tile !== 1; // Not a wall
}

/**
 * Check if position is in tunnel slow zone
 */
export function isInTunnel(col: number, row: number): boolean {
  if (row !== 13) return false;
  return col < 6 || col > 21;
}

/**
 * Check if position is in ghost house
 */
export function isInGhostHouse(col: number, row: number): boolean {
  return col >= 10 && col <= 17 && row >= 12 && row <= 16;
}

/**
 * Get available directions from a tile
 */
export function getAvailableDirections(
  maze: number[][],
  col: number,
  row: number,
  excludeReverse: number = -1
): number[] {
  const directions: number[] = [];

  // Up (0)
  if (excludeReverse !== 0 && isWalkable(maze, col, row - 1)) {
    directions.push(0);
  }
  // Down (1)
  if (excludeReverse !== 1 && isWalkable(maze, col, row + 1)) {
    directions.push(1);
  }
  // Left (2)
  if (excludeReverse !== 2 && isWalkable(maze, Math.floor(col) - 1, row)) {
    directions.push(2);
  }
  // Right (3)
  if (excludeReverse !== 3 && isWalkable(maze, Math.ceil(col) + 1, row)) {
    directions.push(3);
  }

  return directions;
}
