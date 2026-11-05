/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TileDefinition {
  id: number;
  name: string;
  category: 'ground' | 'wall' | 'decor' | 'water' | 'hazard' | 'entity';
  color: string;
  secondaryColor?: string;
  solid: boolean; // Collision mask flag
  symbol?: string;
  autoTileGroup?: string;
}

export interface TileLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  locked: boolean;
  data: number[][]; // 2D array of tile IDs (-1 is empty)
}

export interface TilemapLevel {
  id: string;
  name: string;
  width: number; // in tiles
  height: number;
  tileSize: number; // in pixels (e.g., 24px)
  layers: TileLayer[];
  collisionMask: boolean[][]; // 2D grid indicating solid collisions
  spawnPoint: { x: number; y: number };
}

export const DEFAULT_TILESET: TileDefinition[] = [
  { id: 0, name: 'چمن (Grass)', category: 'ground', color: '#16a34a', secondaryColor: '#15803d', solid: false, symbol: '🌱', autoTileGroup: 'grass' },
  { id: 1, name: 'خاک (Dirt)', category: 'ground', color: '#78350f', secondaryColor: '#92400e', solid: false, symbol: '🟤', autoTileGroup: 'dirt' },
  { id: 2, name: 'سنگ فرش (Stone Path)', category: 'ground', color: '#64748b', secondaryColor: '#475569', solid: false, symbol: '🧱' },
  { id: 3, name: 'دیوار آجری (Brick Wall)', category: 'wall', color: '#b91c1c', secondaryColor: '#991b1b', solid: true, symbol: '🧱' },
  { id: 4, name: 'سنگ کوهستانی (Rock Wall)', category: 'wall', color: '#334155', secondaryColor: '#1e293b', solid: true, symbol: '🪨' },
  { id: 5, name: 'آب زلال (Water)', category: 'water', color: '#0284c7', secondaryColor: '#0369a1', solid: true, symbol: '💧' },
  { id: 6, name: 'مواد مذاب / تیغ (Lava / Hazard)', category: 'hazard', color: '#ea580c', secondaryColor: '#c2410c', solid: true, symbol: '🔥' },
  { id: 7, name: 'درخت تنومند (Tree)', category: 'decor', color: '#15803d', secondaryColor: '#78350f', solid: true, symbol: '🌲' },
  { id: 8, name: 'صندوق گنج (Treasure Chest)', category: 'entity', color: '#eab308', secondaryColor: '#ca8a04', solid: true, symbol: '🪙' },
  { id: 9, name: 'درب خروج / پیروزی (Exit Door)', category: 'entity', color: '#8b5cf6', secondaryColor: '#7c3aed', solid: false, symbol: '🚪' },
  { id: 10, name: 'چوب سازه‌ای (Wood Platform)', category: 'ground', color: '#a16207', secondaryColor: '#854d0e', solid: true, symbol: '🪵' },
  { id: 11, name: 'پورتال تلپورت (Portal)', category: 'entity', color: '#06b6d4', secondaryColor: '#0891b2', solid: false, symbol: '🌀' }
];

export function createEmptyLevel(width: number = 24, height: number = 14, tileSize: number = 28): TilemapLevel {
  const emptyGrid = () => Array.from({ length: height }, () => Array(width).fill(-1));
  const collisionGrid = () => Array.from({ length: height }, () => Array(width).fill(false));

  const groundLayerData = emptyGrid();
  const collision = collisionGrid();

  // Populate base floor and boundary
  for (let x = 0; x < width; x++) {
    groundLayerData[height - 1][x] = 0; // Grass floor
    groundLayerData[height - 2][x] = 0;
    collision[height - 1][x] = true;
    collision[height - 2][x] = true;
  }
  // Boundary walls
  for (let y = 0; y < height; y++) {
    groundLayerData[y][0] = 4;
    groundLayerData[y][width - 1] = 4;
    collision[y][0] = true;
    collision[y][width - 1] = true;
  }

  // Floating platforms
  for (let x = 5; x < 10; x++) {
    groundLayerData[height - 5][x] = 10;
    collision[height - 5][x] = true;
  }
  for (let x = 14; x < 19; x++) {
    groundLayerData[height - 8][x] = 10;
    collision[height - 8][x] = true;
  }

  return {
    id: 'level_1',
    name: 'مرحله ۱ - جزیره معلق (Level 1)',
    width,
    height,
    tileSize,
    spawnPoint: { x: 3, y: height - 3 },
    collisionMask: collision,
    layers: [
      {
        id: 'layer_bg',
        name: 'پس‌زمینه (Background)',
        visible: true,
        opacity: 0.6,
        locked: false,
        data: emptyGrid()
      },
      {
        id: 'layer_main',
        name: 'زمین و موانع (Ground & Walls)',
        visible: true,
        opacity: 1.0,
        locked: false,
        data: groundLayerData
      },
      {
        id: 'layer_objects',
        name: 'آبجکت‌ها و آیتم‌ها (Entities & Items)',
        visible: true,
        opacity: 1.0,
        locked: false,
        data: (() => {
          const g = emptyGrid();
          g[height - 6][7] = 8; // Chest on platform 1
          g[height - 9][16] = 9; // Exit door on platform 2
          return g;
        })()
      }
    ]
  };
}
