/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VFSFile } from '../../types';
import { DEFAULT_FILES } from '../vfs/fileSystem';

export type ProjectTemplateId =
  | 'sidescroller_2d'
  | 'sandbox_3d'
  | 'political_strategy'
  | 'mobile_app'
  | 'rpg_topdown'
  | 'shader_art';

export interface ProjectTemplate {
  id: ProjectTemplateId;
  titleFa: string;
  titleEn: string;
  tag: string;
  badgeColor: string;
  descriptionFa: string;
  descriptionEn: string;
  icon: string;
  files: VFSFile[];
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'sidescroller_2d',
    titleFa: 'بازی دوبعدی ساید-اسکرولر (2D Side-Scroller)',
    titleEn: '2D Side-Scroller Game',
    tag: 'Platformer',
    badgeColor: '#06b6d4',
    icon: 'Gamepad2',
    descriptionFa: 'پروژه آماده با فیزیک پرش، موتور جاذبه، سکه‌ها، دشمنان گشت‌زن و تایل‌مپ کامل.',
    descriptionEn: 'Full 2D platformer with jump physics, coin collectibles, patrol enemies, and camera tracking.',
    files: [
      {
        id: 'scroller_main',
        name: 'main.js',
        path: '/src/main.js',
        language: 'javascript',
        content: `// === 2D Side-Scroller Platformer Engine ===
class PlatformerGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.player = { x: 50, y: 300, vx: 0, vy: 0, w: 32, h: 32, grounded: false, score: 0 };
    this.gravity = 0.65;
    this.platforms = [
      { x: 0, y: 380, w: 800, h: 40, color: '#16a34a' },
      { x: 180, y: 300, w: 140, h: 16, color: '#78350f' },
      { x: 380, y: 230, w: 160, h: 16, color: '#78350f' },
      { x: 600, y: 170, w: 150, h: 16, color: '#78350f' }
    ];
    this.coins = [{ x: 230, y: 260 }, { x: 440, y: 190 }, { x: 660, y: 130 }];
    this.init();
  }

  init() {
    console.log("2D Side-Scroller initialized with physics & tile platforms.");
  }
}
new PlatformerGame(document.getElementById('game-canvas') || { getContext: () => ({}) });
`
      },
      {
        id: 'scroller_physics',
        name: 'physics2d.js',
        path: '/src/physics2d.js',
        language: 'javascript',
        content: `export function checkAABB(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
`
      }
    ]
  },
  {
    id: 'sandbox_3d',
    titleFa: 'محیط سه‌بعدی و سندباکس (3D Sandbox)',
    titleEn: '3D Sandbox World',
    tag: 'Three.js / 3D',
    badgeColor: '#8b5cf6',
    icon: 'Box',
    descriptionFa: 'صحنه رندر ۳D با کنترل دوربین مدارگرد (Orbit)، نورپردازی استودیو، متریال PBR و اشکال هندسی.',
    descriptionEn: 'Interactive Three.js 3D viewport with PBR lighting, orbit controls, procedural meshes, and shadows.',
    files: [
      {
        id: 'sandbox_scene',
        name: 'scene3d.js',
        path: '/src/scene3d.js',
        language: 'javascript',
        content: `// === 3D Sandbox Scene Setup ===
import * as THREE from 'three';

export function createSandboxScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c14);
  const camera = new THREE.PerspectiveCamera(60, 16/9, 0.1, 1000);
  camera.position.set(0, 3, 6);

  const light = new THREE.DirectionalLight(0xffffff, 1.5);
  light.position.set(5, 10, 7);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x223344, 0.8));

  // Central sculpted mesh
  const geo = new THREE.TorusKnotGeometry(1.2, 0.35, 128, 32);
  const mat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.25, metalness: 0.8 });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  return { scene, camera, mesh };
}
console.log("3D Sandbox World ready.");
`
      }
    ]
  },
  {
    id: 'political_strategy',
    titleFa: 'شبیه‌ساز تصمیم‌گیری سیاسی (Political Strategy)',
    titleEn: 'Political & Statecraft Sim',
    tag: 'Strategy',
    badgeColor: '#f59e0b',
    icon: 'Landmark',
    descriptionFa: 'سیستم شبیه‌سازی ملی، مدیریت احزاب، پارلمان، فرمان‌های حکومتی، شاخص فساد و محبوبیت.',
    descriptionEn: 'National cabinet simulator with decrees, fiscal treasury, public approval, and legislative dilemmas.',
    files: [
      {
        id: 'pol_sim',
        name: 'cabinet_engine.js',
        path: '/src/cabinet_engine.js',
        language: 'javascript',
        content: `// === National Statecraft Engine ===
export const nationalMetrics = {
  approval: 68,
  treasuryBillion: 420,
  stability: 74,
  civilRights: 60,
  corruptionIndex: 22
};

export function enactDecree(title, effects) {
  console.log("Decree Enacted: " + title);
  for (const [k, v] of Object.entries(effects)) {
    if (nationalMetrics[k] !== undefined) nationalMetrics[k] += v;
  }
}
`
      }
    ]
  },
  {
    id: 'mobile_app',
    titleFa: 'اپلیکیشن موبایل و داشبورد (Mobile & App Dashboard)',
    titleEn: 'Mobile App & UI Screen',
    tag: 'Flutter / React',
    badgeColor: '#10b981',
    icon: 'Smartphone',
    descriptionFa: 'قالب اپلیکیشن همراه با نوار ابزار، کارت‌های آمار، پایگاه داده محلی SQLite و کلاینت API.',
    descriptionEn: 'Ready-to-deploy mobile application with local database queries, responsive UI cards, and API requests.',
    files: [
      {
        id: 'app_ui',
        name: 'DashboardScreen.tsx',
        path: '/src/DashboardScreen.tsx',
        language: 'typescript',
        content: `import React, { useState } from 'react';

export const DashboardScreen: React.FC = () => {
  const [usersCount, setUsersCount] = useState(1420);
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <header className="p-4 bg-slate-800 rounded-xl font-bold text-sky-400">
        AetherForge Mobile Application
      </header>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="p-4 bg-slate-800 rounded-xl">کاربران: {usersCount}</div>
        <div className="p-4 bg-slate-800 rounded-xl text-emerald-400">وضعیت: آنلاین</div>
      </div>
    </div>
  );
};
`
      }
    ]
  }
];
