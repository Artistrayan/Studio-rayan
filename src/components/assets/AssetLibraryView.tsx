/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import { soundSynth } from '../../services/audio/synth';
import { translations } from '../../services/i18n';
import {
  FolderOpen,
  Box,
  Palette,
  Volume2,
  Sparkles,
  Play,
  Plus,
  Upload,
  Check,
  Code
} from 'lucide-react';

interface AssetEntry {
  id: string;
  name: string;
  category: 'models' | 'textures' | 'audio' | 'particles';
  description: string;
  badge: string;
  actionType: string;
}

export const AssetLibraryView: React.FC = () => {
  const { language, addLog, setWorkspace, createNewFile } = useStudio();
  const t = translations[language];

  const [activeCategory, setActiveCategory] = useState<'all' | 'models' | 'textures' | 'audio' | 'particles'>('all');
  const [activeSoundPlaying, setActiveSoundPlaying] = useState<string | null>(null);

  const assets: AssetEntry[] = [
    // Audio FX
    { id: 'snd_jump', name: '8-Bit Jump Sweep', category: 'audio', description: 'Upward frequency sweep triangle wave for character jumps', badge: 'WAV 48kHz', actionType: 'play_jump' },
    { id: 'snd_laser', name: 'Plasma Laser Shoot', category: 'audio', description: 'Sawtooth oscillator downward pitch drop with instant decay', badge: 'WAV 48kHz', actionType: 'play_laser' },
    { id: 'snd_coin', name: 'Golden Coin Chime', category: 'audio', description: 'Dual-sine harmonic chime at B5 and E6', badge: 'WAV 48kHz', actionType: 'play_coin' },
    { id: 'snd_expl', name: 'Sub-Bass Explosion', category: 'audio', description: 'Procedural white-noise with resonant low-pass filter decay', badge: 'WAV 48kHz', actionType: 'play_explosion' },
    { id: 'snd_power', name: 'Major Chord Powerup', category: 'audio', description: 'Arpeggiated 5-note melodic chord progression', badge: 'WAV 48kHz', actionType: 'play_powerup' },
    { id: 'snd_hit', name: 'Impact / Damage Hit', category: 'audio', description: 'Square wave crunch with sharp low-frequency drop', badge: 'WAV 48kHz', actionType: 'play_hit' },
    { id: 'snd_synth', name: 'Sci-Fi Synth Sequence', category: 'audio', description: '6-step ambient synthesizer bass sequence', badge: 'WAV 48kHz', actionType: 'play_synth' },

    // 3D Models
    { id: 'mod_mech', name: 'Sentinel Mech Robot', category: 'models', description: 'Multi-part articulated robot with torso, head visor, and limbs', badge: 'Procedural Group', actionType: 'use_model_mech' },
    { id: 'mod_terrain', name: 'Fractal Heightmap Terrain', category: 'models', description: 'Procedural plane geometry with sinusoidal elevation vertex displacement', badge: 'BufferGeometry', actionType: 'use_model_terrain' },
    { id: 'mod_cube', name: 'Tessellated Sculpt Box', category: 'models', description: 'Subdivided 24x24x24 box optimized for real-time vertex deformation', badge: 'High-Poly Mesh', actionType: 'use_model_cube' },

    // Textures
    { id: 'tex_scifi', name: 'Cyber Circuit Grid', category: 'textures', description: 'High-contrast cyan tech grid with glowing node blocks', badge: '512x512 PBR', actionType: 'open_textures' },
    { id: 'tex_brick', name: 'Mortar Brick Wall', category: 'textures', description: 'Procedural stone brick texture with randomized masonry shading', badge: '512x512 PBR', actionType: 'open_textures' },
    { id: 'tex_wood', name: 'Hardwood Rings', category: 'textures', description: 'Radial concentric annual tree rings with warm organic tones', badge: '512x512 PBR', actionType: 'open_textures' },
    { id: 'tex_norm', name: 'Sobel Normal Map', category: 'textures', description: 'RGB normal vectors in tangent space for real-time lighting bumps', badge: 'Tangent Normal', actionType: 'open_textures' },

    // Particles
    { id: 'par_sparks', name: 'Golden Coin Sparkles', category: 'particles', description: 'Radial velocity burst with yellow-gold glow and exponential fade', badge: 'GPU Emitter', actionType: 'insert_code' },
    { id: 'par_smoke', name: 'Jump Smoke Puff', category: 'particles', description: 'Low-gravity expanding dust particles with velocity damping', badge: 'Physics Emitter', actionType: 'insert_code' }
  ];

  const filteredAssets = activeCategory === 'all' ? assets : assets.filter(a => a.category === activeCategory);

  const handleAssetAction = (asset: AssetEntry) => {
    if (asset.actionType === 'play_jump') {
      soundSynth.playJump();
    } else if (asset.actionType === 'play_laser') {
      soundSynth.playLaser();
    } else if (asset.actionType === 'play_coin') {
      soundSynth.playCoin();
    } else if (asset.actionType === 'play_explosion') {
      soundSynth.playExplosion();
    } else if (asset.actionType === 'play_powerup') {
      soundSynth.playPowerup();
    } else if (asset.actionType === 'play_hit') {
      soundSynth.playHit();
    } else if (asset.actionType === 'play_synth') {
      soundSynth.playSynthSequence();
    } else if (asset.actionType.startsWith('use_model')) {
      setWorkspace('3d_studio');
      soundSynth.playLaser();
    } else if (asset.actionType === 'open_textures') {
      setWorkspace('textures');
      soundSynth.playLaser();
    }

    addLog(`Asset activated: ${asset.name}`, 'info');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#14161b] relative overflow-hidden h-full">
      {/* Top Bar Category Switcher */}
      <div className="h-10 bg-[#1a1c23] border-b border-[#2b2e38] flex items-center justify-between px-3 text-xs shrink-0 select-none">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(['all', 'models', 'textures', 'audio', 'particles'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded capitalize cursor-pointer transition-colors ${
                activeCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/40'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#252834]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#252834] hover:bg-[#2e3240] text-gray-300 border border-[#373c4d] cursor-pointer text-xs">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import Asset</span>
            <input
              type="file"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  soundSynth.playCoin();
                  addLog(`Imported custom asset: ${file.name}`, 'info');
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Asset Cards Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAssets.map(asset => (
            <div
              key={asset.id}
              className="bg-[#181a24] p-3.5 rounded-xl border border-[#272b3a] hover:border-cyan-500/40 transition-all flex flex-col justify-between shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    {asset.category === 'audio' && <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />}
                    {asset.category === 'models' && <Box className="w-4 h-4 text-indigo-400 shrink-0" />}
                    {asset.category === 'textures' && <Palette className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {asset.category === 'particles' && <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />}
                    <span className="font-semibold text-gray-200 text-xs truncate">{asset.name}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#232736] text-gray-300 shrink-0">
                    {asset.badge}
                  </span>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed mb-3">{asset.description}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#232736]">
                <button
                  onClick={() => handleAssetAction(asset)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#262b3a] hover:bg-cyan-600 hover:text-white text-cyan-400 text-xs font-medium cursor-pointer transition-all"
                >
                  {asset.category === 'audio' ? <Play className="w-3.5 h-3.5 fill-current" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{asset.category === 'audio' ? 'Play Sample' : 'Select Asset'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
