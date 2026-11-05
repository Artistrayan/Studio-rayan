/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Trash2, RefreshCw, Smartphone, ShieldAlert } from 'lucide-react';
import { errorTelemetry, TelemetryErrorRecord } from '../../services/engine/errorTelemetry';

export const ErrorMonitoringView: React.FC = () => {
  const [records, setRecords] = useState<TelemetryErrorRecord[]>(() => errorTelemetry.getTelemetryRecords());

  useEffect(() => {
    return errorTelemetry.subscribe(() => {
      setRecords(errorTelemetry.getTelemetryRecords());
    });
  }, []);

  const handleClear = () => {
    errorTelemetry.clearTelemetry();
  };

  const handleTriggerSimulatedError = () => {
    errorTelemetry.recordError('error', 'PhysicsEngine', 'Collision octree depth overflow on RigidBody #142', 'at PhysicsWorld.step (physics.ts:88)\nat GameLoop.tick (main.ts:12)');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#14161b] p-4 select-none h-full overflow-y-auto text-xs text-gray-200">
      <div className="max-w-4xl mx-auto w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#252834]">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>Production Error Monitoring & Telemetry Analytics</span>
            </h2>
            <p className="text-gray-400 text-xs">Captures runtime unhandled promise rejections, WebGL context loss, and script errors</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerSimulatedError}
              className="px-2.5 py-1.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 cursor-pointer"
            >
              Simulate Runtime Error
            </button>
            <button
              onClick={handleClear}
              className="p-1.5 rounded bg-[#252834] hover:bg-[#303546] text-gray-400 hover:text-white cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Telemetry Log Stream */}
        <div className="bg-[#101217] rounded-xl border border-[#252834] overflow-hidden">
          {records.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No telemetry errors recorded in current session. Application state healthy.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#202330]">
              {records.map(rec => (
                <div key={rec.id} className="p-3 hover:bg-[#151821] space-y-1 font-mono text-[11px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold uppercase text-[9px]">
                        {rec.severity}
                      </span>
                      <span className="text-cyan-400 font-semibold">{rec.sourceModule}</span>
                    </div>
                    <span className="text-gray-500 text-[10px]">{rec.timestamp}</span>
                  </div>

                  <p className="text-gray-200 font-medium">{rec.message}</p>

                  {rec.stackTrace && (
                    <pre className="p-2 bg-[#090a0d] rounded text-gray-400 text-[10px] whitespace-pre-wrap overflow-x-auto">
                      {rec.stackTrace}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
