/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Keyboard, Search, X, Command } from 'lucide-react';
import { shortcutManager } from '../../services/engine/shortcutManager';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutManagerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  if (!isOpen) return null;

  const shortcuts = [
    { keyCombo: 'Ctrl + Z', label: 'Undo Last Action', category: 'General' },
    { keyCombo: 'Ctrl + Y / Ctrl + Shift + Z', label: 'Redo Action', category: 'General' },
    { keyCombo: 'Ctrl + S', label: 'Save Active File', category: 'Editor' },
    { keyCombo: 'Ctrl + Enter', label: 'Execute Code / Run Game', category: 'Build & Run' },
    { keyCombo: 'Ctrl + /', label: 'Open Keyboard Shortcuts', category: 'General' },
    { keyCombo: 'Alt + 1', label: 'Switch to 2D Game Viewport', category: 'Navigation' },
    { keyCombo: 'Alt + 2', label: 'Switch to Code Editor', category: 'Navigation' },
    { keyCombo: 'Alt + 3', label: 'Switch to 3D Sandbox Studio', category: 'Navigation' },
    { keyCombo: 'Alt + 4', label: 'Switch to Terminal', category: 'Navigation' },
    { keyCombo: 'F1', label: 'Launch Onboarding Tour', category: 'General' },
    { keyCombo: 'F11', label: 'Toggle Fullscreen Canvas', category: '3D Canvas' }
  ];

  const filtered = shortcuts.filter(s => {
    const matchesCategory = activeCategory === 'All' || s.category === activeCategory;
    const matchesSearch = s.label.toLowerCase().includes(search.toLowerCase()) || s.keyCombo.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#181a24] border border-[#2b2f40] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl text-xs text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#252834]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Keyboard Shortcuts & Commands</h2>
              <p className="text-gray-400 text-[11px]">Global shortcuts for AetherForge Studio IDE</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#252834] text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Categories */}
        <div className="p-4 border-b border-[#252834] space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search shortcut command..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#101217] border border-[#2c3142] rounded-lg text-white text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {['All', 'General', 'Editor', 'Navigation', '3D Canvas', 'Build & Run'].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-full text-[11px] whitespace-nowrap cursor-pointer transition ${
                  activeCategory === cat ? 'bg-cyan-600 text-white font-medium' : 'bg-[#101217] text-gray-400 hover:bg-[#202330]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto p-4 space-y-2">
          {filtered.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between p-2.5 bg-[#101217] rounded-lg border border-[#242736]">
              <span className="text-gray-200">{s.label}</span>
              <span className="px-2.5 py-1 rounded bg-[#1e2230] border border-[#30364a] text-cyan-300 font-mono text-[11px] font-semibold">
                {s.keyCombo}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
