/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  TileDefinition,
  TilemapLevel,
  DEFAULT_TILESET,
  createEmptyLevel
} from '../../types/tilemap';
import { soundSynth } from '../../services/audio/synth';
import {
  Grid,
  Layers,
  Shield,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Download,
  Upload,
  Play,
  RotateCcw,
  Sparkles,
  Move,
  Maximize2
} from 'lucide-react';

export const TilemapEditor: React.FC = () => {
  const [level, setLevel] = useState<TilemapLevel>(() => createEmptyLevel());
  const [selectedTileId, setSelectedTileId] = useState<number>(0);
  const [activeLayerIndex, setActiveLayerIndex] = useState<number>(1); // Ground layer
  const [isCollisionMode, setIsCollisionMode] = useState<boolean>(false);
  const [isAutoTiling, setIsAutoTiling] = useState<boolean>(true);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [testPlayMode, setTestPlayMode] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'2d' | 'iso'>('2d');

  // Test player state for previewing level collisions
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>({ x: 3, y: 11 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeLayer = level.layers[activeLayerIndex] || level.layers[0];

  // Draw tilemap onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ts = level.tileSize * zoom;
    canvas.width = level.width * ts;
    canvas.height = level.height * ts;

    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (viewMode === 'iso') {
      // 2.5D Isometric rendering
      const originX = canvas.width / 2;
      const originY = 60;
      const tileW = ts * 1.6;
      const tileH = ts * 0.8;

      level.layers.forEach((layer) => {
        if (!layer.visible) return;
        ctx.globalAlpha = layer.opacity;

        for (let y = 0; y < level.height; y++) {
          for (let x = 0; x < level.width; x++) {
            const tileId = layer.data[y][x];
            const isoX = originX + (x - y) * (tileW / 2);
            const isoY = originY + (x + y) * (tileH / 2);

            // Draw Isometric Diamond Tile
            if (tileId >= 0) {
              const tileDef = DEFAULT_TILESET.find(t => t.id === tileId);
              if (tileDef) {
                // Isometric Block Body
                ctx.fillStyle = tileDef.secondaryColor || '#1e293b';
                ctx.beginPath();
                ctx.moveTo(isoX, isoY + tileH / 2);
                ctx.lineTo(isoX, isoY + tileH / 2 + 10);
                ctx.lineTo(isoX + tileW / 2, isoY + 10);
                ctx.lineTo(isoX + tileW / 2, isoY);
                ctx.fill();

                // Isometric Top Face
                ctx.fillStyle = tileDef.color;
                ctx.beginPath();
                ctx.moveTo(isoX, isoY - tileH / 2);
                ctx.lineTo(isoX + tileW / 2, isoY);
                ctx.lineTo(isoX, isoY + tileH / 2);
                ctx.lineTo(isoX - tileW / 2, isoY);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = 'rgba(255,255,255,0.12)';
                ctx.stroke();

                if (tileDef.symbol && ts >= 18) {
                  ctx.fillStyle = '#ffffff';
                  ctx.font = `${Math.floor(ts * 0.4)}px sans-serif`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(tileDef.symbol, isoX, isoY);
                }
              }
            }
          }
        }
      });
      ctx.globalAlpha = 1.0;
      return;
    }

    // Standard 2D Orthographic rendering
    // Draw background grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x <= level.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * ts, 0);
      ctx.lineTo(x * ts, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= level.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * ts);
      ctx.lineTo(canvas.width, y * ts);
      ctx.stroke();
    }

    // Render layers
    level.layers.forEach((layer) => {
      if (!layer.visible) return;
      ctx.globalAlpha = layer.opacity;

      for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
          const tileId = layer.data[y][x];
          if (tileId >= 0) {
            const tileDef = DEFAULT_TILESET.find(t => t.id === tileId);
            if (tileDef) {
              // Draw tile background
              ctx.fillStyle = tileDef.color;
              ctx.fillRect(x * ts + 1, y * ts + 1, ts - 2, ts - 2);

              // Draw decorative bevel or secondary accent
              if (tileDef.secondaryColor) {
                ctx.fillStyle = tileDef.secondaryColor;
                ctx.fillRect(x * ts + 2, y * ts + ts - 5, ts - 4, 3);
              }

              // Draw symbol emoji/icon
              if (tileDef.symbol && ts >= 18) {
                ctx.font = `${Math.floor(ts * 0.45)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(tileDef.symbol, x * ts + ts / 2, y * ts + ts / 2);
              }
            }
          }
        }
      }
    });

    ctx.globalAlpha = 1.0;

    // Draw collision overlay if active
    if (isCollisionMode) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
          if (level.collisionMask[y][x]) {
            ctx.fillRect(x * ts, y * ts, ts, ts);
            ctx.strokeRect(x * ts + 2, y * ts + 2, ts - 4, ts - 4);
          }
        }
      }
    }

    // Draw Spawn point indicator
    const spX = level.spawnPoint.x * ts + ts / 2;
    const spY = level.spawnPoint.y * ts + ts / 2;
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(spX, spY, ts * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Test Player if active
    if (testPlayMode) {
      const px = playerPos.x * ts + ts / 2;
      const py = playerPos.y * ts + ts / 2;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(px, py, ts * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('P1', px, py);
    }
  }, [level, zoom, isCollisionMode, testPlayMode, playerPos, viewMode]);

  // Handle cell interaction (Paint tile or collision)
  const applyTileAtCoord = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / (level.tileSize * zoom));
    const y = Math.floor((clientY - rect.top) / (level.tileSize * zoom));

    if (x < 0 || x >= level.width || y < 0 || y >= level.height) return;

    if (isCollisionMode) {
      // Toggle collision mask directly
      setLevel(prev => {
        const newMask = prev.collisionMask.map(r => [...r]);
        newMask[y][x] = !newMask[y][x];
        return { ...prev, collisionMask: newMask };
      });
      soundSynth.playCoin();
    } else {
      if (activeLayer.locked) return;
      setLevel(prev => {
        const nextLayers = prev.layers.map((lay, idx) => {
          if (idx !== activeLayerIndex) return lay;
          const nextData = lay.data.map(r => [...r]);
          nextData[y][x] = selectedTileId;
          return { ...lay, data: nextData };
        });

        // Auto-assign collision if tile definition is solid
        const tileDef = DEFAULT_TILESET.find(t => t.id === selectedTileId);
        const nextMask = prev.collisionMask.map(r => [...r]);
        if (tileDef) {
          nextMask[y][x] = tileDef.solid;
        }

        return { ...prev, layers: nextLayers, collisionMask: nextMask };
      });
      soundSynth.playLaser();
    }
  };

  // Move test player
  const moveTestPlayer = (dx: number, dy: number) => {
    const nx = playerPos.x + dx;
    const ny = playerPos.y + dy;
    if (nx >= 0 && nx < level.width && ny >= 0 && ny < level.height) {
      if (!level.collisionMask[ny][nx]) {
        setPlayerPos({ x: nx, y: ny });
        soundSynth.playJump();
      } else {
        soundSynth.playExplosion();
      }
    }
  };

  // Export Level to JSON
  const exportLevelJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(level, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${level.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    soundSynth.playPowerup();
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-[#121316] text-[#e1e4ea] select-none overflow-hidden">
      {/* Left / Sidebar: Tileset Palette & Collision Toggles */}
      <div className="w-full md:w-72 bg-[#18191e] border-b md:border-b-0 md:border-r border-[#262833] flex flex-col p-3 shrink-0">
        <div className="flex items-center justify-between pb-2 border-b border-[#282b37] mb-3">
          <div className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold text-xs text-white">پالت تایل‌ها (Tileset)</h3>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">{DEFAULT_TILESET.length} تایل</span>
        </div>

        {/* Mode Selector: Tiles vs Collision Mask */}
        <div className="grid grid-cols-2 gap-1.5 mb-3 bg-[#131418] p-1 rounded-lg border border-[#2a2d3b]">
          <button
            onClick={() => {
              setIsCollisionMode(false);
              soundSynth.playCoin();
            }}
            className={`py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              !isCollisionMode
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>نقاشی تایل</span>
          </button>
          <button
            onClick={() => {
              setIsCollisionMode(true);
              soundSynth.playCoin();
            }}
            className={`py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              isCollisionMode
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>ماسک برخورد</span>
          </button>
        </div>

        {/* Tiles Grid Palette */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          <div className="grid grid-cols-2 gap-1.5">
            {DEFAULT_TILESET.map((tile) => {
              const isSelected = !isCollisionMode && selectedTileId === tile.id;
              return (
                <button
                  key={tile.id}
                  onClick={() => {
                    setSelectedTileId(tile.id);
                    setIsCollisionMode(false);
                    soundSynth.playCoin();
                  }}
                  className={`p-2 rounded-lg border flex flex-col items-center gap-1 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-sm'
                      : 'bg-[#20222b] border-[#2d3140] text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-sm shadow-inner"
                    style={{ backgroundColor: tile.color }}
                  >
                    {tile.symbol}
                  </div>
                  <span className="text-[11px] font-medium truncate w-full text-center">{tile.name}</span>
                  <span className={`text-[9px] px-1 rounded ${tile.solid ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {tile.solid ? 'مانع صلب' : 'عبور آزاد'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Layer Manager Box */}
        <div className="mt-3 pt-3 border-t border-[#262833] space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>لایه‌های مپ (Layers)</span>
            </span>
          </div>

          <div className="space-y-1">
            {level.layers.map((lay, idx) => (
              <div
                key={lay.id}
                onClick={() => setActiveLayerIndex(idx)}
                className={`p-1.5 rounded flex items-center justify-between text-xs cursor-pointer border ${
                  activeLayerIndex === idx
                    ? 'bg-[#252a38] border-cyan-500 text-white'
                    : 'bg-[#1b1d24] border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <span className="truncate">{lay.name}</span>
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setLevel(prev => ({
                        ...prev,
                        layers: prev.layers.map((l, i) => i === idx ? { ...l, visible: !l.visible } : l)
                      }));
                    }}
                    className="p-1 hover:text-white"
                  >
                    {lay.visible ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3 text-gray-500" />}
                  </button>
                  <button
                    onClick={() => {
                      setLevel(prev => ({
                        ...prev,
                        layers: prev.layers.map((l, i) => i === idx ? { ...l, locked: !l.locked } : l)
                      }));
                    }}
                    className="p-1 hover:text-white"
                  >
                    {lay.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3 text-gray-500" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Center Canvas Viewport */}
      <div className="flex-1 flex flex-col bg-[#0b0c10] overflow-hidden relative">
        {/* Top Viewport Controls */}
        <div className="h-10 bg-[#16181f] border-b border-[#262833] flex items-center justify-between px-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-200">{level.name}</span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400 font-mono text-[11px]">
              ابعاد: {level.width}x{level.height} تایل ({level.width * level.tileSize}px)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-[#1f222b] px-2 py-0.5 rounded border border-[#2e3240]">
              <span className="text-[10px] text-gray-400">بزرگنمایی:</span>
              <button onClick={() => setZoom(z => Math.max(0.6, z - 0.2))} className="px-1 text-gray-300 hover:text-white font-bold">-</button>
              <span className="font-mono text-[11px] text-cyan-400">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(2.0, z + 0.2))} className="px-1 text-gray-300 hover:text-white font-bold">+</button>
            </div>

            {/* 2D vs 2.5D Isometric View Switcher */}
            <div className="flex items-center gap-1 bg-[#1f222b] p-0.5 rounded border border-[#2e3240]">
              <button
                onClick={() => setViewMode('2d')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  viewMode === '2d' ? 'bg-cyan-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
              >
                2D ارتشی
              </button>
              <button
                onClick={() => setViewMode('iso')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  viewMode === 'iso' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
                title="مشاهده نقشه به صورت ایزومتریک ۲.۵ بعدی (Isometric 2.5D)"
              >
                2.5D ایزومتریک
              </button>
            </div>

            {/* Test Play Toggle */}
            <button
              onClick={() => {
                setTestPlayMode(!testPlayMode);
                soundSynth.playWin();
              }}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                testPlayMode
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/50'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{testPlayMode ? 'تست برخورد فعال (P1)' : 'تست فیزیک مرحله'}</span>
            </button>

            {/* Export JSON */}
            <button
              onClick={exportLevelJSON}
              className="px-2.5 py-1 rounded bg-[#222530] hover:bg-[#2b2f3e] border border-[#33384a] text-gray-300 flex items-center gap-1.5"
              title="خروجی فایل مرحله به JSON"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>دانلود JSON</span>
            </button>
          </div>
        </div>

        {/* Scrollable Canvas Container */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-6 relative">
          <canvas
            ref={canvasRef}
            onMouseDown={(e) => {
              setIsDrawing(true);
              applyTileAtCoord(e.clientX, e.clientY);
            }}
            onMouseMove={(e) => {
              if (isDrawing) applyTileAtCoord(e.clientX, e.clientY);
            }}
            onMouseUp={() => setIsDrawing(false)}
            onMouseLeave={() => setIsDrawing(false)}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              applyTileAtCoord(touch.clientX, touch.clientY);
            }}
            className="rounded-lg shadow-2xl border border-[#2b2f3f] cursor-crosshair max-w-full"
          />

          {/* Test player directional virtual pad when testPlayMode is on */}
          {testPlayMode && (
            <div className="absolute bottom-6 right-6 bg-[#161820]/90 backdrop-blur p-3 rounded-2xl border border-[#323646] shadow-2xl flex flex-col items-center gap-2 z-20">
              <span className="text-[10px] text-cyan-400 font-bold">تست حرکت فیزیک</span>
              <button
                onClick={() => moveTestPlayer(0, -1)}
                className="w-10 h-10 rounded-lg bg-[#272b3a] hover:bg-cyan-600 text-white font-bold flex items-center justify-center"
              >
                ▲
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => moveTestPlayer(-1, 0)}
                  className="w-10 h-10 rounded-lg bg-[#272b3a] hover:bg-cyan-600 text-white font-bold flex items-center justify-center"
                >
                  ◀
                </button>
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center font-mono text-cyan-300 text-xs font-bold">
                  P1
                </div>
                <button
                  onClick={() => moveTestPlayer(1, 0)}
                  className="w-10 h-10 rounded-lg bg-[#272b3a] hover:bg-cyan-600 text-white font-bold flex items-center justify-center"
                >
                  ▶
                </button>
              </div>
              <button
                onClick={() => moveTestPlayer(0, 1)}
                className="w-10 h-10 rounded-lg bg-[#272b3a] hover:bg-cyan-600 text-white font-bold flex items-center justify-center"
              >
                ▼
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
