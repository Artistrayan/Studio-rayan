/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SpriteFrame {
  id: string;
  name: string;
  pixels: string[][]; // 2D array of hex color strings (e.g., 16x16 or 24x24)
}

export interface AnimationClip {
  id: string;
  name: string;
  fps: number;
  frameIds: string[];
  loop: boolean;
}

export interface SpriteSheetProject {
  id: string;
  name: string;
  gridWidth: number; // e.g. 16
  gridHeight: number; // e.g. 16
  frames: SpriteFrame[];
  animations: AnimationClip[];
}

export function createInitialPixelSprite(): SpriteSheetProject {
  const size = 16;
  const blankGrid = () => Array.from({ length: size }, () => Array(size).fill(''));

  // Frame 1: Idle Knight
  const frame1Grid = blankGrid();
  // Simple retro hero 16x16
  // Head
  for (let y = 3; y <= 6; y++) {
    for (let x = 6; x <= 9; x++) frame1Grid[y][x] = '#fcd34d'; // Skin/Helmet
  }
  frame1Grid[4][7] = '#0f172a'; // Eye L
  frame1Grid[4][8] = '#0f172a'; // Eye R
  // Body armor
  for (let y = 7; y <= 11; y++) {
    for (let x = 5; x <= 10; x++) frame1Grid[y][x] = '#3b82f6'; // Blue tunic
  }
  // Belt
  for (let x = 5; x <= 10; x++) frame1Grid[10][x] = '#78350f';
  // Legs
  frame1Grid[12][6] = '#1e293b'; frame1Grid[13][6] = '#1e293b'; frame1Grid[14][6] = '#94a3b8';
  frame1Grid[12][9] = '#1e293b'; frame1Grid[13][9] = '#1e293b'; frame1Grid[14][9] = '#94a3b8';
  // Sword
  frame1Grid[8][12] = '#e2e8f0'; frame1Grid[7][12] = '#e2e8f0'; frame1Grid[6][12] = '#e2e8f0'; frame1Grid[9][12] = '#f59e0b';

  // Frame 2: Walk step 1
  const frame2Grid = JSON.parse(JSON.stringify(frame1Grid));
  frame2Grid[13][6] = ''; frame2Grid[14][6] = '';
  frame2Grid[12][5] = '#1e293b'; frame2Grid[13][4] = '#94a3b8'; // Leg forward

  // Frame 3: Walk step 2
  const frame3Grid = JSON.parse(JSON.stringify(frame1Grid));
  frame3Grid[13][9] = ''; frame3Grid[14][9] = '';
  frame3Grid[12][10] = '#1e293b'; frame3Grid[13][11] = '#94a3b8'; // Leg backward

  // Frame 4: Attack swing
  const frame4Grid = JSON.parse(JSON.stringify(frame1Grid));
  frame4Grid[6][12] = ''; frame4Grid[7][12] = '';
  frame4Grid[7][13] = '#e2e8f0'; frame4Grid[7][14] = '#e2e8f0'; frame4Grid[7][15] = '#38bdf8'; // Sword thrust

  return {
    id: 'sprite_hero_1',
    name: 'شوالیه‌ی قهرمان (Hero Knight 16x16)',
    gridWidth: 16,
    gridHeight: 16,
    frames: [
      { id: 'f_idle', name: 'ایستاده (Idle)', pixels: frame1Grid },
      { id: 'f_walk1', name: 'قدم راست (Walk R)', pixels: frame2Grid },
      { id: 'f_walk2', name: 'قدم چپ (Walk L)', pixels: frame3Grid },
      { id: 'f_attack', name: 'ضربه شمشیر (Attack)', pixels: frame4Grid }
    ],
    animations: [
      { id: 'anim_idle', name: 'انیمیشن استراحت (Idle)', fps: 3, frameIds: ['f_idle'], loop: true },
      { id: 'anim_walk', name: 'انیمیشن راه رفتن (Walk)', fps: 6, frameIds: ['f_walk1', 'f_idle', 'f_walk2', 'f_idle'], loop: true },
      { id: 'anim_attack', name: 'انیمیشن حمله (Attack)', fps: 8, frameIds: ['f_idle', 'f_attack', 'f_idle'], loop: false }
    ]
  };
}
