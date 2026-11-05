/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useStudio } from '../../context/StudioContext';
import { soundSynth } from '../../services/audio/synth';
import {
  Activity,
  Cpu,
  Zap,
  Gauge,
  Layers,
  RotateCcw,
  Bug,
  Eye,
  Terminal,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const PerformanceProfiler: React.FC = () => {
  const { fps, consoleLogs } = useStudio();
  const [ramUsage, setRamUsage] = useState<number>(42);
  const [drawCalls, setDrawCalls] = useState<number>(14);
  const [frameTimeMs, setFrameTimeMs] = useState<number>(16.4);
  const [watchVariables, setWatchVariables] = useState<{ name: string; val: string }[]>([
    { name: 'player.velocity.x', val: '0.00' },
    { name: 'player.isGrounded', val: 'true' },
    { name: 'physics.gravity', val: '9.81' },
    { name: 'activeParticles.count', val: '128' },
    { name: 'tilemap.loadedChunks', val: '4' }
  ]);
  const [fpsHistory, setFpsHistory] = useState<number[]>([58, 60, 59, 60, 60, 57, 60, 59, 60, 60, 61, 60]);

  // Real-time metric ticker
  useEffect(() => {
    const timer = setInterval(() => {
      // Simulate slight realistic fluctuation
      const curFps = Math.max(30, Math.min(62, fps + Math.floor((Math.random() - 0.45) * 3)));
      setFpsHistory(prev => [...prev.slice(-24), curFps]);
      setFrameTimeMs(Number((1000 / curFps).toFixed(1)));
      setRamUsage(Number((38 + Math.random() * 6).toFixed(1)));
      setDrawCalls(Math.floor(12 + Math.random() * 5));
    }, 600);

    return () => clearInterval(timer);
  }, [fps]);

  return (
    <div className="flex-1 flex flex-col bg-[#121316] text-[#e1e4ea] select-none overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#262937]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <span>دیباگر تعاملی و مانیتورینگ عملکرد (Interactive Profiler)</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              پایش بلادرنگ نرخ فریم (FPS)، مصرف حافظه (RAM)، فراخوانی‌های ترسیم (Draw Calls) و ناظر متغیرهای بازی
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
            وضعیت: بهینه (Optimal 60FPS)
          </span>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1: FPS */}
          <div className="p-4 rounded-2xl bg-[#161821] border border-[#272a38] flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span>نرخ فریم (Framerate)</span>
              <Gauge className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white font-mono">{fpsHistory[fpsHistory.length - 1] || 60}</span>
              <span className="text-xs text-emerald-400 font-bold">FPS</span>
            </div>
            {/* Mini sparkline */}
            <div className="h-6 flex items-end gap-1 mt-3 pt-1 border-t border-[#262938]">
              {fpsHistory.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 bg-emerald-500/70 rounded-t"
                  style={{ height: `${(v / 65) * 100}%` }}
                />
              ))}
            </div>
          </div>

          {/* Metric 2: Frame Time */}
          <div className="p-4 rounded-2xl bg-[#161821] border border-[#272a38] flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span>زمان رندر هر فریم (Frame Time)</span>
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white font-mono">{frameTimeMs}</span>
              <span className="text-xs text-cyan-400 font-bold">ms</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-3 pt-1 border-t border-[#262938]">
              هدف: ۱۶.۶ میلی‌ثانیه برای ۶۰ فریم بر ثانیه
            </p>
          </div>

          {/* Metric 3: RAM Memory */}
          <div className="p-4 rounded-2xl bg-[#161821] border border-[#272a38] flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span>مصرف حافظه رم (Heap Memory)</span>
              <Cpu className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white font-mono">{ramUsage}</span>
              <span className="text-xs text-amber-400 font-bold">MB</span>
            </div>
            <div className="w-full bg-[#232635] h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-amber-400 h-full rounded-full" style={{ width: `${(ramUsage / 120) * 100}%` }} />
            </div>
          </div>

          {/* Metric 4: Draw Calls */}
          <div className="p-4 rounded-2xl bg-[#161821] border border-[#272a38] flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span>فراخوانی‌های ترسیم (Draw Calls)</span>
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white font-mono">{drawCalls}</span>
              <span className="text-xs text-purple-400 font-bold">Calls</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-3 pt-1 border-t border-[#262938]">
              Batching بهینه با حداقل فراخوانی GPU
            </p>
          </div>
        </div>

        {/* Real-time Frame Drop Spikes Timeline Graph */}
        <div className="bg-[#161821] p-4 rounded-2xl border border-[#272a38] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#252837]">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>نمودار جریان فریم‌ها و ردیابی افت ناگهانی (Frame Drop Spike Detector)</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> &gt; 55 FPS (عالی)
              </span>
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> 40 - 55 FPS (متوسط)
              </span>
              <span className="text-rose-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> &lt; 40 FPS (افت فریم / Spike)
              </span>
            </div>
          </div>

          <div className="h-28 flex items-end gap-1.5 pt-3 bg-[#11131a] p-3 rounded-xl border border-[#232635]">
            {fpsHistory.map((val, idx) => {
              const heightPct = Math.max(10, Math.min(100, (val / 65) * 100));
              const isSpike = val < 45;
              const barColor = val >= 55 ? 'bg-emerald-500' : val >= 42 ? 'bg-amber-500' : 'bg-rose-500';
              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  <div
                    className={`w-full rounded-t transition-all ${barColor} ${isSpike ? 'animate-pulse' : ''}`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <div className="absolute -top-7 hidden group-hover:flex bg-[#1d202d] border border-[#30364a] text-[10px] text-white px-1.5 py-0.5 rounded font-mono shadow-lg z-20">
                    {val}FPS
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Watch Variables & Live Variable Watcher */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Watch Table */}
          <div className="bg-[#161821] p-4 rounded-2xl border border-[#262937]">
            <div className="flex items-center justify-between pb-3 border-b border-[#252837] mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>ناظر متغیرهای زنده (Watch Variables)</span>
              </div>
            </div>

            <div className="space-y-2">
              {watchVariables.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#12141c] border border-[#242735] text-xs font-mono"
                >
                  <span className="text-gray-300">{v.name}</span>
                  <span className="text-cyan-400 font-bold">{v.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Engine Logs */}
          <div className="bg-[#161821] p-4 rounded-2xl border border-[#262937] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#252837] mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>رویدادها و لاگ‌های موتور بازی (Engine Events)</span>
              </div>
            </div>

            <div className="flex-1 space-y-1.5 overflow-y-auto max-h-56 pr-1 font-mono text-[11px]">
              {consoleLogs.slice(-6).map((log, i) => (
                <div key={i} className="p-2 rounded-lg bg-[#12141c] border border-[#242735] flex items-start gap-2">
                  <span className="text-gray-500 text-[10px]">{log.time}</span>
                  <span className={log.type === 'warn' ? 'text-amber-400' : log.type === 'error' ? 'text-rose-400' : 'text-emerald-300'}>
                    {log.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
