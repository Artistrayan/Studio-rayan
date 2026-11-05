/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VFSFile } from '../../types';

const STORAGE_KEY = 'aetherforge_vfs_files';

export const DEFAULT_FILES: VFSFile[] = [
  {
    id: '1',
    name: 'game2d.js',
    path: '/src/game2d.js',
    language: 'javascript',
    content: `// === AetherForge 2D Canvas Game Engine ===
// Press "Run Code" or switch to Game Engine tab to play!

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

// Player State
const player = {
  x: 100,
  y: 300,
  w: 32,
  h: 32,
  vx: 0,
  vy: 0,
  speed: 5,
  jumpPower: -12,
  gravity: 0.55,
  grounded: false,
  color: '#38bdf8',
  score: 0,
  particles: []
};

// Platforms
const platforms = [
  { x: 0, y: H - 40, w: W, h: 40, color: '#334155' },
  { x: 200, y: 350, w: 140, h: 20, color: '#475569' },
  { x: 420, y: 280, w: 160, h: 20, color: '#475569' },
  { x: 150, y: 200, w: 120, h: 20, color: '#475569' },
  { x: 620, y: 220, w: 150, h: 20, color: '#475569' }
];

// Collectibles
const coins = [
  { x: 250, y: 310, r: 8, collected: false },
  { x: 480, y: 240, r: 8, collected: false },
  { x: 200, y: 160, r: 8, collected: false },
  { x: 680, y: 180, r: 8, collected: false }
];

// Controls
const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup', e => { keys[e.code] = false; });

// Main Game Loop
function update() {
  // Input
  if (keys['ArrowLeft'] || keys['KeyA']) player.vx = -player.speed;
  else if (keys['ArrowRight'] || keys['KeyD']) player.vx = player.speed;
  else player.vx *= 0.8;

  if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && player.grounded) {
    player.vy = player.jumpPower;
    player.grounded = false;
    spawnParticles(player.x + player.w/2, player.y + player.h, '#94a3b8', 8);
  }

  // Physics
  player.vy += player.gravity;
  player.x += player.vx;
  player.y += player.vy;

  // Collision with boundaries
  if (player.x < 0) player.x = 0;
  if (player.x + player.w > W) player.x = W - player.w;

  // Collision with platforms
  player.grounded = false;
  for (const plat of platforms) {
    if (
      player.x + player.w > plat.x &&
      player.x < plat.x + plat.w &&
      player.y + player.h >= plat.y &&
      player.y + player.h <= plat.y + 20 &&
      player.vy >= 0
    ) {
      player.y = plat.y - player.h;
      player.vy = 0;
      player.grounded = true;
    }
  }

  // Coin Collection
  coins.forEach(coin => {
    if (!coin.collected) {
      const dx = (player.x + player.w/2) - coin.x;
      const dy = (player.y + player.h/2) - coin.y;
      if (Math.hypot(dx, dy) < player.w/2 + coin.r) {
        coin.collected = true;
        player.score += 100;
        spawnParticles(coin.x, coin.y, '#facc15', 15);
      }
    }
  });

  // Update Particles
  for (let i = player.particles.length - 1; i >= 0; i--) {
    const p = player.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.04;
    if (p.life <= 0) player.particles.splice(i, 1);
  }
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    player.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.8) * 5,
      r: Math.random() * 3 + 2,
      color,
      life: 1.0
    });
  }
}

function draw() {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, W, H);

  // Grid background effect
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }

  // Draw Platforms
  platforms.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = '#64748b';
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  });

  // Draw Coins
  coins.forEach(c => {
    if (!c.collected) {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(c.x, c.y + Math.sin(Date.now() * 0.005) * 3, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#eab308';
      ctx.stroke();
    }
  });

  // Draw Particles
  player.particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1.0;

  // Draw Player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = '#ffffff';
  // Eyes
  const dir = player.vx >= 0 ? 1 : -1;
  ctx.fillRect(player.x + 16 + dir * 6, player.y + 8, 4, 6);

  // HUD
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px "Fira Code", monospace';
  ctx.fillText('SCORE: ' + player.score, 24, 34);
  ctx.fillText('AETHERFORGE 2D ENGINE (READY)', W - 320, 34);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
console.log('Game initialized! Use Arrow Keys or WASD to move and jump.');
`
  },
  {
    id: '2',
    name: 'shader.glsl',
    path: '/src/shader.glsl',
    language: 'glsl',
    content: `// === AetherForge Real-Time GLSL Fragment Shader ===
// Uniforms passed from Studio:
// uniform vec2 u_resolution; // Canvas width and height
// uniform float u_time;       // Elapsed time in seconds
// uniform vec2 u_mouse;      // Normalized mouse coordinates [0, 1]

precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

void main() {
    vec2 st = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
    
    // Cybernetic plasma coordinates
    float d = length(st);
    float angle = atan(st.y, st.x);
    
    float wave1 = sin(d * 8.0 - u_time * 2.5 + sin(angle * 4.0));
    float wave2 = cos(st.x * 6.0 + u_time * 1.2);
    float wave3 = sin(st.y * 6.0 - u_time * 1.8);
    
    float intensity = 0.5 + 0.5 * sin(wave1 + wave2 + wave3);
    
    // Dynamic color gradient (Cyan to Neon Purple & Gold)
    vec3 col = vec3(0.08, 0.45, 0.95) * (1.0 - d * 0.4);
    col += vec3(0.85, 0.15, 0.9) * intensity;
    col += vec3(1.0, 0.8, 0.2) * pow(intensity, 4.0);
    
    // Vignette
    col *= 1.0 - smoothstep(0.7, 1.4, d);
    
    gl_FragColor = vec4(col, 1.0);
}
`
  },
  {
    id: '3',
    name: 'physics_calc.py',
    path: '/src/physics_calc.py',
    language: 'python',
    content: `# === AetherForge Python Kinematics & Simulation Engine ===
# Runs natively in browser sandbox and Termux terminal!

import math

def calculate_trajectory(v0, angle_deg, g=9.81, steps=10):
    theta = math.radians(angle_deg)
    vx = v0 * math.cos(theta)
    vy = v0 * math.sin(theta)
    
    t_flight = (2 * vy) / g
    max_height = (vy ** 2) / (2 * g)
    total_range = vx * t_flight
    
    print(f"=== Projectile Launch Simulation ===")
    print(f"Initial Velocity: {v0:.2f} m/s at {angle_deg}°")
    print(f"Time of Flight: {t_flight:.2f} s")
    print(f"Max Altitude:   {max_height:.2f} m")
    print(f"Total Range:    {total_range:.2f} m\\n")
    print("Trajectory Sample Points:")
    
    dt = t_flight / steps
    points = []
    for i in range(steps + 1):
        t = i * dt
        x = vx * t
        y = max(0.0, vy * t - 0.5 * g * (t ** 2))
        points.append((round(x, 2), round(y, 2)))
        print(f"  t={t:.2f}s -> X={x:.2f}m, Y={y:.2f}m")
        
    return points

# Run simulation
results = calculate_trajectory(v0=25.0, angle_deg=45.0)
print(f"\\nSimulation finished successfully. Computed {len(results)} coordinate steps.")
`
  },
  {
    id: '4',
    name: 'ai_patrol.lua',
    path: '/src/ai_patrol.lua',
    language: 'lua',
    content: `-- === AetherForge Lua AI State Machine ===
-- Real executable Lua script for game behavior

local Enemy = {}
Enemy.__index = Enemy

function Enemy.new(name, speed)
    local self = setmetatable({}, Enemy)
    self.name = name
    self.speed = speed or 2.5
    self.state = "PATROL"
    self.waypoint = 1
    self.path = {
        {x = 50,  y = 120},
        {x = 200, y = 120},
        {x = 350, y = 250},
        {x = 100, y = 250}
    }
    self.pos = {x = 50, y = 120}
    return self
end

function Enemy:update(player_distance)
    if player_distance < 60 then
        self.state = "ATTACK"
    elseif player_distance < 150 then
        self.state = "CHASE"
    else
        self.state = "PATROL"
    end
    
    if self.state == "PATROL" then
        local target = self.path[self.waypoint]
        local dx = target.x - self.pos.x
        local dy = target.y - self.pos.y
        local dist = math.sqrt(dx*dx + dy*dy)
        if dist < 5 then
            self.waypoint = (self.waypoint % #self.path) + 1
        end
    end
    
    print(string.format("[%s] State: %s | Pos: (%.1f, %.1f) | Target Waypoint: %d", 
        self.name, self.state, self.pos.x, self.pos.y, self.waypoint))
end

-- Simulate ticks
print("Starting Lua AI Bot simulation...")
local bot = Enemy.new("Sentron-X", 3.0)
for i = 1, 5 do
    local simulated_distance = 180 - (i * 30)
    bot:update(simulated_distance)
end
print("Lua script executed cleanly.")
`
  },
  {
    id: '5',
    name: 'package.json',
    path: '/package.json',
    language: 'json',
    content: `{
  "name": "aetherforge-game-project",
  "version": "1.0.0",
  "description": "Standalone game created with AetherForge Studio",
  "main": "src/game2d.js",
  "scripts": {
    "start": "aetherforge run",
    "build": "aetherforge export --all"
  },
  "dependencies": {
    "three": "^0.170.0"
  }
}
`
  },
  {
    id: '6',
    name: 'README.md',
    path: '/README.md',
    language: 'markdown',
    content: `# AetherForge Studio Project
Welcome to your offline-ready Game & App workspace.
- **VS Code**: Edit real JavaScript, TypeScript, GLSL shaders, Python, and Lua.
- **Termux Terminal**: Execute commands like \`node\`, \`python\`, \`git\`, \`build\`.
- **3D Studio**: Sculpt, light, texture, and animate 3D models.
- **No-Code**: Visually link events and actions, then convert to code.
- **Export**: One-click bundle to Web, Android APK, iOS, Desktop Electron!
`
  }
];

