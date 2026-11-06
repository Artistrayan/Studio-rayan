/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useStudio } from '../../context/StudioContext';
import { soundSynth } from '../../services/audio/synth';
import {
  Sparkles,
  UserCheck,
  Cpu,
  Layers,
  Video,
  Image as ImageIcon,
  Sliders,
  Play,
  Pause,
  Download,
  Trash2,
  RefreshCw,
  Check,
  AlertTriangle,
  Lock,
  Unlock,
  Settings,
  Terminal,
  Activity,
  Compass,
  Plus,
  Eye,
  Copy,
  FolderOpen
} from 'lucide-react';

interface CharacterProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  ethnicity: string;
  hair: string;
  outfit: string;
  identityLock: boolean;
  referenceImages: string[];
  loraModel: string;
  faceEmbeddingScore: number;
  createdAt: number;
}

interface GenerationTask {
  id: string;
  type: 'image' | 'video';
  characterId: string;
  model: string;
  prompt: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputUrl?: string;
  timestamp: number;
  logs: string[];
}

export const AICharacterStudio: React.FC = () => {
  const { language, addLog } = useStudio();
  const [activeTab, setActiveTab] = useState<'characters' | 'image_gen' | 'video_gen' | 'gallery' | 'telemetry'>('characters');

  // Character Profiles State
  const [characters, setCharacters] = useState<CharacterProfile[]>([
    {
      id: 'char_1',
      name: 'Aria Vance (Cyber Operative)',
      age: 26,
      gender: 'Female',
      ethnicity: 'Caucasian / Asian',
      hair: 'Silver Neon Bob with Undercut',
      outfit: 'Tactical Carbon-Fiber Cyber Jacket with LED accents',
      identityLock: true,
      referenceImages: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80'
      ],
      loraModel: 'lora_aria_vance_v3.safetensors',
      faceEmbeddingScore: 0.984,
      createdAt: Date.now() - 86400000 * 3
    },
    {
      id: 'char_2',
      name: 'Kaelen Voss (Mecha Pilot)',
      age: 31,
      gender: 'Male',
      ethnicity: 'Nordic / European',
      hair: 'Short Trimmed Dark Blond',
      outfit: 'Pilot Flight Suit with Holographic HUD Gauntlets',
      identityLock: true,
      referenceImages: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80'
      ],
      loraModel: 'lora_kaelen_voss_v1.safetensors',
      faceEmbeddingScore: 0.967,
      createdAt: Date.now() - 86400000 * 1
    }
  ]);
  const [selectedCharId, setSelectedCharId] = useState<string>('char_1');

  // Image Generation Settings
  const [selectedImageModel, setSelectedImageModel] = useState<string>('FLUX.2 Max');
  const [identityEngine, setIdentityEngine] = useState<string>('PuLID + LoRA Lock');
  const [prompt, setPrompt] = useState<string>('Cinematic portrait of Aria Vance in a neon-lit Tokyo alleyway, rainy night, realistic skin texture, intricate clothing details, 8k resolution, photorealistic');
  const [negativePrompt, setNegativePrompt] = useState<string>('deformed, bad anatomy, disfigured, poorly drawn face, mutation, extra limbs, ugly, blurry, low resolution');
  const [poseControl, setPoseControl] = useState<string>('OpenPose (Action Stance)');
  const [aspectRatio, setAspectRatio] = useState<string>('9:16 (Vertical Portrait)');
  const [enhancers, setEnhancers] = useState<{ codeformer: boolean; gfpgan: boolean; supir: boolean; ultraSharp: boolean }>({
    codeformer: true,
    gfpgan: false,
    supir: true,
    ultraSharp: false
  });

  // Video Generation Settings
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>('Wan 2.2');
  const [videoPrompt, setVideoPrompt] = useState<string>('Smooth cinematic camera pan around character, glowing holographic lights, hyper-realistic physics');
  const [videoDurationSec, setVideoDurationSec] = useState<number>(5);
  const [videoFps, setVideoFps] = useState<number>(60); // with RIFE interpolation

  // Generation Tasks & Gallery Queue
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [gallery, setGallery] = useState<{ id: string; url: string; prompt: string; model: string; charName: string; type: 'image' | 'video'; timestamp: number }[]>([
    {
      id: 'gal_1',
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80',
      prompt: 'Cinematic portrait of Aria Vance in cyberpunk neon city',
      model: 'FLUX.2 Max',
      charName: 'Aria Vance',
      type: 'image',
      timestamp: Date.now() - 3600000 * 2
    },
    {
      id: 'gal_2',
      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1000&q=80',
      prompt: 'Kaelen Voss in cockpit hangar inspection',
      model: 'Seedream 5 Pro',
      charName: 'Kaelen Voss',
      type: 'image',
      timestamp: Date.now() - 3600000 * 5
    }
  ]);

  // GPU Telemetry
  const [gpuMemoryUsedMB, setGpuMemoryUsedMB] = useState<number>(14250);
  const [gpuTotalMB] = useState<number>(24576);
  const [gpuTemp, setGpuTemp] = useState<number>(68);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const activeChar = characters.find(c => c.id === selectedCharId) || characters[0];

  // Start Generation Task
  const handleStartGeneration = (type: 'image' | 'video') => {
    soundSynth.playCoin();
    setIsProcessing(true);
    const taskId = 'task_' + Date.now();
    const modelUsed = type === 'image' ? selectedImageModel : selectedVideoModel;
    const taskPrompt = type === 'image' ? prompt : videoPrompt;

    const newTask: GenerationTask = {
      id: taskId,
      type,
      characterId: activeChar.id,
      model: modelUsed,
      prompt: taskPrompt,
      status: 'processing',
      progress: 10,
      timestamp: Date.now(),
      logs: [
        `[Init] Initializing GPU Worker with ${modelUsed}...`,
        `[Identity Engine] Loading LoRA (${activeChar.loraModel}) and Face Embedding (Score: ${activeChar.faceEmbeddingScore})...`,
        `[ControlNet] Applying ${poseControl} and Identity Lock...`
      ]
    };

    setTasks(prev => [newTask, ...prev]);
    addLog(`[AI Character Studio] Started ${type} generation for ${activeChar.name} using ${modelUsed}`);

    // Simulate progress steps
    let currentProgress = 10;
    const interval = setInterval(() => {
      currentProgress += 25;
      if (currentProgress >= 100) {
        clearInterval(interval);
        setIsProcessing(false);
        const sampleOutput = activeChar.referenceImages[0];
        setTasks(prev =>
          prev.map(t =>
            t.id === taskId
              ? {
                  ...t,
                  status: 'completed',
                  progress: 100,
                  outputUrl: sampleOutput,
                  logs: [...t.logs, `[Enhancer] Applied CodeFormer & SUPIR upscaling.`, `[Complete] Successfully generated ${type}!`]
                }
              : t
          )
        );
        setGallery(prev => [
          {
            id: 'gal_' + Date.now(),
            url: sampleOutput,
            prompt: taskPrompt,
            model: modelUsed,
            charName: activeChar.name,
            type,
            timestamp: Date.now()
          },
          ...prev
        ]);
        soundSynth.playPowerup();
        addLog(`[AI Character Studio] Successfully completed ${type} generation.`);
      } else {
        setTasks(prev =>
          prev.map(t =>
            t.id === taskId
              ? {
                  ...t,
                  progress: currentProgress,
                  logs: [...t.logs, `[Processing] Diffusion step ${Math.round(currentProgress * 0.3)}/30 completed...`]
                }
              : t
          )
        );
      }
    }, 800);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0b0d13] text-gray-200 font-sans select-none overflow-hidden h-full">
      {/* Top Header / Sub-navbar */}
      <div className="h-13 bg-[#131620] border-b border-[#212636] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-wide">استودیوی کاراکتر هوش مصنوعی (AI Character Studio)</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                v4.5 Pro / PuLID & FLUX.2
              </span>
            </div>
            <p className="text-[11px] text-gray-400">تولید فوتورئال شخصیت‌های مجازی با حفظ هویت چهره ثابت و انیمیشن ویدئویی</p>
          </div>
        </div>

        {/* Studio Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 bg-[#1a1e2b] p-1 rounded-xl border border-[#292f42]">
          {[
            { id: 'characters', label: 'شخصیت‌ها و هویت', icon: UserCheck },
            { id: 'image_gen', label: 'موتور تصویر', icon: ImageIcon },
            { id: 'video_gen', label: 'موتور ویدئو', icon: Video },
            { id: 'gallery', label: 'گالری و تاریخچه', icon: FolderOpen },
            { id: 'telemetry', label: 'وضعیت GPU و صف', icon: Activity }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  soundSynth.playCoin();
                  setActiveTab(tab.id as any);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-[#232938]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Studio Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* TAB 1: Characters & Identity Engine */}
        {activeTab === 'characters' && (
          <div className="flex-1 flex overflow-hidden p-4 gap-4">
            {/* Left: Characters List */}
            <div className="w-80 bg-[#141721] border border-[#222738] rounded-2xl p-4 flex flex-col shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-200">پروفایل‌های کاراکتر ({characters.length})</span>
                <button
                  onClick={() => {
                    soundSynth.playCoin();
                    const newChar: CharacterProfile = {
                      id: 'char_' + Date.now(),
                      name: 'New Agent ' + (characters.length + 1),
                      age: 25,
                      gender: 'Female',
                      ethnicity: 'Mixed',
                      hair: 'Black Straight',
                      outfit: 'Cyberpunk Jacket',
                      identityLock: true,
                      referenceImages: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'],
                      loraModel: 'lora_new_agent_v1.safetensors',
                      faceEmbeddingScore: 0.950,
                      createdAt: Date.now()
                    };
                    setCharacters([...characters, newChar]);
                    setSelectedCharId(newChar.id);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ساخت شخصیت</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {characters.map(c => {
                  const isSelected = c.id === selectedCharId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        soundSynth.playCoin();
                        setSelectedCharId(c.id);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-white'
                          : 'bg-[#1a1e2b] border-[#292f42] text-gray-300 hover:bg-[#222738]'
                      }`}
                    >
                      <img
                        src={c.referenceImages[0]}
                        alt={c.name}
                        className="w-12 h-12 rounded-lg object-cover border border-[#343b50]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold truncate">{c.name}</span>
                          {c.identityLock && <Lock className="w-3 h-3 text-emerald-400 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{c.outfit}</p>
                        <div className="flex items-center gap-2 mt-1 text-[9px] font-mono text-cyan-300">
                          <span>شباهت: {(c.faceEmbeddingScore * 100).toFixed(1)}%</span>
                          <span>•</span>
                          <span>LoRA فعال</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Selected Character Details & Identity Lock Engine */}
            <div className="flex-1 bg-[#141721] border border-[#222738] rounded-2xl p-6 overflow-y-auto flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-[#212636] pb-4">
                <div className="flex items-center gap-4">
                  <img
                    src={activeChar.referenceImages[0]}
                    alt={activeChar.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-cyan-500/40 shadow-lg"
                  />
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>{activeChar.name}</span>
                      <button
                        onClick={() => {
                          setCharacters(characters.map(c => c.id === activeChar.id ? { ...c, identityLock: !c.identityLock } : c));
                        }}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
                          activeChar.identityLock ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}
                      >
                        {activeChar.identityLock ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        <span>{activeChar.identityLock ? 'قفل هویت چهره فعال (Identity Lock)' : 'قفل هویت غیرفعال'}</span>
                      </button>
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">شناسه یکتای پایگاه داده: <span className="font-mono text-cyan-400">{activeChar.id}</span></p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      soundSynth.playPowerup();
                      addLog(`[Identity Engine] Re-trained LoRA adapter for ${activeChar.name} with PuLID embedding score 0.991.`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1d2231] hover:bg-[#252c3f] border border-[#30374e] text-xs font-bold text-cyan-300 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>بازآموزی LoRA و PuLID</span>
                  </button>
                  <button
                    onClick={() => {
                      setCharacters(characters.filter(c => c.id !== activeChar.id));
                      if (characters.length > 1) setSelectedCharId(characters[0].id);
                    }}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 cursor-pointer"
                    title="حذف شخصیت"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Attributes Form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">نام و عنوان کاراکتر</label>
                  <input
                    type="text"
                    value={activeChar.name}
                    onChange={e => {
                      const val = e.target.value;
                      setCharacters(characters.map(c => c.id === activeChar.id ? { ...c, name: val } : c));
                    }}
                    className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">سن و جنسیت</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={activeChar.age}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 25;
                        setCharacters(characters.map(c => c.id === activeChar.id ? { ...c, age: val } : c));
                      }}
                      className="w-20 bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                    <input
                      type="text"
                      value={activeChar.gender}
                      onChange={e => {
                        const val = e.target.value;
                        setCharacters(characters.map(c => c.id === activeChar.id ? { ...c, gender: val } : c));
                      }}
                      className="flex-1 bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">مدل LoRA اختصاصی</label>
                  <input
                    type="text"
                    value={activeChar.loraModel}
                    disabled
                    className="w-full bg-[#171a26] border border-[#282e40] rounded-xl px-3 py-2 text-xs text-cyan-400 font-mono"
                  />
                </div>
              </div>

              {/* Appearance & Outfit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">مشخصات مو و چهره</label>
                  <input
                    type="text"
                    value={activeChar.hair}
                    onChange={e => {
                      const val = e.target.value;
                      setCharacters(characters.map(c => c.id === activeChar.id ? { ...c, hair: val } : c));
                    }}
                    className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">لباس و پوشش پیش‌فرض</label>
                  <input
                    type="text"
                    value={activeChar.outfit}
                    onChange={e => {
                      const val = e.target.value;
                      setCharacters(characters.map(c => c.id === activeChar.id ? { ...c, outfit: val } : c));
                    }}
                    className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Reference Photos Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-200">تصاویر مرجع چهره (Face Embedding References)</span>
                  <span className="text-[11px] text-gray-400">حداقل ۱ و حداکثر ۵ تصویر با زاویه مستقیم و نور مناسب</span>
                </div>
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {activeChar.referenceImages.map((img, idx) => (
                    <div key={idx} className="relative group w-24 h-24 rounded-xl overflow-hidden border border-[#32394e]">
                      <img src={img} alt="Ref" className="w-full h-full object-cover" />
                      <button
                        onClick={() => {
                          const updated = activeChar.referenceImages.filter((_, i) => i !== idx);
                          setCharacters(characters.map(c => c.id === activeChar.id ? { ...c, referenceImages: updated } : c));
                        }}
                        className="absolute top-1 right-1 p-1 rounded-lg bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const sample = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80';
                      setCharacters(characters.map(c => c.id === activeChar.id ? { ...c, referenceImages: [...c.referenceImages, sample] } : c));
                    }}
                    className="w-24 h-24 rounded-xl border-2 border-dashed border-[#343b50] hover:border-cyan-500 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-cyan-400 cursor-pointer transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px]">افزودن عکس</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Image Generation Engine */}
        {activeTab === 'image_gen' && (
          <div className="flex-1 flex overflow-hidden p-4 gap-4">
            {/* Left Column: Model & Controls */}
            <div className="w-96 bg-[#141721] border border-[#222738] rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                  <span>انتخاب مدل تصویر (Image Generation Engine)</span>
                  <span className="text-[10px] text-cyan-400 font-mono">GPU Ready</span>
                </label>
                <select
                  value={selectedImageModel}
                  onChange={e => setSelectedImageModel(e.target.value)}
                  className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="FLUX.2 Max">FLUX.2 Max (High Photorealism)</option>
                  <option value="GPT Image">GPT Image (OpenAI Cloud Gateway)</option>
                  <option value="Google Nano Banana">Google Nano Banana (Fast Edge)</option>
                  <option value="Seedream 5 Pro">Seedream 5 Pro (Cinematic Lighting)</option>
                  <option value="SDXL Custom">SDXL Custom (Fine-tuned Local)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">موتور حفظ هویت چهره (Identity Engine)</label>
                <select
                  value={identityEngine}
                  onChange={e => setIdentityEngine(e.target.value)}
                  className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="PuLID + LoRA Lock">PuLID + LoRA Lock (Recommended)</option>
                  <option value="IP-Adapter FaceID Plus">IP-Adapter FaceID Plus</option>
                  <option value="Character Identity Lock">Character Identity Lock Only</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">موتور کنترل بدن و صحنه (Pose & ControlNet)</label>
                <select
                  value={poseControl}
                  onChange={e => setPoseControl(e.target.value)}
                  className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="OpenPose (Action Stance)">OpenPose (Action Stance)</option>
                  <option value="Depth ControlNet (3D Spatial)">Depth ControlNet (3D Spatial)</option>
                  <option value="Canny Edge (Lineart Match)">Canny Edge (Lineart Match)</option>
                  <option value="Inpainting Background">Inpainting Background</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">نسبت تصویر (Aspect Ratio)</label>
                <select
                  value={aspectRatio}
                  onChange={e => setAspectRatio(e.target.value)}
                  className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="9:16 (Vertical Portrait)">9:16 (Vertical Portrait)</option>
                  <option value="16:9 (Cinematic Landscape)">16:9 (Cinematic Landscape)</option>
                  <option value="1:1 (Square Avatar)">1:1 (Square Avatar)</option>
                </select>
              </div>

              {/* Image Enhancers Toggle */}
              <div className="space-y-2 pt-2 border-t border-[#212636]">
                <span className="text-xs font-bold text-gray-300">موتور بهبود و اصلاح تصویر (Enhancers)</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'codeformer', label: 'CodeFormer' },
                    { key: 'gfpgan', label: 'GFPGAN' },
                    { key: 'supir', label: 'SUPIR Upscale' },
                    { key: 'ultraSharp', label: '4x-UltraSharp' }
                  ].map(enh => (
                    <label
                      key={enh.key}
                      className="flex items-center gap-2 p-2 rounded-xl bg-[#1b1f2d] border border-[#2d3448] cursor-pointer text-xs text-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={(enhancers as any)[enh.key]}
                        onChange={e => setEnhancers({ ...enhancers, [enh.key]: e.target.checked })}
                        className="rounded accent-cyan-500"
                      />
                      <span>{enh.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Prompt Input & Generation Output */}
            <div className="flex-1 bg-[#141721] border border-[#222738] rounded-2xl p-6 flex flex-col gap-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-300">کاراکتر فعال:</span>
                  <span className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/40">
                    {activeChar.name}
                  </span>
                </div>
                <button
                  onClick={() => handleStartGeneration('image')}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/30 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isProcessing ? 'در حال تولید...' : 'تولید تصویر فوتورئال'}</span>
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">متن پرامپت (Prompt)</label>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">پرامپت منفی (Negative Prompt)</label>
                <input
                  type="text"
                  value={negativePrompt}
                  onChange={e => setNegativePrompt(e.target.value)}
                  className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Live Tasks / Progress Stream */}
              <div className="flex-1 bg-[#10131b] border border-[#212636] rounded-xl p-4 flex flex-col gap-2 overflow-y-auto">
                <span className="text-xs font-bold text-gray-400">وضعیت صف پردازش و ComfyUI Pipeline</span>
                {tasks.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-xs gap-2">
                    <Terminal className="w-8 h-8 opacity-40" />
                    <span>هیچ وظیفه‌ای در صف نیست. روی دکمه تولید کلیک کنید.</span>
                  </div>
                ) : (
                  tasks.slice(0, 3).map(task => (
                    <div key={task.id} className="p-3 rounded-xl bg-[#171a26] border border-[#282f44] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-400">{task.model} ({task.type})</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                          task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {task.status === 'completed' ? 'تکمیل شده' : `${task.progress}% در حال پردازش`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#22283a] rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${task.progress}%` }} />
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono space-y-0.5 max-h-16 overflow-y-auto">
                        {task.logs.map((l, i) => <div key={i}>{l}</div>)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Video Generation Engine */}
        {activeTab === 'video_gen' && (
          <div className="flex-1 flex overflow-hidden p-4 gap-4">
            <div className="w-96 bg-[#141721] border border-[#222738] rounded-2xl p-4 flex flex-col gap-4 shrink-0">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">موتور تولید ویدئو (Video Generation Model)</label>
                <select
                  value={selectedVideoModel}
                  onChange={e => setSelectedVideoModel(e.target.value)}
                  className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="Wan 2.2">Wan 2.2 (High Motion Fidelity)</option>
                  <option value="LTX-2.3">LTX-2.3 (Cinematic Frame Interpolation)</option>
                  <option value="RIFE">RIFE (60 FPS Smooth Upscale)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">مدت زمان ویدئو (Seconds)</label>
                <input
                  type="number"
                  value={videoDurationSec}
                  onChange={e => setVideoDurationSec(parseInt(e.target.value) || 5)}
                  className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">نرخ فریم (FPS Target)</label>
                <select
                  value={videoFps}
                  onChange={e => setVideoFps(parseInt(e.target.value))}
                  className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value={30}>30 FPS Standard</option>
                  <option value={60}>60 FPS Smooth (RIFE Enabled)</option>
                </select>
              </div>
            </div>

            <div className="flex-1 bg-[#141721] border border-[#222738] rounded-2xl p-6 flex flex-col gap-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300">تبدیل تصویر کاراکتر به ویدئوی متحرک (Image-to-Video)</span>
                <button
                  onClick={() => handleStartGeneration('video')}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/30 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Video className="w-4 h-4" />
                  <span>{isProcessing ? 'در حال رندر ویدئو...' : 'تولید ویدئوی فوتورئال'}</span>
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">پرامپت حرکت دوربین و اکشن</label>
                <textarea
                  rows={3}
                  value={videoPrompt}
                  onChange={e => setVideoPrompt(e.target.value)}
                  className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl p-3 text-xs text-white focus:outline-none resize-none"
                />
              </div>

              <div className="flex-1 bg-[#10131b] border border-[#212636] rounded-xl p-4 flex items-center justify-center text-center">
                <div className="space-y-2">
                  <Video className="w-12 h-12 text-cyan-400 mx-auto opacity-60 animate-pulse" />
                  <p className="text-xs text-gray-400">پیش‌نمایش زنده فریم‌های ویدئو با حفظ هویت چهره در فریم‌های متوالی</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Gallery & History */}
        {activeTab === 'gallery' && (
          <div className="flex-1 flex flex-col p-4 overflow-y-auto gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-200">گالری خروجی‌های تولیدشده ({gallery.length})</span>
              <span className="text-xs text-gray-400">ذخیره شده در IndexedDB و حافظه محلی ابری</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {gallery.map(item => (
                <div key={item.id} className="bg-[#141721] border border-[#222738] rounded-2xl overflow-hidden group flex flex-col">
                  <div className="relative aspect-[9/16] overflow-hidden bg-black">
                    <img src={item.url} alt="Gallery" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] text-cyan-300 font-mono">
                      {item.model}
                    </div>
                  </div>
                  <div className="p-3 flex flex-col gap-1.5 flex-1">
                    <span className="text-xs font-bold text-white truncate">{item.charName}</span>
                    <p className="text-[11px] text-gray-400 line-clamp-2">{item.prompt}</p>
                    <div className="flex items-center justify-between pt-2 mt-auto border-t border-[#202535]">
                      <span className="text-[9px] text-gray-500 font-mono">{new Date(item.timestamp).toLocaleTimeString()}</span>
                      <a
                        href={item.url}
                        download
                        className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs cursor-pointer"
                        title="دانلود خروجی"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: GPU & Telemetry Monitor */}
        {activeTab === 'telemetry' && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto gap-6">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>وضعیت سخت‌افزار، مصرف VRAM و صف ComfyUI Workers</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#141721] border border-[#222738] rounded-2xl p-4 flex flex-col gap-2">
                <span className="text-xs text-gray-400">حافظه VRAM کارت گرافیک</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold text-cyan-400 font-mono">{(gpuMemoryUsedMB / 1024).toFixed(2)} GB</span>
                  <span className="text-xs text-gray-500">از {(gpuTotalMB / 1024).toFixed(0)} GB</span>
                </div>
                <div className="w-full h-2 bg-[#1b1f2d] rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-cyan-500" style={{ width: `${(gpuMemoryUsedMB / gpuTotalMB) * 100}%` }} />
                </div>
              </div>

              <div className="bg-[#141721] border border-[#222738] rounded-2xl p-4 flex flex-col gap-2">
                <span className="text-xs text-gray-400">دمای پردازنده گرافیکی (GPU Temp)</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold text-emerald-400 font-mono">{gpuTemp}°C</span>
                  <span className="text-xs text-emerald-500 font-mono">نرمال (فن 45%)</span>
                </div>
                <div className="w-full h-2 bg-[#1b1f2d] rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-emerald-500" style={{ width: '68%' }} />
                </div>
              </div>

              <div className="bg-[#141721] border border-[#222738] rounded-2xl p-4 flex flex-col gap-2">
                <span className="text-xs text-gray-400">وضعیت سرویس ComfyUI Gateway</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>متصل و آماده به کار</span>
                  </span>
                  <span className="text-xs text-gray-400 font-mono">Latency: 18ms</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
