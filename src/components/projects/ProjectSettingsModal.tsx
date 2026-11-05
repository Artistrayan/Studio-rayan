/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sliders, Settings, Check, X, Shield, Globe } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { language, setLanguage, fps, setFps, addLog } = useStudio();
  const [targetResolution, setTargetResolution] = useState<string>('1920x1080');
  const [gravityY, setGravityY] = useState<number>(-9.81);
  const [shadowQuality, setShadowQuality] = useState<string>('high');
  const [scriptLang, setScriptLang] = useState<string>('typescript');

  if (!isOpen) return null;

  const handleSave = () => {
    addLog(`Project settings saved: Resolution=${targetResolution}, Gravity=${gravityY}, Shadows=${shadowQuality}`, 'info');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#181a24] border border-[#2b2f40] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-xs text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#252834]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Project & Environment Settings</h2>
              <p className="text-gray-400 text-[11px]">Global graphics, physics, and workspace configuration</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#252834] text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-gray-300">Target Frame Rate Cap</label>
            <select
              value={fps}
              onChange={e => setFps(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#101217] border border-[#2c3142] rounded-lg text-white"
            >
              <option value={30}>30 FPS (Mobile Battery Saver)</option>
              <option value={60}>60 FPS (Standard Desktop/Web)</option>
              <option value={120}>120 FPS (High Refresh Rate)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-gray-300">UI Language / زبان محیط کار</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as any)}
              className="w-full px-3 py-2 bg-[#101217] border border-[#2c3142] rounded-lg text-white"
            >
              <option value="fa">فارسی (Persian - Default)</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-gray-300">Target Canvas Resolution</label>
            <select
              value={targetResolution}
              onChange={e => setTargetResolution(e.target.value)}
              className="w-full px-3 py-2 bg-[#101217] border border-[#2c3142] rounded-lg text-white"
            >
              <option value="1280x720">720p HD (1280x720)</option>
              <option value="1920x1080">1080p Full HD (1920x1080)</option>
              <option value="2560x1440">1440p Quad HD (2560x1440)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-gray-300">Physics Engine Gravity (m/s²)</label>
            <input
              type="number"
              step="0.1"
              value={gravityY}
              onChange={e => setGravityY(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#101217] border border-[#2c3142] rounded-lg text-white font-mono"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full mt-2 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-600/20"
          >
            <Check className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
