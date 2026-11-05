/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useStudio } from '../../context/StudioContext';
import { soundSynth } from '../../services/audio/synth';
import { translations } from '../../services/i18n';
import {
  Maximize2,
  Smartphone,
  Tablet,
  Monitor,
  Volume2,
  Sparkles,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Layers
} from 'lucide-react';

export const GameViewport: React.FC = () => {
  const { isPlaying, setFps, language, activeTextureUrl } = useStudio();
  const t = translations[language];

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const [aspectRatio, setAspectRatio] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [score, setScore] = useState<number>(0);
  const [coinsCollected, setCoinsCollected] = useState<number>(0);

  // Virtual touch controls state for mobile/tablet
  const touchKeys = useRef<{ left: boolean; right: boolean; jump: boolean }>({
    left: false,
    right: false,
    jump: false
  });

  // Game internal state
  const gameState = useRef({
    player: {
      x: 80,
      y: 280,
      w: 30,
      h: 30,
      vx: 0,
      vy: 0,
      speed: 5.5,
      jumpForce: -12.5,
      gravity: 0.58,
      grounded: false,
      color: '#38bdf8',
      score: 0
    },
    platforms: [
      { x: 0, y: 410, w: 800, h: 40, color: '#1e293b' },
      { x: 180, y: 330, w: 150, h: 18, color: '#334155' },
      { x: 420, y: 260, w: 170, h: 18, color: '#334155' },
      { x: 130, y: 190, w: 130, h: 18, color: '#334155' },
      { x: 620, y: 210, w: 150, h: 18, color: '#334155' }
    ],
    coins: [
      { x: 230, y: 290, r: 9, collected: false },
      { x: 480, y: 220, r: 9, collected: false },
      { x: 180, y: 150, r: 9, collected: false },
      { x: 680, y: 170, r: 9, collected: false }
    ],
    particles: [] as { x: number; y: number; vx: number; vy: number; r: number; color: string; life: number }[],
    keys: {} as Record<string, boolean>
  });

  // Spawn particle helper
  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      gameState.current.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 7,
        vy: (Math.random() - 0.8) * 6,
        r: Math.random() * 3 + 2,
        color,
        life: 1.0
      });
    }
  };

  // Reset Game
  const resetGame = () => {
    const s = gameState.current;
    s.player.x = 80;
    s.player.y = 280;
    s.player.vx = 0;
    s.player.vy = 0;
    s.player.score = 0;
    s.coins.forEach(c => (c.collected = false));
    s.particles = [];
    setScore(0);
    setCoinsCollected(0);
    soundSynth.playLaser();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      gameState.current.keys[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      gameState.current.keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = performance.now();

    const loop = (currentTime: number) => {
      // Calculate FPS
      frameCount++;
      if (currentTime - fpsTimer >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        fpsTimer = currentTime;
      }

      if (isPlaying) {
        const state = gameState.current;
        const p = state.player;

        // Combine hardware keys and mobile touch controls
        const left = state.keys['ArrowLeft'] || state.keys['KeyA'] || touchKeys.current.left;
        const right = state.keys['ArrowRight'] || state.keys['KeyD'] || touchKeys.current.right;
        const jump = state.keys['ArrowUp'] || state.keys['KeyW'] || state.keys['Space'] || touchKeys.current.jump;

        if (left) p.vx = -p.speed;
        else if (right) p.vx = p.speed;
        else p.vx *= 0.78;

        if (jump && p.grounded) {
          p.vy = p.jumpForce;
          p.grounded = false;
          soundSynth.playJump();
          spawnParticles(p.x + p.w / 2, p.y + p.h, '#f59e0b', 16); // Golden jump blast
        }

        // Dynamic player particles (Running dust + jet thrust)
        if (p.grounded && Math.abs(p.vx) > 2) {
          if (Math.random() < 0.3) {
            spawnParticles(p.x + (p.vx > 0 ? 0 : p.w), p.y + p.h, '#64748b', 2);
          }
        } else if (!p.grounded && p.vy < 0) {
          // Mid-air rocket trail
          if (Math.random() < 0.4) {
            spawnParticles(p.x + p.w / 2, p.y + p.h, '#38bdf8', 3);
          }
        }

        // Apply Gravity & Movement
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;

        // Bounds
        if (p.x < 0) p.x = 0;
        if (p.x + p.w > canvas.width) p.x = canvas.width - p.w;

        // Platform collisions
        p.grounded = false;
        for (const plat of state.platforms) {
          if (
            p.x + p.w > plat.x &&
            p.x < plat.x + plat.w &&
            p.y + p.h >= plat.y &&
            p.y + p.h <= plat.y + 20 &&
            p.vy >= 0
          ) {
            p.y = plat.y - p.h;
            p.vy = 0;
            p.grounded = true;
          }
        }

        // Coin pickups
        state.coins.forEach(c => {
          if (!c.collected) {
            const dx = p.x + p.w / 2 - c.x;
            const dy = p.y + p.h / 2 - c.y;
            if (Math.hypot(dx, dy) < p.w / 2 + c.r) {
              c.collected = true;
              p.score += 150;
              setScore(p.score);
              setCoinsCollected(prev => prev + 1);
              soundSynth.playCoin();
              spawnParticles(c.x, c.y, '#facc15', 18);
            }
          }
        });

        // Update particles
        for (let i = state.particles.length - 1; i >= 0; i--) {
          const pt = state.particles[i];
          pt.x += pt.vx;
          pt.y += pt.vy;
          pt.life -= 0.035;
          if (pt.life <= 0) state.particles.splice(i, 1);
        }
      }

      // Render Frame
      const state = gameState.current;
      const W = canvas.width;
      const H = canvas.height;

      // Dark sci-fi background
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#090d16');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Procedural Grid Lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Draw Platforms with metallic bevel
      state.platforms.forEach(plat => {
        ctx.fillStyle = plat.color;
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

        // Highlight line
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(plat.x, plat.y);
        ctx.lineTo(plat.x + plat.w, plat.y);
        ctx.stroke();
      });

      // Draw Coins with pulsating glow
      state.coins.forEach(c => {
        if (!c.collected) {
          const bounce = Math.sin(currentTime * 0.005) * 4;
          ctx.save();
          ctx.shadowColor = '#eab308';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(c.x, c.y + bounce, c.r, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }
      });

      // Draw Particles
      state.particles.forEach(pt => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.life);
        ctx.fillStyle = pt.color;
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Player
      const p = state.player;
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.w, p.h);

      // Eyes/Visor
      ctx.fillStyle = '#ffffff';
      const dir = p.vx >= 0 ? 1 : -1;
      ctx.fillRect(p.x + 14 + dir * 6, p.y + 7, 5, 8);
      ctx.restore();

      animationFrameId.current = requestAnimationFrame(loop);
    };

    animationFrameId.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isPlaying, setFps]);

  // Touch handlers for virtual joystick & jump button
  const handleTouchLeft = (pressed: boolean) => {
    touchKeys.current.left = pressed;
  };
  const handleTouchRight = (pressed: boolean) => {
    touchKeys.current.right = pressed;
  };
  const handleTouchJump = (pressed: boolean) => {
    touchKeys.current.jump = pressed;
  };

  return (
    <div className="flex-1 flex flex-col bg-[#14161b] relative overflow-hidden h-full">
      {/* Top Toolbar */}
      <div className="h-10 bg-[#1a1c23] border-b border-[#2b2e38] flex items-center justify-between px-3 text-xs shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-gray-200">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>2D/3D Real-Time Physics Engine</span>
          </div>
          <span className="text-gray-500">|</span>
          <div className="font-mono text-cyan-400">
            SCORE: <span className="font-bold text-white">{score}</span>
          </div>
          <div className="font-mono text-amber-400">
            COINS: <span className="font-bold text-white">{coinsCollected}/4</span>
          </div>
        </div>

        {/* Viewport Aspect Presets */}
        <div className="flex items-center gap-2">
          <div className="flex bg-[#232630] rounded p-0.5 border border-[#343846]">
            <button
              onClick={() => setAspectRatio('desktop')}
              className={`p-1 rounded cursor-pointer ${
                aspectRatio === 'desktop' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Desktop (16:9)"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setAspectRatio('tablet')}
              className={`p-1 rounded cursor-pointer ${
                aspectRatio === 'tablet' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Tablet (4:3)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setAspectRatio('mobile')}
              className={`p-1 rounded cursor-pointer ${
                aspectRatio === 'mobile' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Mobile (9:16)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={resetGame}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#232630] hover:bg-[#2e323e] text-gray-300 border border-[#343846] cursor-pointer"
            title="Reset Game"
          >
            <RotateCcw className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Viewport Container */}
      <div className="flex-1 flex items-center justify-center p-3 relative bg-[#0b0d13]">
        <div
          className={`relative border-2 border-[#2b2f3c] rounded-lg overflow-hidden shadow-2xl transition-all duration-300 ${
            aspectRatio === 'desktop'
              ? 'w-full max-w-4xl aspect-[16/9]'
              : aspectRatio === 'tablet'
              ? 'w-full max-w-2xl aspect-[4/3]'
              : 'w-full max-w-sm aspect-[9/16]'
          }`}
        >
          <canvas
            ref={canvasRef}
            width={800}
            height={450}
            className="w-full h-full block bg-[#0f172a]"
          />

          {/* On-screen Touch Controls (Mobile/Tablet and preview overlay) */}
          <div className="absolute inset-x-4 bottom-4 flex justify-between pointer-events-none z-10">
            {/* Left/Right Directional buttons */}
            <div className="flex gap-2 pointer-events-auto">
              <button
                onMouseDown={() => handleTouchLeft(true)}
                onMouseUp={() => handleTouchLeft(false)}
                onTouchStart={() => handleTouchLeft(true)}
                onTouchEnd={() => handleTouchLeft(false)}
                className="w-12 h-12 rounded-full bg-gray-900/80 backdrop-blur-sm border border-gray-700/60 flex items-center justify-center text-cyan-400 active:bg-cyan-600/30 active:scale-95 transition-all shadow-lg"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <button
                onMouseDown={() => handleTouchRight(true)}
                onMouseUp={() => handleTouchRight(false)}
                onTouchStart={() => handleTouchRight(true)}
                onTouchEnd={() => handleTouchRight(false)}
                className="w-12 h-12 rounded-full bg-gray-900/80 backdrop-blur-sm border border-gray-700/60 flex items-center justify-center text-cyan-400 active:bg-cyan-600/30 active:scale-95 transition-all shadow-lg"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>

            {/* Jump Button */}
            <div className="pointer-events-auto">
              <button
                onMouseDown={() => handleTouchJump(true)}
                onMouseUp={() => handleTouchJump(false)}
                onTouchStart={() => handleTouchJump(true)}
                onTouchEnd={() => handleTouchJump(false)}
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 border border-cyan-400/40 flex items-center justify-center text-white active:scale-90 font-bold shadow-lg shadow-cyan-500/20"
              >
                <ArrowUp className="w-7 h-7" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
