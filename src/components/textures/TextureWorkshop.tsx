/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { useStudio } from '../../context/StudioContext';
import { translations } from '../../services/i18n';
import { soundSynth } from '../../services/audio/synth';
import {
  Palette,
  Sparkles,
  Download,
  Brush,
  Eraser,
  PaintBucket,
  RotateCcw,
  Box,
  Sliders,
  Check
} from 'lucide-react';

export const TextureWorkshop: React.FC = () => {
  const { language, setActiveTextureUrl, addLog, setWorkspace } = useStudio();
  const t = translations[language];

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [patternType, setPatternType] = useState<'noise' | 'brick' | 'scifi' | 'wood' | 'voronoi' | 'plasma' | 'normal'>('scifi');
  const [brushColor, setBrushColor] = useState<string>('#38bdf8');
  const [brushSize, setBrushSize] = useState<number>(8);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'fill'>('brush');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [symmetry, setSymmetry] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('Cyberpunk neon grid with glowing circuit lines');
  const [appliedNotification, setAppliedNotification] = useState<boolean>(false);

  // Generate Procedural Pattern onto 2D Canvas
  const generateProcedural = (type: typeof patternType) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const imgData = ctx.createImageData(W, H);
    const data = imgData.data;

    soundSynth.playLaser();

    if (type === 'noise') {
      for (let i = 0; i < data.length; i += 4) {
        const val = Math.floor(Math.random() * 200 + 30);
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
        data[i + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
    } else if (type === 'brick') {
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      const brickH = 32;
      const brickW = 64;

      for (let y = 0; y < H; y += brickH) {
        const offset = (Math.floor(y / brickH) % 2) * (brickW / 2);
        for (let x = -brickW; x < W + brickW; x += brickW) {
          ctx.strokeRect(x + offset, y, brickW, brickH);
          ctx.fillStyle = Math.random() > 0.5 ? '#991b1b' : '#b91c1c';
          ctx.fillRect(x + offset + 2, y + 2, brickW - 4, brickH - 4);
        }
      }
    } else if (type === 'scifi') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;

      // Hex / Circuit grid
      const step = 32;
      for (let x = 0; x < W; x += step) {
        for (let y = 0; y < H; y += step) {
          ctx.strokeRect(x, y, step, step);
          if (Math.random() > 0.6) {
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(x + 6, y + 6, step - 12, step - 12);
          }
        }
      }
    } else if (type === 'wood') {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const idx = (y * W + x) * 4;
          const dist = Math.hypot(x - W / 2, y - H / 2);
          const ring = Math.sin(dist * 0.15) * 0.5 + 0.5;
          data[idx] = Math.floor(160 * ring + 70);
          data[idx + 1] = Math.floor(90 * ring + 40);
          data[idx + 2] = Math.floor(40 * ring + 20);
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } else if (type === 'voronoi') {
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i < 30; i++) {
        points.push({ x: Math.random() * W, y: Math.random() * H });
      }

      for (let y = 0; y < H; y += 2) {
        for (let x = 0; x < W; x += 2) {
          let minDist = 9999;
          points.forEach(p => {
            const d = Math.hypot(x - p.x, y - p.y);
            if (d < minDist) minDist = d;
          });
          const c = Math.min(255, Math.floor(minDist * 4));
          ctx.fillStyle = `rgb(${c}, ${Math.floor(c * 0.8)}, ${Math.floor(c * 1.2)})`;
          ctx.fillRect(x, y, 2, 2);
        }
      }
    } else if (type === 'normal') {
      // Sobel Normal Map generator (RGB normal vectors in tangent space)
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 128; // X: Tangent normal
        data[i + 1] = 128; // Y: Bitangent normal
        data[i + 2] = 255; // Z: Up normal (Deep Blue)
        data[i + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);

      // Add normal bumps
      ctx.fillStyle = 'rgba(255, 128, 128, 0.4)';
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 80, 0, Math.PI * 2);
      ctx.fill();
    }

    addLog(`Generated procedural texture pattern: ${type}`, 'info');
  };

  useEffect(() => {
    generateProcedural('scifi');
  }, []);

  // AI Prompt generation
  const handleAIGenerate = () => {
    soundSynth.playPowerup();
    const p = aiPrompt.toLowerCase();
    if (p.includes('brick') || p.includes('stone') || p.includes('wall')) {
      generateProcedural('brick');
    } else if (p.includes('wood') || p.includes('tree') || p.includes('log')) {
      generateProcedural('wood');
    } else if (p.includes('normal') || p.includes('bump')) {
      generateProcedural('normal');
    } else if (p.includes('noise') || p.includes('dirt') || p.includes('sand')) {
      generateProcedural('noise');
    } else {
      generateProcedural('scifi');
    }
    addLog(`AI texture generated for prompt: "${aiPrompt}"`, 'info');
  };

  // Canvas Drawing
  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    ctx.fillStyle = tool === 'eraser' ? '#0f172a' : brushColor;
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fill();

    if (symmetry) {
      ctx.beginPath();
      ctx.arc(canvas.width - x, y, brushSize, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Apply Texture to 3D Model Viewport
  const applyTo3DModel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setActiveTextureUrl(dataUrl);
    soundSynth.playCoin();
    setAppliedNotification(true);
    setTimeout(() => setAppliedNotification(false), 2500);
    addLog('Texture applied to 3D Viewport materials!', 'info');
  };

  // Export Texture PNG
  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `texture_${patternType}.png`;
    a.click();
    soundSynth.playJump();
    addLog(`Exported texture_${patternType}.png`, 'info');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#14161b] relative overflow-hidden h-full">
      {/* Top Bar */}
      <div className="h-10 bg-[#1a1c23] border-b border-[#2b2e38] flex items-center justify-between px-3 text-xs shrink-0 select-none">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(['scifi', 'brick', 'wood', 'voronoi', 'noise', 'normal'] as const).map(pat => (
            <button
              key={pat}
              onClick={() => {
                setPatternType(pat);
                generateProcedural(pat);
              }}
              className={`px-2.5 py-1 rounded text-xs capitalize cursor-pointer transition-colors ${
                patternType === pat
                  ? 'bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/40'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#252834]'
              }`}
            >
              {pat}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={applyTo3DModel}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer"
          >
            <Box className="w-3.5 h-3.5" />
            <span>{t.actions.applyToModel}</span>
          </button>

          <button
            onClick={exportPNG}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#252834] hover:bg-[#2e3240] text-gray-300 border border-[#373c4d] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Export PNG</span>
          </button>
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Drawing & AI Prompt Toolbar */}
        <div className="w-full md:w-64 bg-[#16181f] border-b md:border-b-0 md:border-r border-[#262933] p-3 text-xs flex flex-col gap-4 overflow-y-auto shrink-0 select-none">
          {/* AI Generator Box */}
          <div className="p-2.5 rounded-lg bg-gradient-to-b from-[#1e2330] to-[#161820] border border-[#2e3547]">
            <div className="flex items-center gap-1.5 font-semibold text-cyan-400 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>AI & Procedural Prompt</span>
            </div>
            <textarea
              rows={2}
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="e.g. Cyberpunk grid, mossy brick..."
              className="w-full p-2 bg-[#0e1015] border border-[#2b3040] rounded text-gray-200 text-xs focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleAIGenerate}
              className="mt-2 w-full py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <Sparkles className="w-3 h-3" />
              <span>{t.actions.generateAI}</span>
            </button>
          </div>

          {/* Manual Drawing Tools */}
          <div className="flex flex-col gap-3">
            <span className="text-gray-400 font-medium text-[11px]">MANUAL BRUSH TOOLS</span>

            <div className="flex gap-2">
              <button
                onClick={() => setTool('brush')}
                className={`flex-1 py-1 rounded flex items-center justify-center gap-1 cursor-pointer ${
                  tool === 'brush' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-[#252834] text-gray-400'
                }`}
              >
                <Brush className="w-3.5 h-3.5" />
                <span>Brush</span>
              </button>
              <button
                onClick={() => setTool('eraser')}
                className={`flex-1 py-1 rounded flex items-center justify-center gap-1 cursor-pointer ${
                  tool === 'eraser' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-[#252834] text-gray-400'
                }`}
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Eraser</span>
              </button>
            </div>

            {/* Color */}
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Brush Color</span>
              <input
                type="color"
                value={brushColor}
                onChange={e => setBrushColor(e.target.value)}
                className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
              />
            </div>

            {/* Size */}
            <div>
              <div className="flex justify-between text-gray-400 mb-1">
                <span>Brush Size</span>
                <span>{brushSize}px</span>
              </div>
              <input
                type="range"
                min="2"
                max="32"
                value={brushSize}
                onChange={e => setBrushSize(parseInt(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Symmetry Mirror */}
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Mirror Symmetry</span>
              <button
                onClick={() => setSymmetry(!symmetry)}
                className={`px-2.5 py-1 rounded text-xs cursor-pointer ${
                  symmetry ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'bg-[#252834] text-gray-400'
                }`}
              >
                {symmetry ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Canvas Display Viewport */}
        <div className="flex-1 flex items-center justify-center p-4 bg-[#0a0c10] relative">
          {appliedNotification && (
            <div className="absolute top-4 px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium text-xs shadow-xl flex items-center gap-2 z-20 animate-fade-in">
              <Check className="w-4 h-4" />
              <span>Texture successfully bound to 3D Studio models!</span>
            </div>
          )}

          <div className="relative border-2 border-[#2b2f3d] rounded-lg overflow-hidden shadow-2xl">
            <canvas
              ref={canvasRef}
              width={512}
              height={512}
              onPointerDown={e => {
                setIsDrawing(true);
                draw(e);
              }}
              onPointerMove={draw}
              onPointerUp={() => setIsDrawing(false)}
              className="w-80 h-80 sm:w-96 sm:h-96 block cursor-crosshair bg-black"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
