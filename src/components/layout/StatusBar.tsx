/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useStudio } from '../../context/StudioContext';
import { gitEngine } from '../../services/git/gitEngine';
import { translations } from '../../services/i18n';
import { GitBranch, WifiOff, Activity, Code, Volume2 } from 'lucide-react';

export const StatusBar: React.FC = () => {
  const { activeFile, language, fps } = useStudio();
  const currentBranch = gitEngine.getCurrentBranch();
  const t = translations[language];

  const lineCount = activeFile?.content ? activeFile.content.split('\n').length : 0;

  return (
    <footer className="h-6 bg-[#121316] border-t border-[#23262e] text-[11px] text-gray-400 flex items-center justify-between px-3 select-none z-20 shrink-0">
      <div className="flex items-center gap-4">
        {/* Git Branch */}
        <div className="flex items-center gap-1 hover:text-cyan-400 cursor-pointer transition-colors">
          <GitBranch className="w-3 h-3 text-cyan-400" />
          <span className="font-mono text-gray-300">{currentBranch}</span>
        </div>

        {/* Offline Status Badge */}
        <div className="flex items-center gap-1 text-emerald-400">
          <WifiOff className="w-3 h-3" />
          <span className="text-[10px] hidden sm:inline">{t.labels.offlineReady}</span>
        </div>

        {/* Audio Engine Ready */}
        <div className="flex items-center gap-1 text-cyan-400">
          <Volume2 className="w-3 h-3" />
          <span className="text-[10px] hidden md:inline">WebAudio Synthesizer: 48kHz</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Active File info */}
        {activeFile && (
          <div className="flex items-center gap-1.5 font-mono text-gray-300">
            <Code className="w-3 h-3 text-amber-400" />
            <span>{activeFile.name}</span>
            <span className="text-gray-500">|</span>
            <span>{lineCount} {t.labels.lines}</span>
            <span className="text-gray-500">|</span>
            <span className="uppercase text-cyan-400">{activeFile.language}</span>
          </div>
        )}

        {/* FPS Indicator */}
        <div className="flex items-center gap-1 font-mono text-emerald-400">
          <Activity className="w-3 h-3" />
          <span>{fps} {t.labels.fps}</span>
        </div>
      </div>
    </footer>
  );
};
