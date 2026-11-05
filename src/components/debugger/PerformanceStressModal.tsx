/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Cpu, Activity, Zap, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { PerformanceProfilerService, BenchmarkReport } from '../../services/engine/performanceProfiler';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PerformanceStressModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [objectCount, setObjectCount] = useState<number>(2500);
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleRunStressTest = () => {
    setIsTesting(true);
    setTimeout(() => {
      const res = PerformanceProfilerService.runLargeProjectBenchmark(objectCount);
      setReport(res);
      setIsTesting(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#181a24] border border-[#2b2f40] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl text-xs text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#252834]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Large Project Stress Benchmarker</h2>
              <p className="text-gray-400 text-[11px]">Simulates rendering 1,000 - 10,000 animated 3D meshes & draw calls</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#252834] text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 space-y-4 border-b border-[#252834]">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">3D Object Instance Density:</span>
            <span className="text-cyan-400 font-mono font-bold text-sm">{objectCount.toLocaleString()} meshes</span>
          </div>

          <input
            type="range"
            min={1000}
            max={10000}
            step={500}
            value={objectCount}
            onChange={e => setObjectCount(Number(e.target.value))}
            className="w-full accent-cyan-500"
          />

          <button
            onClick={handleRunStressTest}
            disabled={isTesting}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            <Zap className="w-4 h-4" />
            <span>{isTesting ? 'Benchmarking Matrix Transforms...' : 'Run Performance Stress Benchmark'}</span>
          </button>
        </div>

        {/* Report Results */}
        {report && (
          <div className="p-4 space-y-4 max-h-72 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-[#101217] p-2.5 rounded-lg border border-[#252834]">
                <div className="text-gray-400 text-[10px]">AVG FPS</div>
                <div className="text-lg font-bold text-cyan-400 font-mono">{report.averageFPS}</div>
              </div>

              <div className="bg-[#101217] p-2.5 rounded-lg border border-[#252834]">
                <div className="text-gray-400 text-[10px]">DRAW CALLS</div>
                <div className="text-lg font-bold text-emerald-400 font-mono">{report.drawCalls}</div>
              </div>

              <div className="bg-[#101217] p-2.5 rounded-lg border border-[#252834]">
                <div className="text-gray-400 text-[10px]">TRIANGLES</div>
                <div className="text-lg font-bold text-amber-400 font-mono">{(report.triangleCount / 1000).toFixed(0)}k</div>
              </div>

              <div className="bg-[#101217] p-2.5 rounded-lg border border-[#252834]">
                <div className="text-gray-400 text-[10px]">HEAP MEMORY</div>
                <div className="text-lg font-bold text-indigo-400 font-mono">{report.heapMemoryMB} MB</div>
              </div>
            </div>

            <div className="p-3 bg-[#101217] rounded-lg border border-[#252834] space-y-2">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Optimization Recommendations</span>
              </div>
              <ul className="space-y-1 pl-4 list-disc text-gray-300 text-[11px]">
                {report.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
