/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Play, CheckCircle2, Loader2, X, Terminal } from 'lucide-react';
import { CICDPipelineService, CICDPipelineStep } from '../../services/export/cicdPipeline';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CICDStatusModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [steps, setSteps] = useState<CICDPipelineStep[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleStartPipeline = async () => {
    setIsRunning(true);
    await CICDPipelineService.executePipeline((updated) => {
      setSteps(updated);
    });
    setIsRunning(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#181a24] border border-[#2b2f40] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl text-xs text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#252834]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Automated CI/CD Build & Deployment Pipeline</h2>
              <p className="text-gray-400 text-[11px]">Static typechecks, sandbox audits, unit tests, and keystore signing</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#252834] text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Start Button */}
        <div className="p-4 border-b border-[#252834]">
          <button
            onClick={handleStartPipeline}
            disabled={isRunning}
            className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-600/20"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>{isRunning ? 'Running CI/CD Pipeline Build...' : 'Execute CI/CD Build Pipeline'}</span>
          </button>
        </div>

        {/* Pipeline Log Steps */}
        <div className="p-4 max-h-72 overflow-y-auto space-y-2">
          {steps.map(step => (
            <div key={step.id} className="p-3 bg-[#101217] rounded-lg border border-[#242736] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">{step.name}</span>
                {step.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {step.status === 'running' && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />}
              </div>
              <p className="text-gray-400 font-mono text-[10px]">{step.log}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
