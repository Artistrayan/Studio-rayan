/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  soundSynth,
  SynthParams,
  SFX_PRESETS
} from '../../services/audio/synth';
import {
  Volume2,
  Play,
  Square,
  Sparkles,
  Music,
  Sliders,
  Flame,
  Bomb,
  Coins,
  Trophy,
  Skull,
  Gauge
} from 'lucide-react';

export const AudioSynthStudio: React.FC = () => {
  const [params, setParams] = useState<SynthParams>({
    waveform: 'square',
    baseFreq: 440,
    freqSlide: 0,
    attack: 0.02,
    sustain: 0.12,
    decay: 0.25,
    volume: 0.65,
    pitchJump: 0,
    pitchJumpTime: 0,
    vibratoSpeed: 0,
    vibratoDepth: 0,
    lowPassCutoff: 4500,
    echoDelay: 0,
    echoFeedback: 0
  });

  const [activePreset, setActivePreset] = useState<string>('custom');
  const [isMelodyActive, setIsMelodyActive] = useState<boolean>(false);
  const [tempo, setTempo] = useState<number>(135);

  const presetsList = [
    { id: 'laser', name: 'شلیک لیزر (Laser / Shoot)', icon: Flame, color: '#06b6d4' },
    { id: 'explosion', name: 'انفجار عمیق (Explosion)', icon: Bomb, color: '#ef4444' },
    { id: 'jump', name: 'پرش کاراکتر (Jump)', icon: Sparkles, color: '#10b981' },
    { id: 'coin', name: 'جمع‌آوری سکه (Coin Pickup)', icon: Coins, color: '#f59e0b' },
    { id: 'win', name: 'موسیقی پیروزی (Victory / Level Up)', icon: Trophy, color: '#8b5cf6' },
    { id: 'lose', name: 'باخت / پایان بازی (Game Over)', icon: Skull, color: '#ec4899' },
    { id: 'engine', name: 'غرش موتور ماشین (Engine Rev)', icon: Gauge, color: '#f97316' }
  ];

  // Apply preset parameters to editor
  const handleSelectPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    const p = SFX_PRESETS[presetKey];
    if (p) {
      setParams(prev => ({
        ...prev,
        ...p
      }));
      soundSynth.playPreset(presetKey as any);
    }
  };

  const handleTestSound = () => {
    soundSynth.playCustomSound(params);
  };

  // Chiptune melodic sequence (8-bit adventure song)
  const toggleChiptuneMelody = () => {
    if (isMelodyActive) {
      soundSynth.stopChiptuneMelody();
      setIsMelodyActive(false);
    } else {
      const melodyNotes = [
        { note: 60, duration: 0.5 }, // C4
        { note: 62, duration: 0.5 }, // D4
        { note: 64, duration: 0.5 }, // E4
        { note: 67, duration: 0.5 }, // G4
        { note: 65, duration: 0.5 }, // F4
        { note: 64, duration: 0.5 }, // E4
        { note: 62, duration: 1.0 }, // D4
        { note: 67, duration: 0.5 }, // G4
        { note: 71, duration: 0.5 }, // B4
        { note: 72, duration: 1.0 }, // C5
        { note: 67, duration: 0.5 }, // G4
        { note: 64, duration: 0.5 }  // E4
      ];
      soundSynth.playChiptuneMelody(melodyNotes, tempo);
      setIsMelodyActive(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-[#121316] text-[#e1e4ea] select-none overflow-hidden">
      {/* Left: Quick SFX Presets Generator */}
      <div className="w-full md:w-80 bg-[#171920] border-b md:border-b-0 md:border-r border-[#272b38] p-4 flex flex-col shrink-0">
        <div className="flex items-center justify-between pb-3 border-b border-[#2a2f3f] mb-4">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">تولیدکننده افکت صوتی (SFX)</h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
            ۱۰۰٪ وب‌آدیو
          </span>
        </div>

        {/* Quick Presets Buttons */}
        <p className="text-gray-400 text-xs mb-2">الگوهای آماده بازی (مشابه Bfxr / sfxr):</p>
        <div className="space-y-2 flex-1 overflow-y-auto pr-1">
          {presetsList.map(item => {
            const Icon = item.icon;
            const isSel = activePreset === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectPreset(item.id)}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  isSel
                    ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-md'
                    : 'bg-[#1e212b] border-[#2c3140] text-gray-300 hover:bg-[#252936]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}25`, color: item.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-left">{item.name}</span>
                </div>
                <Play className="w-3.5 h-3.5 text-gray-400" />
              </button>
            );
          })}
        </div>

        {/* Chiptune Background Music Generator */}
        <div className="mt-4 pt-4 border-t border-[#2a2f3f] bg-[#13151b] p-3 rounded-xl border border-[#2d3244]">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Music className="w-4 h-4" />
              <span>موزیک متن چیپ‌تون (8-Bit Tracker)</span>
            </span>
          </div>

          <div className="flex items-center justify-between mb-3 text-[11px] text-gray-400">
            <span>تمپو / سرعت (BPM): {tempo}</span>
            <input
              type="range"
              min="80"
              max="200"
              value={tempo}
              onChange={e => setTempo(Number(e.target.value))}
              className="w-24 accent-amber-400"
            />
          </div>

          <button
            onClick={toggleChiptuneMelody}
            className={`w-full py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isMelodyActive
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                : 'bg-[#252834] text-amber-300 hover:bg-[#2d3140] border border-amber-500/30'
            }`}
          >
            {isMelodyActive ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>توقف ملودی پس‌زمینه</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>پخش زنده موسیقی ۸ بیتی</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right / Center: Parametric Audio Synthesizer Controls */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-[#0d0e12]">
        <div className="flex items-center justify-between pb-4 border-b border-[#222530] mb-6">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <span>سنتزکننده و میکسر پارامتریک صدا (Synthesizer & Mixer)</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              تنظیم دقیق شکل موج، فرکانس پایه، پوشه صدا (Envelope ADSR)، لرزش Pitch و فیلترها
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const blob = soundSynth.generateWavBlob(params);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `SFX_${activePreset}_${params.waveform}.wav`;
                a.click();
                URL.revokeObjectURL(url);
                soundSynth.playCoin();
              }}
              className="px-4 py-2.5 rounded-xl bg-[#1e2230] hover:bg-[#282d40] border border-[#353b52] text-cyan-300 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all"
              title="دانلود فایل صوتی خروجی با فرمت استاندارد WAV"
            >
              <Music className="w-4 h-4 text-cyan-400" />
              <span>دانلود صوتی (WAV)</span>
            </button>

            <button
              onClick={handleTestSound}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>تست و شنیدن صدا (Play SFX)</span>
            </button>
          </div>
        </div>

        {/* Waveform Selector */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-gray-300 mb-2">شکل موج صوت (Waveform Oscillator):</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(['square', 'sawtooth', 'triangle', 'sine', 'noise'] as const).map(w => (
              <button
                key={w}
                onClick={() => {
                  setParams(prev => ({ ...prev, waveform: w }));
                  soundSynth.playCustomSound({ ...params, waveform: w });
                }}
                className={`py-2 px-3 rounded-lg text-xs font-mono font-medium border text-center transition-all cursor-pointer uppercase ${
                  params.waveform === w
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                    : 'bg-[#1c1e28] text-gray-400 border-[#2d3142] hover:text-white'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Pitch & Frequency */}
          <div className="bg-[#161822] p-4 rounded-xl border border-[#262a39] space-y-4">
            <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <span>فرکانس و لغزش زیروبم (Pitch & Frequency)</span>
            </h4>

            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>فرکانس پایه (Base Pitch):</span>
                <span className="font-mono text-cyan-400">{params.baseFreq} Hz</span>
              </div>
              <input
                type="range"
                min="40"
                max="1800"
                value={params.baseFreq}
                onChange={e => setParams(prev => ({ ...prev, baseFreq: Number(e.target.value) }))}
                className="w-full accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>لغزش فرکانس (Frequency Slide):</span>
                <span className="font-mono text-cyan-400">{params.freqSlide} Hz</span>
              </div>
              <input
                type="range"
                min="-800"
                max="800"
                value={params.freqSlide}
                onChange={e => setParams(prev => ({ ...prev, freqSlide: Number(e.target.value) }))}
                className="w-full accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>پرش نیم‌پرده (Pitch Jump / Arpeggio):</span>
                <span className="font-mono text-cyan-400">{params.pitchJump} نیم‌پرده</span>
              </div>
              <input
                type="range"
                min="-12"
                max="24"
                value={params.pitchJump}
                onChange={e => setParams(prev => ({ ...prev, pitchJump: Number(e.target.value) }))}
                className="w-full accent-cyan-400"
              />
            </div>
          </div>

          {/* Section 2: Envelope (ADSR) */}
          <div className="bg-[#161822] p-4 rounded-xl border border-[#262a39] space-y-4">
            <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>پوشه شدت صدا (Attack / Sustain / Decay)</span>
            </h4>

            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>زمان اوج (Attack Time):</span>
                <span className="font-mono text-emerald-400">{params.attack.toFixed(2)}s</span>
              </div>
              <input
                type="range"
                step="0.01"
                min="0.00"
                max="0.40"
                value={params.attack}
                onChange={e => setParams(prev => ({ ...prev, attack: Number(e.target.value) }))}
                className="w-full accent-emerald-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>پایداری صدا (Sustain Time):</span>
                <span className="font-mono text-emerald-400">{params.sustain.toFixed(2)}s</span>
              </div>
              <input
                type="range"
                step="0.01"
                min="0.01"
                max="0.80"
                value={params.sustain}
                onChange={e => setParams(prev => ({ ...prev, sustain: Number(e.target.value) }))}
                className="w-full accent-emerald-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>محو شدن (Decay Time):</span>
                <span className="font-mono text-emerald-400">{params.decay.toFixed(2)}s</span>
              </div>
              <input
                type="range"
                step="0.01"
                min="0.05"
                max="1.20"
                value={params.decay}
                onChange={e => setParams(prev => ({ ...prev, decay: Number(e.target.value) }))}
                className="w-full accent-emerald-400"
              />
            </div>
          </div>

          {/* Section 3: Filter & Effects */}
          <div className="bg-[#161822] p-4 rounded-xl border border-[#262a39] space-y-4">
            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <span>فیلتر فرکانس و اکو (Filter & Echo Delay)</span>
            </h4>

            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>فیلتر پایین‌گذر (Low-Pass Cutoff):</span>
                <span className="font-mono text-amber-400">{params.lowPassCutoff} Hz</span>
              </div>
              <input
                type="range"
                min="200"
                max="8000"
                step="50"
                value={params.lowPassCutoff}
                onChange={e => setParams(prev => ({ ...prev, lowPassCutoff: Number(e.target.value) }))}
                className="w-full accent-amber-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>تاخیر اکو (Echo Delay):</span>
                <span className="font-mono text-amber-400">{params.echoDelay.toFixed(2)}s</span>
              </div>
              <input
                type="range"
                step="0.02"
                min="0.00"
                max="0.40"
                value={params.echoDelay}
                onChange={e => setParams(prev => ({ ...prev, echoDelay: Number(e.target.value) }))}
                className="w-full accent-amber-400"
              />
            </div>
          </div>

          {/* Section 4: Volume & Vibrato */}
          <div className="bg-[#161822] p-4 rounded-xl border border-[#262a39] space-y-4">
            <h4 className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
              <span>حجم کلی و ویبراتو (Master & Vibrato)</span>
            </h4>

            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>بلندی صدا (Volume):</span>
                <span className="font-mono text-purple-400">{Math.round(params.volume * 100)}%</span>
              </div>
              <input
                type="range"
                step="0.05"
                min="0.1"
                max="1.0"
                value={params.volume}
                onChange={e => setParams(prev => ({ ...prev, volume: Number(e.target.value) }))}
                className="w-full accent-purple-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>سرعت لرزش صدا (Vibrato Speed):</span>
                <span className="font-mono text-purple-400">{params.vibratoSpeed} Hz</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                value={params.vibratoSpeed}
                onChange={e => setParams(prev => ({ ...prev, vibratoSpeed: Number(e.target.value) }))}
                className="w-full accent-purple-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
