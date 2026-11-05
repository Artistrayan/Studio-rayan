/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  SpriteSheetProject,
  SpriteFrame,
  AnimationClip,
  createInitialPixelSprite
} from '../../types/sprites';
import { soundSynth } from '../../services/audio/synth';
import {
  Paintbrush,
  Play,
  Pause,
  Plus,
  Trash2,
  Download,
  Upload,
  Copy,
  Layers,
  Sparkles,
  Eraser,
  Eye,
  Film
} from 'lucide-react';

export const PixelSpriteAnimator: React.FC = () => {
  const [project, setProject] = useState<SpriteSheetProject>(() => createInitialPixelSprite());
  const [selectedFrameId, setSelectedFrameId] = useState<string>('f_idle');
  const [selectedAnimId, setSelectedAnimId] = useState<string>('anim_walk');
  const [activeColor, setActiveColor] = useState<string>('#3b82f6');
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [isAnimPlaying, setIsAnimPlaying] = useState<boolean>(true);
  const [animCurrentFrameIndex, setAnimCurrentFrameIndex] = useState<number>(0);
  const [onionSkin, setOnionSkin] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isMouseDownRef = useRef<boolean>(false);

  const activeFrame = project.frames.find(f => f.id === selectedFrameId) || project.frames[0];
  const activeFrameIndex = project.frames.findIndex(f => f.id === selectedFrameId);
  const previousFrame = activeFrameIndex > 0 ? project.frames[activeFrameIndex - 1] : null;
  const activeAnim = project.animations.find(a => a.id === selectedAnimId) || project.animations[0];

  // Palette colors for pixel art
  const PALETTE = [
    '#ffffff', '#000000', '#1e293b', '#64748b', '#ef4444', '#f97316',
    '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
    '#78350f', '#fcd34d', '#34d399', '#38bdf8'
  ];

  // Draw frame on main canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeFrame) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = project.gridWidth;
    const scale = canvas.width / size;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Checkerboard background for transparency
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#1b1d26' : '#222533';
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }

    // Draw Onion Skin (Translucent ghost of previous frame)
    if (onionSkin && previousFrame) {
      ctx.globalAlpha = 0.28;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const ghostColor = previousFrame.pixels[y][x];
          if (ghostColor) {
            ctx.fillStyle = ghostColor;
            ctx.fillRect(x * scale, y * scale, scale, scale);
          }
        }
      }
      ctx.globalAlpha = 1.0;
    }

    // Draw active frame pixel data
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const color = activeFrame.pixels[y][x];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }

    // Draw grid overlay
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= size; i++) {
      ctx.beginPath();
      ctx.moveTo(i * scale, 0);
      ctx.lineTo(i * scale, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * scale);
      ctx.lineTo(canvas.width, i * scale);
      ctx.stroke();
    }
  }, [activeFrame, project.gridWidth]);

  // Handle painting pixels
  const paintPixelAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !activeFrame) return;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / project.gridWidth;
    const x = Math.floor((clientX - rect.left) / (rect.width / project.gridWidth));
    const y = Math.floor((clientY - rect.top) / (rect.height / project.gridHeight));

    if (x >= 0 && x < project.gridWidth && y >= 0 && y < project.gridHeight) {
      const newColor = isEraser ? '' : activeColor;
      setProject(prev => {
        const nextFrames = prev.frames.map(f => {
          if (f.id !== activeFrame.id) return f;
          const nextPixels = f.pixels.map(row => [...row]);
          nextPixels[y][x] = newColor;
          return { ...f, pixels: nextPixels };
        });
        return { ...prev, frames: nextFrames };
      });
      soundSynth.playCoin();
    }
  };

  // Animation timeline playback ticker
  useEffect(() => {
    if (!isAnimPlaying || !activeAnim || activeAnim.frameIds.length === 0) return;

    const interval = 1000 / activeAnim.fps;
    const timer = setInterval(() => {
      setAnimCurrentFrameIndex(idx => (idx + 1) % activeAnim.frameIds.length);
    }, interval);

    return () => clearInterval(timer);
  }, [isAnimPlaying, activeAnim]);

  // Duplicate active frame
  const duplicateActiveFrame = () => {
    const newId = `f_${Date.now()}`;
    const newFrame: SpriteFrame = {
      id: newId,
      name: `فریم ${project.frames.length + 1}`,
      pixels: JSON.parse(JSON.stringify(activeFrame.pixels))
    };
    setProject(prev => ({
      ...prev,
      frames: [...prev.frames, newFrame],
      animations: prev.animations.map(a =>
        a.id === selectedAnimId ? { ...a, frameIds: [...a.frameIds, newId] } : a
      )
    }));
    setSelectedFrameId(newId);
    soundSynth.playLaser();
  };

  // Export Sprite Sheet PNG
  const exportSpriteSheetPNG = () => {
    const totalFrames = project.frames.length;
    const s = project.gridWidth;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = totalFrames * s * 4; // scale up by 4
    offCanvas.height = s * 4;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return;

    project.frames.forEach((frm, fIdx) => {
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const col = frm.pixels[y][x];
          if (col) {
            offCtx.fillStyle = col;
            offCtx.fillRect((fIdx * s + x) * 4, y * 4, 4, 4);
          }
        }
      }
    });

    const link = document.createElement('a');
    link.download = `${project.name.replace(/\s+/g, '_')}_spritesheet.png`;
    link.href = offCanvas.toDataURL('image/png');
    link.click();
    soundSynth.playPowerup();
  };

  const animActiveFrameId = activeAnim?.frameIds[animCurrentFrameIndex] || selectedFrameId;
  const animFrame = project.frames.find(f => f.id === animActiveFrameId) || activeFrame;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-[#121316] text-[#e1e4ea] select-none overflow-hidden">
      {/* Left: Tools, Palette & Frame list */}
      <div className="w-full md:w-72 bg-[#161821] border-b md:border-b-0 md:border-r border-[#262937] p-4 flex flex-col shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#292e3e] mb-4">
          <div className="flex items-center gap-2">
            <Paintbrush className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">پیکسل آرت و اسپریت (Sprite)</h3>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">{project.gridWidth}x{project.gridHeight}px</span>
        </div>

        {/* Draw Tools (Pencil vs Eraser vs Onion Skin) */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <button
            onClick={() => {
              setIsEraser(false);
              soundSynth.playCoin();
            }}
            className={`py-2 px-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              !isEraser
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-[#1e212b] text-gray-400 border border-[#2c3140] hover:text-white'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>قلم</span>
          </button>
          <button
            onClick={() => {
              setIsEraser(true);
              soundSynth.playCoin();
            }}
            className={`py-2 px-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              isEraser
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-[#1e212b] text-gray-400 border border-[#2c3140] hover:text-white'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>پاک‌کن</span>
          </button>
          <button
            onClick={() => {
              setOnionSkin(!onionSkin);
              soundSynth.playCoin();
            }}
            className={`py-2 px-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              onionSkin
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'bg-[#1e212b] text-gray-500 border border-[#2c3140] hover:text-gray-300'
            }`}
            title="نمایش سایه و شبح فریم قبلی جهت انیمیشن‌سازی نرم"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>شبح فریم</span>
          </button>
        </div>

        {/* Color Palette */}
        <p className="text-gray-400 text-xs mb-1.5">پالت رنگ پیکسل:</p>
        <div className="grid grid-cols-8 gap-1.5 mb-4">
          {PALETTE.map(color => (
            <button
              key={color}
              onClick={() => {
                setActiveColor(color);
                setIsEraser(false);
                soundSynth.playCoin();
              }}
              className={`w-6 h-6 rounded-md border transition-all cursor-pointer ${
                activeColor === color && !isEraser
                  ? 'border-white scale-110 shadow-lg'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* Frames List */}
        <div className="flex-1 space-y-2 pt-3 border-t border-[#292e3e]">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-200">
            <span>فریم‌های اسپرایت ({project.frames.length}):</span>
            <button
              onClick={duplicateActiveFrame}
              className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-[11px] flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>فریم جدید</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {project.frames.map(f => {
              const isSelected = selectedFrameId === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setSelectedFrameId(f.id);
                    soundSynth.playCoin();
                  }}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-500/20 border-indigo-400 text-white'
                      : 'bg-[#1a1d26] border-[#2c3140] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span className="text-[11px] truncate w-full text-center font-medium">{f.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Export Button */}
        <div className="mt-4 pt-3 border-t border-[#292e3e]">
          <button
            onClick={exportSpriteSheetPNG}
            className="w-full py-2 rounded-lg bg-[#242735] hover:bg-[#2f3448] text-cyan-300 font-semibold text-xs border border-[#394056] flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>دانلود Sprite Sheet (PNG)</span>
          </button>
        </div>
      </div>

      {/* Center: Interactive Pixel Canvas */}
      <div className="flex-1 flex flex-col bg-[#0b0c10] items-center justify-center p-6 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={384}
          height={384}
          onMouseDown={e => {
            isMouseDownRef.current = true;
            paintPixelAt(e.clientX, e.clientY);
          }}
          onMouseMove={e => {
            if (isMouseDownRef.current) paintPixelAt(e.clientX, e.clientY);
          }}
          onMouseUp={() => (isMouseDownRef.current = false)}
          onMouseLeave={() => (isMouseDownRef.current = false)}
          onTouchStart={e => {
            isMouseDownRef.current = true;
            paintPixelAt(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchMove={e => {
            if (isMouseDownRef.current) paintPixelAt(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchEnd={() => (isMouseDownRef.current = false)}
          className="rounded-2xl shadow-2xl border-2 border-[#2b3042] cursor-crosshair object-contain max-w-[90vw] max-h-[60vh]"
        />
      </div>

      {/* Right: Live Animation Preview & Timeline */}
      <div className="w-full md:w-72 bg-[#161821] border-t md:border-t-0 md:border-l border-[#262937] p-4 flex flex-col shrink-0">
        <div className="flex items-center justify-between pb-3 border-b border-[#292e3e] mb-4">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm text-white">پیش‌نمایش انیمیشن</h3>
          </div>
          <button
            onClick={() => setIsAnimPlaying(!isAnimPlaying)}
            className="p-1.5 rounded-lg bg-[#232736] hover:bg-[#2c3144] text-amber-300"
          >
            {isAnimPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          </button>
        </div>

        {/* Live Animation Mini Canvas */}
        <div className="w-full aspect-square bg-[#0c0d12] rounded-xl border border-[#2b3042] flex items-center justify-center p-4 mb-4 relative shadow-inner">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${project.gridWidth}, 1fr)`,
              width: '180px',
              height: '180px'
            }}
          >
            {animFrame.pixels.flatMap((row, y) =>
              row.map((col, x) => (
                <div
                  key={`${y}-${x}`}
                  style={{ backgroundColor: col || 'transparent' }}
                  className="w-full h-full"
                />
              ))
            )}
          </div>
          <span className="absolute bottom-2 right-2 text-[10px] font-mono text-gray-500">
            فریم {animCurrentFrameIndex + 1}/{activeAnim.frameIds.length}
          </span>
        </div>

        {/* Animation Selector */}
        <p className="text-gray-400 text-xs mb-2">انتخاب کلیپ انیمیشن:</p>
        <div className="space-y-2 flex-1">
          {project.animations.map(anim => {
            const isSel = selectedAnimId === anim.id;
            return (
              <button
                key={anim.id}
                onClick={() => {
                  setSelectedAnimId(anim.id);
                  setAnimCurrentFrameIndex(0);
                  soundSynth.playLaser();
                }}
                className={`w-full p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  isSel
                    ? 'bg-amber-500/15 border-amber-500 text-white'
                    : 'bg-[#1b1e28] border-[#2c3140] text-gray-300 hover:text-white'
                }`}
              >
                <span>{anim.name}</span>
                <span className="text-[10px] text-amber-400 font-mono">{anim.fps} FPS</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
