/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  ParticleConfig,
  LiveParticle,
  PARTICLE_PRESETS
} from '../../types/particles';
import { soundSynth } from '../../services/audio/synth';
import {
  Sparkles,
  Flame,
  CloudRain,
  Snowflake,
  Wind,
  Bomb,
  RotateCcw,
  Download,
  Copy,
  Check,
  Play,
  Sliders
} from 'lucide-react';

export const ParticleSystemDesigner: React.FC = () => {
  const [activePresetKey, setActivePresetKey] = useState<string>('fire');
  const [config, setConfig] = useState<ParticleConfig>(() => ({ ...PARTICLE_PRESETS.fire }));
  const [copied, setCopied] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<LiveParticle[]>([]);
  const lastTimeRef = useRef<number>(performance.now());
  const emitterPosRef = useRef<{ x: number; y: number }>({ x: 300, y: 300 });

  // Handle Preset Switch
  const handleSelectPreset = (key: string) => {
    setActivePresetKey(key);
    const p = PARTICLE_PRESETS[key];
    if (p) {
      setConfig({ ...p });
      particlesRef.current = [];
      if (key === 'explosion' || key === 'sparks') {
        soundSynth.playExplosion();
      } else {
        soundSynth.playLaser();
      }
    }
  };

  // Particle simulation loop
  useEffect(() => {
    let animId: number;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderLoop = (time: number) => {
      const dt = Math.min(0.1, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;

      // Spawn new particles based on rate
      const spawnCount = Math.floor(config.rate * dt) + (Math.random() < (config.rate * dt) % 1 ? 1 : 0);
      const emitterX = emitterPosRef.current.x;
      const emitterY = emitterPosRef.current.y;

      for (let i = 0; i < spawnCount; i++) {
        if (particlesRef.current.length < config.count) {
          const halfSpread = (config.spreadAngle * Math.PI) / 360;
          const baseAngle = (config.emissionAngle * Math.PI) / 180;
          const angle = baseAngle + (Math.random() * 2 - 1) * halfSpread;
          const spd = config.speed * (0.6 + Math.random() * 0.8);

          particlesRef.current.push({
            x: emitterX + (Math.random() - 0.5) * 8,
            y: emitterY + (Math.random() - 0.5) * 8,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            size: config.startSize,
            life: config.lifetime,
            maxLife: config.lifetime,
            startColor: config.startColor,
            endColor: config.endColor,
            startSize: config.startSize,
            endSize: config.endSize,
            alpha: 1.0
          });
        }
      }

      // Clear Canvas
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#090a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Set particle blend mode
      ctx.globalCompositeOperation = config.blendMode;

      // Update & Draw Particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.life -= dt;
        if (p.life <= 0) return false;

        const progress = 1 - p.life / p.maxLife; // 0.0 to 1.0

        // Physics
        p.vy += config.gravity * dt;
        p.vx *= 1 - config.drag;
        p.vy *= 1 - config.drag;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Interpolate size & alpha
        const currentSize = Math.max(0.5, p.startSize + (p.endSize - p.startSize) * progress);
        const currentAlpha = Math.max(0, 1 - progress);

        ctx.globalAlpha = currentAlpha;
        ctx.fillStyle = progress < 0.5 ? p.startColor : p.endColor;

        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fill();

        return true;
      });

      // Draw Emitter crosshair
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(emitterX, emitterY, 6, 0, Math.PI * 2);
      ctx.moveTo(emitterX - 10, emitterY);
      ctx.lineTo(emitterX + 10, emitterY);
      ctx.moveTo(emitterX, emitterY - 10);
      ctx.lineTo(emitterX, emitterY + 10);
      ctx.stroke();

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [config]);

  // Click / Drag to move emitter
  const handleCanvasInteraction = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    emitterPosRef.current = { x, y };
  };

  // Copy code snippet to clipboard
  const handleCopyCode = () => {
    const code = `// AetherForge Particle System Config
const ${activePresetKey}Effect = ${JSON.stringify(config, null, 2)};
`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    soundSynth.playCoin();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-[#121316] text-[#e1e4ea] select-none overflow-hidden">
      {/* Left: Presets & Particle Generator Controls */}
      <div className="w-full md:w-80 bg-[#161821] border-b md:border-b-0 md:border-r border-[#262937] p-4 flex flex-col shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#282d3d] mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm text-white">افکت‌های ذرات (Particle FX)</h3>
          </div>
        </div>

        {/* Presets List */}
        <p className="text-gray-400 text-xs mb-2">جلوه‌های ویژه پیش‌فرض:</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {Object.entries(PARTICLE_PRESETS).map(([key, val]) => {
            const isSel = activePresetKey === key;
            return (
              <button
                key={key}
                onClick={() => handleSelectPreset(key)}
                className={`p-2 rounded-xl border text-xs font-medium text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSel
                    ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                    : 'bg-[#1e212b] border-[#2c3140] text-gray-300 hover:bg-[#252936]'
                }`}
              >
                <span className="truncate">{val.name}</span>
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: val.startColor }}
                />
              </button>
            );
          })}
        </div>

        {/* Parameter Sliders */}
        <div className="space-y-3 pt-3 border-t border-[#262a39] text-xs">
          <div className="flex items-center justify-between font-semibold text-gray-200">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>تنظیمات فیزیک ذرات</span>
            </span>
          </div>

          <div>
            <div className="flex justify-between text-gray-300 mb-1">
              <span>تعداد ذرات (Max Count):</span>
              <span className="font-mono text-cyan-400">{config.count}</span>
            </div>
            <input
              type="range"
              min="20"
              max="400"
              value={config.count}
              onChange={e => setConfig(prev => ({ ...prev, count: Number(e.target.value) }))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-gray-300 mb-1">
              <span>سرعت پرتاب (Speed):</span>
              <span className="font-mono text-cyan-400">{config.speed} px/s</span>
            </div>
            <input
              type="range"
              min="10"
              max="350"
              value={config.speed}
              onChange={e => setConfig(prev => ({ ...prev, speed: Number(e.target.value) }))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-gray-300 mb-1">
              <span>طول عمر (Lifetime):</span>
              <span className="font-mono text-cyan-400">{config.lifetime.toFixed(1)} ثانیه</span>
            </div>
            <input
              type="range"
              step="0.1"
              min="0.3"
              max="4.0"
              value={config.lifetime}
              onChange={e => setConfig(prev => ({ ...prev, lifetime: Number(e.target.value) }))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-gray-300 mb-1">
              <span>گرانش / جاذبه (Gravity):</span>
              <span className="font-mono text-cyan-400">{config.gravity}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="200"
              value={config.gravity}
              onChange={e => setConfig(prev => ({ ...prev, gravity: Number(e.target.value) }))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-gray-300 mb-1">
              <span>زاویه پخش (Spread Angle):</span>
              <span className="font-mono text-cyan-400">{config.spreadAngle}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={config.spreadAngle}
              onChange={e => setConfig(prev => ({ ...prev, spreadAngle: Number(e.target.value) }))}
              className="w-full accent-cyan-400"
            />
          </div>

          {/* Color pickers */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div>
              <span className="block text-[11px] text-gray-400 mb-1">رنگ شروع:</span>
              <input
                type="color"
                value={config.startColor}
                onChange={e => setConfig(prev => ({ ...prev, startColor: e.target.value }))}
                className="w-full h-8 rounded bg-transparent cursor-pointer border border-[#34384a]"
              />
            </div>
            <div>
              <span className="block text-[11px] text-gray-400 mb-1">رنگ پایان:</span>
              <input
                type="color"
                value={config.endColor}
                onChange={e => setConfig(prev => ({ ...prev, endColor: e.target.value }))}
                className="w-full h-8 rounded bg-transparent cursor-pointer border border-[#34384a]"
              />
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="mt-4 pt-3 border-t border-[#262a39] flex gap-2">
          <button
            onClick={handleCopyCode}
            className="flex-1 py-2 rounded-lg bg-[#242735] hover:bg-[#2e3346] border border-[#353b50] text-gray-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{copied ? 'کپی شد!' : 'کپی کد کانفیگ'}</span>
          </button>
        </div>
      </div>

      {/* Right / Center: Live Interactive Particle Viewport */}
      <div className="flex-1 flex flex-col bg-[#08090d] relative overflow-hidden">
        <div className="h-10 bg-[#14161f] border-b border-[#252836] flex items-center justify-between px-4 text-xs">
          <span className="font-semibold text-gray-200 flex items-center gap-2">
            <span>پیش‌نمایش زنده ذرات</span>
            <span className="text-[11px] text-cyan-400 font-normal">
              (برای تغییر موقعیت منبع پرتاب ذرات روی صفحه کلیک کنید یا بکشید)
            </span>
          </span>
          <span className="font-mono text-amber-400 text-[11px]">
            ذرات فعال: {particlesRef.current.length} / {config.count}
          </span>
        </div>

        <div className="flex-1 relative flex items-center justify-center p-4">
          <canvas
            ref={canvasRef}
            width={700}
            height={500}
            onMouseDown={e => handleCanvasInteraction(e.clientX, e.clientY)}
            onMouseMove={e => {
              if (e.buttons === 1) handleCanvasInteraction(e.clientX, e.clientY);
            }}
            onTouchStart={e => handleCanvasInteraction(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={e => handleCanvasInteraction(e.touches[0].clientX, e.touches[0].clientY)}
            className="w-full h-full max-w-[800px] max-h-[550px] rounded-2xl border border-[#232736] shadow-2xl cursor-crosshair object-contain"
          />
        </div>
      </div>
    </div>
  );
};