export class VirtualFileSystem {
  private files: Map<string, VFSFile> = new Map();

  constructor() {
    this.init();
  }

  private init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: VFSFile[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach(f => this.files.set(f.path, f));
          return;
        }
      } catch (e) {
        console.warn('Failed to parse saved VFS, loading defaults', e);
      }
    }
    // Load defaults
    DEFAULT_FILES.forEach(f => this.files.set(f.path, { ...f }));
    this.saveToStorage();
  }

  public getFiles(): VFSFile[] {
    return Array.from(this.files.values());
  }

  public getFile(path: string): VFSFile | undefined {
    return this.files.get(path);
  }

  public saveFile(path: string, content: string): VFSFile {
    let file = this.files.get(path);
    if (file) {
      file.content = content;
      file.isDirty = false;
    } else {
      const ext = path.split('.').pop() || '';
      const lang = this.detectLanguage(ext);
      const name = path.split('/').pop() || path;
      file = {
        id: 'file_' + Date.now() + Math.random().toString(36).substring(2, 6),
        name,
        path,
        content,
        language: lang,
        isDirty: false
      };
      this.files.set(path, file);
    }
    this.saveToStorage();
    return file;
  }

  public deleteFile(path: string): boolean {
    const res = this.files.delete(path);
    if (res) this.saveToStorage();
    return res;
  }

  public createFile(path: string, initialContent: string = ''): VFSFile {
    return this.saveFile(path, initialContent);
  }

  public resetToDefaults(): void {
    this.files.clear();
    DEFAULT_FILES.forEach(f => this.files.set(f.path, { ...f }));
    this.saveToStorage();
  }

  private saveToStorage() {
    try {
      const list = Array.from(this.files.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Storage quota exceeded or error saving VFS', e);
    }
  }

  private detectLanguage(ext: string): VFSFile['language'] {
    switch (ext.toLowerCase()) {
      case 'js': return 'javascript';
      case 'ts': return 'typescript';
      case 'py': return 'python';
      case 'lua': return 'lua';
      case 'glsl':
      case 'vert':
      case 'frag': return 'glsl';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'json': return 'json';
      case 'md': return 'markdown';
      default: return 'javascript';
    }
  }
}

export const vfsInstance = new VirtualFileSystem();
