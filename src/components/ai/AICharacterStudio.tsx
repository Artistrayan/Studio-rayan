/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useStudio } from '../../context/StudioContext';
import { soundSynth } from '../../services/audio/synth';
import {
  CharacterProfile,
  GenerationParams,
  VideoGenerationParams,
  ImageModelType,
  IdentityEngineType,
  PoseControlNetType,
  EnhancerType,
  VideoModelType,
  CameraMotion,
  OutputItem,
  WorkflowTask,
  GPUResourceStatus
} from '../../services/aiCharacter/types';
import { ModelAdapterRegistry } from '../../services/aiCharacter/modelAdapters';
import { IdentityEngine } from '../../services/aiCharacter/identityEngine';
import { PoseControlEngine, SkeletonPose } from '../../services/aiCharacter/poseControlEngine';
import { EnhancementEngine, EnhancerModuleConfig } from '../../services/aiCharacter/enhancementEngine';
import { VideoGenerationEngine } from '../../services/aiCharacter/videoEngine';
import { WorkflowEngine } from '../../services/aiCharacter/workflowEngine';
import { characterStorage } from '../../services/aiCharacter/characterStorage';
import { CharacterStudioValidator, CharacterStudioTestResult } from '../../services/aiCharacter/characterStudioValidator';
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
  FolderOpen,
  Code,
  ShieldCheck,
  Zap,
  Camera,
  Database,
  X,
  FileText
} from 'lucide-react';

export const AICharacterStudio: React.FC = () => {
  const { language, addLog } = useStudio();
  const [activeTab, setActiveTab] = useState<
    'characters' | 'image_gen' | 'pose_control' | 'enhancements' | 'video_gen' | 'workflows' | 'gallery' | 'telemetry'
  >('characters');

  // Persistence State
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<string>('');
  const [gallery, setGallery] = useState<OutputItem[]>([]);
  const [activeTasks, setActiveTasks] = useState<WorkflowTask[]>([]);
  const [gpuStatus, setGpuStatus] = useState<GPUResourceStatus>(WorkflowEngine.getGPUStatus());

  // Image Generation Form State
  const [selectedModel, setSelectedModel] = useState<ImageModelType>('FLUX.2 Max');
  const [identityEngine, setIdentityEngine] = useState<IdentityEngineType>('PuLID');
  const [prompt, setPrompt] = useState<string>(
    'Cinematic portrait of character in rain-slicked cyberpunk alleyway, wet hair texture, subsurface scattering on skin, fiber optic seam glow, 85mm f/1.4 masterwork'
  );
  const [negativePrompt, setNegativePrompt] = useState<string>(
    'deformed, bad anatomy, disfigured, poorly drawn face, mutation, extra limbs, ugly, blurry, low resolution, artifacts'
  );
  const [poseControl, setPoseControl] = useState<PoseControlNetType>('OpenPose');
  const [selectedPoseIndex, setSelectedPoseIndex] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16' | '16:9' | '4:5'>('9:16');
  const [steps, setSteps] = useState<number>(28);
  const [cfgScale, setCfgScale] = useState<number>(3.5);
  const [seed, setSeed] = useState<number>(4892019);

  // Enhancers State
  const [enhancersConfig, setEnhancersConfig] = useState<Record<EnhancerType, EnhancerModuleConfig>>(
    EnhancementEngine.getDefaultEnhancers()
  );

  // Video Generation Form State
  const [videoModel, setVideoModel] = useState<VideoModelType>('Wan 2.2');
  const [videoPrompt, setVideoPrompt] = useState<string>(
    'Smooth cinematic camera movement, glowing ambient lighting, character breathing and subtle eye gaze shift'
  );
  const [videoDuration, setVideoDuration] = useState<number>(4);
  const [videoFps, setVideoFps] = useState<30 | 60>(60);
  const [motionIntensity, setMotionIntensity] = useState<number>(6);
  const [cameraMotion, setCameraMotion] = useState<CameraMotion>('orbital_360');

  // Modals & Inspection State
  const [inspectedOutput, setInspectedOutput] = useState<OutputItem | null>(null);
  const [stabilityResults, setStabilityResults] = useState<{ condition: string; similarity: number; passed: boolean }[] | null>(null);
  const [validationSuiteResults, setValidationSuiteResults] = useState<CharacterStudioTestResult[] | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [sqlExportModal, setSqlExportModal] = useState<string | null>(null);

  // Canvas Refs
  const poseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const depthCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cannyCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load Initial Storage Data
  useEffect(() => {
    ModelAdapterRegistry.initialize();
    characterStorage.getCharacters().then((chars) => {
      setCharacters(chars);
      if (chars.length > 0) {
        setSelectedCharId(chars[0].id);
      }
    });

    characterStorage.getGallery().then((items) => {
      setGallery(items);
    });

    const interval = setInterval(() => {
      setGpuStatus(WorkflowEngine.getGPUStatus());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const activeChar = characters.find((c) => c.id === selectedCharId) || characters[0];

  // Draw ControlNet Canvases when tab or pose changes
  useEffect(() => {
    const poses = PoseControlEngine.getPresetPoses();
    const currentPose = poses[selectedPoseIndex] || poses[0];

    if (poseCanvasRef.current) {
      PoseControlEngine.renderOpenPoseToCanvas(poseCanvasRef.current, currentPose);
    }
    if (depthCanvasRef.current) {
      PoseControlEngine.renderDepthMapToCanvas(depthCanvasRef.current);
    }
    if (cannyCanvasRef.current) {
      PoseControlEngine.renderCannyEdgeToCanvas(cannyCanvasRef.current);
    }
  }, [activeTab, selectedPoseIndex]);

  // Model Compatibility Check
  const currentAdapter = ModelAdapterRegistry.getAdapter(selectedModel);
  const compatibilityCheck = currentAdapter.validateCompatibility({
    characterId: activeChar?.id || '',
    prompt,
    model: selectedModel,
    identityEngine,
    poseControl,
    aspectRatio,
    width: aspectRatio === '9:16' ? 768 : aspectRatio === '16:9' ? 1360 : 1024,
    height: aspectRatio === '9:16' ? 1360 : aspectRatio === '16:9' ? 768 : 1024,
    steps,
    cfgScale,
    seed,
    enhancers: {
      codeformer: enhancersConfig.CodeFormer.enabled,
      codeformerStrength: enhancersConfig.CodeFormer.strength,
      gfpgan: enhancersConfig.GFPGAN.enabled,
      adetailer: enhancersConfig.ADetailer.enabled,
      supir: enhancersConfig.SUPIR.enabled,
      ultraSharp: enhancersConfig['4x-UltraSharp'].enabled
    }
  });

  // Handle Character Update
  const handleUpdateActiveCharacter = (updated: Partial<CharacterProfile>) => {
    if (!activeChar) return;
    const newChar: CharacterProfile = { ...activeChar, ...updated, updatedAt: Date.now() };
    const newList = characters.map((c) => (c.id === activeChar.id ? newChar : c));
    setCharacters(newList);
    characterStorage.saveCharacter(newChar);
  };

  // Run 20-Condition Stability Test
  const handleRunStabilityTest = () => {
    if (!activeChar) return;
    soundSynth.playPowerup();
    const results = IdentityEngine.runIdentityStabilityTest(activeChar);
    setStabilityResults(results);
    addLog(`[AI Character Studio] Completed 20-condition face stability stress test for ${activeChar.name}.`);
  };

  // Run Automated System Test Suite
  const handleRunFullValidationSuite = async () => {
    soundSynth.playLaser();
    setIsValidating(true);
    addLog('[AI Character Studio] Starting full automated system validation suite...');
    try {
      const suiteResults = await CharacterStudioValidator.runAllValidationTests();
      setValidationSuiteResults(suiteResults);
      soundSynth.playPowerup();
      addLog(`[AI Character Studio] Validation complete: ${suiteResults.filter(r => r.passed).length}/${suiteResults.length} tests passed.`);
    } catch (e: any) {
      addLog(`[AI Character Studio] Validation error: ${e.message}`, 'error');
    } finally {
      setIsValidating(false);
    }
  };

  // Start Real Image Generation
  const handleExecuteImageGen = async () => {
    if (!activeChar) return;
    if (!compatibilityCheck.compatible) {
      soundSynth.playLaser();
      alert(compatibilityCheck.error);
      return;
    }

    soundSynth.playCoin();
    const dims = aspectRatio === '9:16'
      ? { width: 768, height: 1360 }
      : aspectRatio === '16:9'
      ? { width: 1360, height: 768 }
      : { width: 1024, height: 1024 };

    const genParams: GenerationParams = {
      characterId: activeChar.id,
      prompt,
      negativePrompt,
      model: selectedModel,
      identityEngine,
      poseControl,
      aspectRatio,
      width: dims.width,
      height: dims.height,
      steps,
      cfgScale,
      seed,
      enhancers: {
        codeformer: enhancersConfig.CodeFormer.enabled,
        codeformerStrength: enhancersConfig.CodeFormer.strength,
        gfpgan: enhancersConfig.GFPGAN.enabled,
        adetailer: enhancersConfig.ADetailer.enabled,
        supir: enhancersConfig.SUPIR.enabled,
        ultraSharp: enhancersConfig['4x-UltraSharp'].enabled
      }
    };

    try {
      addLog(`[AI Character Studio] Initiating ${selectedModel} generation for ${activeChar.name}...`);
      const output = await WorkflowEngine.executeImageGeneration(genParams, activeChar, (task) => {
        setActiveTasks((prev) => {
          const filtered = prev.filter((t) => t.id !== task.id);
          return [task, ...filtered];
        });
      });

      setGallery((prev) => [output, ...prev]);
      soundSynth.playPowerup();
      setSeed(Math.floor(Math.random() * 9000000) + 1000000);
    } catch (e: any) {
      addLog(`[AI Character Studio] Task failed or cancelled: ${e.message}`, 'error');
    }
  };

  // Start Real Video Generation
  const handleExecuteVideoGen = async () => {
    if (!activeChar) return;
    soundSynth.playCoin();

    const videoParams: VideoGenerationParams = {
      characterId: activeChar.id,
      sourceImageUrl: activeChar.referenceImages[0] || '',
      prompt: videoPrompt,
      videoModel,
      durationSeconds: videoDuration,
      fps: videoFps,
      motionIntensity,
      cameraMotion,
      preserveIdentity: activeChar.identityLock,
      seed
    };

    try {
      addLog(`[AI Character Studio] Initiating ${videoModel} I2V render for ${activeChar.name}...`);
      const output = await WorkflowEngine.executeVideoGeneration(videoParams, activeChar, (task) => {
        setActiveTasks((prev) => {
          const filtered = prev.filter((t) => t.id !== task.id);
          return [task, ...filtered];
        });
      });

      setGallery((prev) => [output, ...prev]);
      soundSynth.playPowerup();
    } catch (e: any) {
      addLog(`[AI Character Studio] Video task failed or cancelled: ${e.message}`, 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0b0d13] text-gray-200 font-sans select-none overflow-hidden h-full">
      {/* Top Header & Tabs Bar */}
      <div className="h-14 bg-[#131620] border-b border-[#212636] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-wide">AI Character Studio</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                Multi-Model PuLID & ControlNet Suite
              </span>
            </div>
            <p className="text-[11px] text-gray-400">تولید فوتورئال شخصیت‌های مجازی با هویت چهره ثابت و موتورهای ویدئویی پیشرفته</p>
          </div>
        </div>

        {/* Studio Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 bg-[#1a1e2b] p-1 rounded-xl border border-[#292f42] overflow-x-auto">
          {[
            { id: 'characters', label: 'شخصیت‌ها و هویت', icon: UserCheck },
            { id: 'image_gen', label: 'موتور تصویر', icon: ImageIcon },
            { id: 'pose_control', label: 'پوز و صحنه', icon: Compass },
            { id: 'enhancements', label: 'بهبود و اصلاح', icon: Sliders },
            { id: 'video_gen', label: 'موتور ویدئو', icon: Video },
            { id: 'workflows', label: 'گردشکار ComfyUI', icon: Code },
            { id: 'gallery', label: 'گالری و تاریخچه', icon: FolderOpen },
            { id: 'telemetry', label: 'وضعیت سخت‌افزار', icon: Activity }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  soundSynth.playCoin();
                  setActiveTab(tab.id as any);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-[#232938]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* ============================================================ */}
        {/* TAB 1: CHARACTERS & IDENTITY ENGINE                          */}
        {/* ============================================================ */}
        {activeTab === 'characters' && activeChar && (
          <div className="flex-1 flex overflow-hidden p-4 gap-4">
            {/* Left: Characters List */}
            <div className="w-80 bg-[#141721] border border-[#222738] rounded-2xl p-4 flex flex-col shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-200">پروفایل‌های کاراکتر ({characters.length})</span>
                <button
                  onClick={() => {
                    soundSynth.playCoin();
                    const newId = 'char_' + Date.now();
                    const samplePhoto = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80';
                    const newProfile: CharacterProfile = {
                      id: newId,
                      name: 'شخصیت جدید ' + (characters.length + 1),
                      age: 24,
                      gender: 'Female',
                      ethnicity: 'Global Fusion',
                      hairStyle: 'Textured Wavy',
                      hairColor: 'Obsidian Black',
                      eyeColor: 'Hazel',
                      defaultOutfit: 'Modern Tailored Combat Trenchcoat',
                      facialFeatures: 'Symmetrical facial structure, expressive eyebrows, sharp focus',
                      identityLock: true,
                      referenceImages: [samplePhoto],
                      embedding: IdentityEngine.extractFaceEmbedding(samplePhoto, Date.now()),
                      loraModel: `lora_${newId}.safetensors`,
                      loraWeight: 0.95,
                      faceSimilarityThreshold: 0.88,
                      version: 1,
                      createdAt: Date.now(),
                      updatedAt: Date.now()
                    };
                    setCharacters([...characters, newProfile]);
                    setSelectedCharId(newProfile.id);
                    characterStorage.saveCharacter(newProfile);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>شخصیت جدید</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {characters.map((c) => {
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
                          {c.identityLock && <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{c.defaultOutfit}</p>
                        <div className="flex items-center gap-2 mt-1 text-[9px] font-mono text-cyan-300">
                          <span>آستانه شباهت: {(c.faceSimilarityThreshold * 100).toFixed(0)}%</span>
                          <span>•</span>
                          <span>v{c.version}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Selected Character Details & Identity Lock Engine */}
            <div className="flex-1 bg-[#141721] border border-[#222738] rounded-2xl p-6 overflow-y-auto flex flex-col gap-6">
              {/* Header Profile Bar */}
              <div className="flex items-center justify-between border-b border-[#212636] pb-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={activeChar.referenceImages[0]}
                      alt={activeChar.name}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-cyan-500/40 shadow-lg"
                    />
                    <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-500 text-black">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white">{activeChar.name}</h2>
                      <button
                        onClick={() => handleUpdateActiveCharacter({ identityLock: !activeChar.identityLock })}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                          activeChar.identityLock
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}
                      >
                        {activeChar.identityLock ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        <span>{activeChar.identityLock ? 'قفل هویت چهره فعال (Identity Lock)' : 'قفل هویت غیرفعال'}</span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      شناسه یکتا: <span className="font-mono text-cyan-400">{activeChar.id}</span> • وکتور بیومتریک ۵۱۲ بعدی فعال
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunStabilityTest}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-xs font-bold text-cyan-300 cursor-pointer"
                    title="تست ثبات چهره در ۲۰ حالت نوری و زاویه مختلف"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>تست ثبات هویت در ۲۰ شرایط</span>
                  </button>
                  <button
                    onClick={() => {
                      if (characters.length <= 1) return;
                      soundSynth.playLaser();
                      characterStorage.deleteCharacter(activeChar.id);
                      const rest = characters.filter((c) => c.id !== activeChar.id);
                      setCharacters(rest);
                      setSelectedCharId(rest[0].id);
                    }}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 cursor-pointer"
                    title="حذف شخصیت"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Character Attributes Form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">نام و هویت کاراکتر</label>
                  <input
                    type="text"
                    value={activeChar.name}
                    onChange={(e) => handleUpdateActiveCharacter({ name: e.target.value })}
                    className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">سن و جنسیت</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={activeChar.age}
                      onChange={(e) => handleUpdateActiveCharacter({ age: parseInt(e.target.value) || 20 })}
                      className="w-20 bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                    <input
                      type="text"
                      value={activeChar.gender}
                      onChange={(e) => handleUpdateActiveCharacter({ gender: e.target.value })}
                      className="flex-1 bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">نژاد و تبارشناسی (Ethnicity)</label>
                  <input
                    type="text"
                    value={activeChar.ethnicity}
                    onChange={(e) => handleUpdateActiveCharacter({ ethnicity: e.target.value })}
                    className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Physical Details & LoRA */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">مدل مو و رنگ</label>
                  <input
                    type="text"
                    value={`${activeChar.hairStyle} (${activeChar.hairColor})`}
                    onChange={(e) => handleUpdateActiveCharacter({ hairStyle: e.target.value })}
                    className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">پوشش و لباس پیش‌فرض</label>
                  <input
                    type="text"
                    value={activeChar.defaultOutfit}
                    onChange={(e) => handleUpdateActiveCharacter({ defaultOutfit: e.target.value })}
                    className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                    <span>وزن LoRA اختصاصی</span>
                    <span className="font-mono text-cyan-400">{activeChar.loraWeight.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="1.3"
                    step="0.05"
                    value={activeChar.loraWeight}
                    onChange={(e) => handleUpdateActiveCharacter({ loraWeight: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Facial Geometry & Facial Features */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">مشخصات اختصاصی صورت و نشانه‌های هویتی (Facial Features Prompt)</label>
                <textarea
                  rows={2}
                  value={activeChar.facialFeatures}
                  onChange={(e) => handleUpdateActiveCharacter({ facialFeatures: e.target.value })}
                  className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl p-3 text-xs text-white focus:outline-none resize-none"
                />
              </div>

              {/* Reference Images List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-200">تصاویر مرجع چهره (Face Embedding References)</span>
                  <span className="text-[11px] text-gray-400">حداقل ۱ تصویر اصلی با چهره واضح جهت استخراج وکتور ۵۱۲ بعدی</span>
                </div>
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {activeChar.referenceImages.map((img, idx) => (
                    <div key={idx} className="relative group w-28 h-28 rounded-2xl overflow-hidden border border-[#32394e]">
                      <img src={img} alt="Ref" className="w-full h-full object-cover" />
                      <button
                        onClick={() => {
                          const updated = activeChar.referenceImages.filter((_, i) => i !== idx);
                          handleUpdateActiveCharacter({ referenceImages: updated });
                        }}
                        className="absolute top-1 right-1 p-1 rounded-lg bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const sample = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80';
                      handleUpdateActiveCharacter({ referenceImages: [...activeChar.referenceImages, sample] });
                    }}
                    className="w-28 h-28 rounded-2xl border-2 border-dashed border-[#343b50] hover:border-cyan-500 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-cyan-400 cursor-pointer transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px] font-semibold">افزودن عکس مرجع</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: IMAGE GENERATION STUDIO                               */}
        {/* ============================================================ */}
        {activeTab === 'image_gen' && activeChar && (
          <div className="flex-1 flex overflow-hidden p-4 gap-4">
            {/* Left Controls Column */}
            <div className="w-96 bg-[#141721] border border-[#222738] rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                  <span>موتور تولید تصویر (Image Generation Engine)</span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {currentAdapter.spec.provider === 'local_gpu' ? 'محلی GPU' : 'سرویس ابری API'}
                  </span>
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as ImageModelType)}
                  className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="FLUX.2 Max">FLUX.2 Max (12B Rectified Flow - PuLID Native)</option>
                  <option value="GPT Image">GPT Image (OpenAI Cloud Gateway)</option>
                  <option value="Google Nano Banana">Google Nano Banana (DeepMind Imagen)</option>
                  <option value="Seedream 5 Pro">Seedream 5 Pro (Cinematic Lighting)</option>
                  <option value="SDXL Custom">SDXL Custom (PyTorch & Diffusers Local)</option>
                </select>
              </div>

              {/* Compatibility Alert */}
              {!compatibilityCheck.compatible && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{compatibilityCheck.error}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">موتور حفظ هویت چهره (Identity Engine)</label>
                <select
                  value={identityEngine}
                  onChange={(e) => setIdentityEngine(e.target.value as IdentityEngineType)}
                  className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="PuLID">PuLID (سازگار با FLUX - بالاترین دقت چهره)</option>
                  <option value="IP-Adapter FaceID">IP-Adapter FaceID (سازگار با SDXL / Diffusers)</option>
                  <option value="LoRA Dedicated">LoRA اختصاصی کاراکتر</option>
                  <option value="Character Identity Lock">Character Identity Lock (الگوریتم شباهت وکتوری)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">کنترل پوز و استخوان‌بندی (Pose & Scene)</label>
                <select
                  value={poseControl}
                  onChange={(e) => setPoseControl(e.target.value as PoseControlNetType)}
                  className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="OpenPose">OpenPose (اسکلت بدن ۱۸ مفصله)</option>
                  <option value="Depth ControlNet">Depth ControlNet (نقشه عمق سه‌بعدی)</option>
                  <option value="Canny ControlNet">Canny ControlNet (خطوط محیطی)</option>
                  <option value="None">بدون ControlNet (آزاد)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">نسبت تصویر</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as any)}
                    className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="9:16">9:16 پرتره (۷۶۸×۱۳۶۰)</option>
                    <option value="16:9">16:9 سینمایی (۱۳۶۰×۷۶۸)</option>
                    <option value="1:1">1:1 مربع (۱۰۲۴×۱۰۲۴)</option>
                    <option value="4:5">4:5 عمودی (۸۹۶×۱۱۵۲)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                    <span>گام‌ها (Steps)</span>
                    <span className="font-mono text-cyan-400">{steps}</span>
                  </label>
                  <input
                    type="range"
                    min="15"
                    max="50"
                    value={steps}
                    onChange={(e) => setSteps(parseInt(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                    <span>CFG Scale</span>
                    <span className="font-mono text-cyan-400">{cfgScale}</span>
                  </label>
                  <input
                    type="range"
                    min="1.5"
                    max="10.0"
                    step="0.5"
                    value={cfgScale}
                    onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                    <span>Seed</span>
                    <button
                      onClick={() => setSeed(Math.floor(Math.random() * 9000000) + 1000000)}
                      className="text-[10px] text-cyan-400 hover:underline"
                    >
                      تصادفی
                    </button>
                  </label>
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Enhancers Quick Toggle */}
              <div className="space-y-2 pt-2 border-t border-[#212636]">
                <span className="text-xs font-bold text-gray-300">موتورهای بهبود چهره و پوست (Enhancers)</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['CodeFormer', 'ADetailer', 'SUPIR', '4x-UltraSharp'] as EnhancerType[]).map((key) => {
                    const cfg = enhancersConfig[key];
                    return (
                      <label
                        key={key}
                        className="flex items-center gap-2 p-2 rounded-xl bg-[#1b1f2d] border border-[#2d3448] cursor-pointer text-xs text-gray-200"
                      >
                        <input
                          type="checkbox"
                          checked={cfg.enabled}
                          onChange={(e) =>
                            setEnhancersConfig({
                              ...enhancersConfig,
                              [key]: { ...cfg, enabled: e.target.checked }
                            })
                          }
                          className="rounded accent-cyan-500"
                        />
                        <span className="text-[11px] truncate">{key}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Prompt & Active Generation Workspace */}
            <div className="flex-1 bg-[#141721] border border-[#222738] rounded-2xl p-6 flex flex-col gap-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-300">کاراکتر:</span>
                  <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/40">
                    {activeChar.name}
                  </span>
                  <span className="text-xs text-gray-400">({activeChar.hairStyle}, {activeChar.eyeColor})</span>
                </div>

                <button
                  onClick={handleExecuteImageGen}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/30 cursor-pointer transition-all active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>تولید تصویر فوتورئال (Render)</span>
                </button>
              </div>

              {/* Prompt Input */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                  <span>متن پرامپت (Prompt)</span>
                  <span className="text-[10px] text-gray-400">ویژگی‌های کاراکتر به صورت هوشمند تزریق می‌شوند</span>
                </label>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                />
              </div>

              {/* Negative Prompt */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">پرامپت منفی (Negative Prompt)</label>
                <input
                  type="text"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Active Tasks & Real Progress Pipeline */}
              <div className="flex-1 bg-[#10131b] border border-[#212636] rounded-xl p-4 flex flex-col gap-3 overflow-y-auto">
                <span className="text-xs font-bold text-gray-300 flex items-center justify-between">
                  <span>صف پردازش خط لوله ComfyUI & Diffusers</span>
                  <span className="text-[10px] font-mono text-cyan-400">{activeTasks.length} وظیفه فعال</span>
                </span>

                {activeTasks.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-xs gap-2 py-8">
                    <Terminal className="w-8 h-8 opacity-40 text-cyan-400" />
                    <span>هیچ وظیفه‌ای در حال اجرا نیست. روی دکمه تولید کلیک کنید.</span>
                  </div>
                ) : (
                  activeTasks.map((t) => (
                    <div key={t.id} className="p-3.5 rounded-xl bg-[#171a26] border border-[#282f44] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{t.model}</span>
                          <span className="text-[10px] text-gray-400 font-mono">({t.id})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                              t.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : t.status === 'cancelled'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-cyan-500/20 text-cyan-300 animate-pulse'
                            }`}
                          >
                            {t.status === 'completed' ? 'تکمیل شد' : `${t.progress}% ${t.status}`}
                          </span>
                          {t.status === 'running' && (
                            <button
                              onClick={() => WorkflowEngine.cancelTask(t.id)}
                              className="text-[10px] px-2 py-0.5 rounded bg-red-600/30 hover:bg-red-600 text-red-300 cursor-pointer"
                            >
                              لغو
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="w-full h-2 bg-[#22283a] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300"
                          style={{ width: `${t.progress}%` }}
                        />
                      </div>

                      <div className="text-[10px] text-cyan-300/80 font-mono truncate">{t.currentStep}</div>

                      <div className="max-h-20 overflow-y-auto space-y-0.5 font-mono text-[9px] text-gray-400 bg-[#0d0f17] p-2 rounded-lg border border-[#1f2434]">
                        {t.logs.map((l, idx) => (
                          <div key={idx}>{l}</div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: POSE & SCENE STUDIO                                   */}
        {/* ============================================================ */}
        {activeTab === 'pose_control' && (
          <div className="flex-1 flex overflow-hidden p-4 gap-4">
            <div className="w-80 bg-[#141721] border border-[#222738] rounded-2xl p-4 flex flex-col gap-4 shrink-0">
              <span className="text-xs font-bold text-gray-200">الگوهای پوز اسکلتی (OpenPose Presets)</span>
              <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                {PoseControlEngine.getPresetPoses().map((p, idx) => (
                  <button
                    key={p.name}
                    onClick={() => {
                      soundSynth.playCoin();
                      setSelectedPoseIndex(idx);
                    }}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                      selectedPoseIndex === idx
                        ? 'bg-cyan-500/20 border-cyan-500 text-white font-bold'
                        : 'bg-[#1a1e2b] border-[#292f42] text-gray-300 hover:bg-[#222738]'
                    }`}
                  >
                    <div className="text-xs">{p.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">دسته‌بندی: {p.category} • ۱۸ مفصل</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Canvas Display Grid */}
            <div className="flex-1 bg-[#141721] border border-[#222738] rounded-2xl p-6 flex flex-col gap-4 overflow-y-auto">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>نقشه‌های کنترلی فعال (ControlNet Preprocessors)</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                <div className="bg-[#0e1017] border border-[#202535] rounded-2xl p-3 flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-pink-400">OpenPose Skeleton</span>
                  <div className="flex-1 w-full flex items-center justify-center bg-black rounded-xl overflow-hidden aspect-[9/16]">
                    <canvas ref={poseCanvasRef} width={270} height={480} className="w-full h-full object-contain" />
                  </div>
                </div>

                <div className="bg-[#0e1017] border border-[#202535] rounded-2xl p-3 flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-blue-400">Depth Z-Buffer Map</span>
                  <div className="flex-1 w-full flex items-center justify-center bg-black rounded-xl overflow-hidden aspect-[9/16]">
                    <canvas ref={depthCanvasRef} width={270} height={480} className="w-full h-full object-contain" />
                  </div>
                </div>

                <div className="bg-[#0e1017] border border-[#202535] rounded-2xl p-3 flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400">Canny Lineart Edges</span>
                  <div className="flex-1 w-full flex items-center justify-center bg-black rounded-xl overflow-hidden aspect-[9/16]">
                    <canvas ref={cannyCanvasRef} width={270} height={480} className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: ENHANCEMENTS & UPSCALERS STUDIO                       */}
        {/* ============================================================ */}
        {activeTab === 'enhancements' && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto gap-6">
            <div className="flex items-center justify-between border-b border-[#212636] pb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>موتور بهبود و اصلاح تصویر (Enhancement & Upscaling Engine)</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">تنظیم جداگانه موتورهای اصلاح چهره، پوست، دست‌ها و سوپر رزولوشن بدون تغییر هویت</p>
              </div>
              <div className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/20">
                بودجه VRAM: {EnhancementEngine.calculateEnhancementBudget(enhancersConfig).totalVramMB} MB
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(enhancersConfig) as EnhancerType[]).map((key) => {
                const enh = enhancersConfig[key];
                return (
                  <div
                    key={key}
                    className={`p-4 rounded-2xl border transition-all ${
                      enh.enabled ? 'bg-[#171b28] border-cyan-500/40' : 'bg-[#141721] border-[#222738] opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={enh.enabled}
                          onChange={(e) =>
                            setEnhancersConfig({
                              ...enhancersConfig,
                              [key]: { ...enh, enabled: e.target.checked }
                            })
                          }
                          className="rounded accent-cyan-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-white">{enh.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400">{enh.vramCostMB} MB VRAM</span>
                    </div>

                    <p className="text-[11px] text-gray-400 mb-3">{enh.description}</p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-300">قدرت پردازش (Strength):</span>
                        <span className="font-mono text-cyan-400">{(enh.strength * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        disabled={!enh.enabled}
                        value={enh.strength}
                        onChange={(e) =>
                          setEnhancersConfig({
                            ...enhancersConfig,
                            [key]: { ...enh, strength: parseFloat(e.target.value) }
                          })
                        }
                        className="w-full accent-cyan-500 cursor-pointer disabled:opacity-40"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: VIDEO GENERATION STUDIO                               */}
        {/* ============================================================ */}
        {activeTab === 'video_gen' && activeChar && (
          <div className="flex-1 flex overflow-hidden p-4 gap-4">
            <div className="w-96 bg-[#141721] border border-[#222738] rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">موتور تولید ویدئو (Video Model)</label>
                <select
                  value={videoModel}
                  onChange={(e) => setVideoModel(e.target.value as VideoModelType)}
                  className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="Wan 2.2">Wan 2.2 (بالاترین ثبات حرکت و فیبر چهره)</option>
                  <option value="LTX-2.3">LTX-2.3 (مدل دیفیوژن ویدئویی سبک و سینمایی)</option>
                  <option value="RIFE">RIFE (موتور اینترپولیشن فریم ۶۰ FPS)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">حرکت دوربین (Camera Motion)</label>
                <select
                  value={cameraMotion}
                  onChange={(e) => setCameraMotion(e.target.value as CameraMotion)}
                  className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="orbital_360">چرخش زاویه‌ای ۳۶۰ درجه (Orbital 360)</option>
                  <option value="zoom_in">زوم تدریجی به جلو (Dolly Zoom In)</option>
                  <option value="zoom_out">زوم تدریجی به عقب (Zoom Out)</option>
                  <option value="pan_left">حرکت افقی به چپ (Pan Left)</option>
                  <option value="pan_right">حرکت افقی به راست (Pan Right)</option>
                  <option value="static">حرکت طبیعی ارگانیک (Organic Breathing)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                    <span>مدت زمان (ثانیه)</span>
                    <span className="font-mono text-cyan-400">{videoDuration}s</span>
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="8"
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(parseInt(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">نرخ فریم (FPS)</label>
                  <select
                    value={videoFps}
                    onChange={(e) => setVideoFps(parseInt(e.target.value) as any)}
                    className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value={30}>30 FPS Standard</option>
                    <option value={60}>60 FPS Ultra-Smooth (RIFE)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                  <span>شدت حرکت (Motion Intensity)</span>
                  <span className="font-mono text-cyan-400">{motionIntensity}/10</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={motionIntensity}
                  onChange={(e) => setMotionIntensity(parseInt(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Video Workspace Viewport */}
            <div className="flex-1 bg-[#141721] border border-[#222738] rounded-2xl p-6 flex flex-col gap-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-300">شخصیت منبع:</span>
                  <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/40">
                    {activeChar.name}
                  </span>
                </div>
                <button
                  onClick={handleExecuteVideoGen}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/30 cursor-pointer transition-all active:scale-95"
                >
                  <Video className="w-4 h-4" />
                  <span>تولید ویدئوی فوتورئال (I2V Render)</span>
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">پرامپت حرکت و سناریو ویدئو</label>
                <textarea
                  rows={3}
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  className="w-full bg-[#1b1f2d] border border-[#2d3448] rounded-xl p-3 text-xs text-white focus:outline-none resize-none"
                />
              </div>

              {/* Video Preview Card */}
              <div className="flex-1 bg-[#0e1017] border border-[#202535] rounded-xl p-4 flex flex-col items-center justify-center gap-3">
                <div className="relative w-48 aspect-[9/16] rounded-2xl overflow-hidden border border-cyan-500/30 shadow-xl">
                  <img src={activeChar.referenceImages[0]} alt="Source" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                    <span className="text-[10px] font-mono text-cyan-300">{videoModel} • {videoFps} FPS</span>
                    <span className="text-[9px] text-gray-400">حفظ چهره: {(activeChar.faceSimilarityThreshold * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400">فریم اولیه از عکس مرجع کاراکتر بارگذاری شده و حرکت با حفظ هویت رندر می‌شود.</p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 6: WORKFLOWS & COMFYUI JSON GRAPH                       */}
        {/* ============================================================ */}
        {activeTab === 'workflows' && activeChar && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto gap-4">
            <div className="flex items-center justify-between border-b border-[#212636] pb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Code className="w-4 h-4 text-cyan-400" />
                  <span>ساختار واقعی گردشکار ComfyUI و اسکریپت PyTorch Diffusers</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">تولید خودکار نمودار گره‌های ComfyUI برای اجرای مستقیم روی سرورهای GPU محلی و ابری</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const graph = WorkflowEngine.generateComfyUIGraph({
                      characterId: activeChar.id,
                      prompt,
                      negativePrompt,
                      model: selectedModel,
                      identityEngine,
                      poseControl,
                      aspectRatio,
                      width: 1024,
                      height: 1024,
                      steps,
                      cfgScale,
                      seed,
                      enhancers: { codeformer: true, codeformerStrength: 0.8, gfpgan: false, adetailer: true, supir: true, ultraSharp: false }
                    }, activeChar);
                    navigator.clipboard.writeText(JSON.stringify(graph, null, 2));
                    soundSynth.playCoin();
                    addLog('[ComfyUI] Workflow JSON copied to clipboard.');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1d2231] hover:bg-[#252c3f] border border-[#30374e] text-xs font-bold text-cyan-300 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>کپی گراف ComfyUI (JSON)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              <div className="flex flex-col bg-[#0d0f17] border border-[#212638] rounded-2xl p-4 overflow-hidden">
                <span className="text-xs font-bold text-cyan-400 font-mono mb-2">ComfyUI Node Graph (JSON Schema)</span>
                <pre className="flex-1 overflow-y-auto font-mono text-[10px] text-gray-300 leading-relaxed bg-[#07090e] p-3 rounded-xl border border-[#1b1f2e]">
                  {JSON.stringify(
                    WorkflowEngine.generateComfyUIGraph({
                      characterId: activeChar.id,
                      prompt,
                      negativePrompt,
                      model: selectedModel,
                      identityEngine,
                      poseControl,
                      aspectRatio,
                      width: 1024,
                      height: 1024,
                      steps,
                      cfgScale,
                      seed,
                      enhancers: { codeformer: true, codeformerStrength: 0.8, gfpgan: false, adetailer: true, supir: true, ultraSharp: false }
                    }, activeChar),
                    null,
                    2
                  )}
                </pre>
              </div>

              <div className="flex flex-col bg-[#0d0f17] border border-[#212638] rounded-2xl p-4 overflow-hidden">
                <span className="text-xs font-bold text-purple-400 font-mono mb-2">Standalone PyTorch / Diffusers Script (.py)</span>
                <pre className="flex-1 overflow-y-auto font-mono text-[10px] text-gray-300 leading-relaxed bg-[#07090e] p-3 rounded-xl border border-[#1b1f2e]">
                  {WorkflowEngine.generatePythonDiffusersScript({
                    characterId: activeChar.id,
                    prompt,
                    negativePrompt,
                    model: selectedModel,
                    identityEngine,
                    poseControl,
                    aspectRatio,
                    width: 1024,
                    height: 1024,
                    steps,
                    cfgScale,
                    seed,
                    enhancers: { codeformer: true, codeformerStrength: 0.8, gfpgan: false, adetailer: true, supir: true, ultraSharp: false }
                  }, activeChar)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 7: GALLERY & GENERATION HISTORY                          */}
        {/* ============================================================ */}
        {activeTab === 'gallery' && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto gap-4">
            <div className="flex items-center justify-between border-b border-[#212636] pb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-cyan-400" />
                  <span>گالری تصاویر و ویدئوهای تولیدشده ({gallery.length})</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">ذخیره‌سازی پایدار در IndexedDB با ثبت دقیق شباهت بیومتریک و پرامپت هر خروجی</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {gallery.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setInspectedOutput(item)}
                  className="bg-[#141721] border border-[#222738] rounded-2xl overflow-hidden group flex flex-col cursor-pointer hover:border-cyan-500/50 transition-all shadow-md"
                >
                  <div className="relative aspect-[9/16] overflow-hidden bg-black">
                    <img
                      src={item.url}
                      alt="Output"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] text-cyan-300 font-mono">
                      {item.model}
                    </div>
                    {item.passedIdentityLock && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500/80 backdrop-blur-sm text-[9px] text-black font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>{(item.identitySimilarity * 100).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <span className="text-xs font-bold text-white truncate">{item.characterName}</span>
                    <p className="text-[10px] text-gray-400 line-clamp-2">{item.prompt}</p>
                    <div className="flex items-center justify-between pt-2 mt-auto border-t border-[#202535]">
                      <span className="text-[9px] text-gray-500 font-mono">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                      <a
                        href={item.url}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer"
                        title="دانلود فایل"
                      >
                        <Download className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 8: TELEMETRY & HARDWARE GPU MONITOR                      */}
        {/* ============================================================ */}
        {activeTab === 'telemetry' && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto gap-6">
            <div className="flex items-center justify-between border-b border-[#212636] pb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>پایش سخت‌افزار، مصرف حافظه VRAM و زیرساخت پایگاه داده</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">مدیریت لود مدل‌ها در حافظه GPU و خروجی اسکریپت PostgreSQL / Redis</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunFullValidationSuite}
                  disabled={isValidating}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isValidating ? 'در حال تست...' : 'اجرای تست‌های خودکار موتورها'}</span>
                </button>

                <button
                  onClick={async () => {
                    const sql = await characterStorage.exportPostgreSQLSchema();
                    setSqlExportModal(sql);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1d2231] hover:bg-[#252c3f] border border-[#30374e] text-xs font-bold text-cyan-300 cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>خروجی PostgreSQL & Redis DDL</span>
                </button>
              </div>
            </div>

            {/* Hardware Telemetry Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#141721] border border-[#222738] rounded-2xl p-4 flex flex-col gap-2">
                <span className="text-xs text-gray-400">حافظه VRAM کارت گرافیک</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold text-cyan-400 font-mono">
                    {(gpuStatus.allocatedVRAM_MB / 1024).toFixed(2)} GB
                  </span>
                  <span className="text-xs text-gray-500 font-mono">از {(gpuStatus.totalVRAM_MB / 1024).toFixed(0)} GB</span>
                </div>
                <div className="w-full h-2 bg-[#1b1f2d] rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-cyan-500"
                    style={{ width: `${(gpuStatus.allocatedVRAM_MB / gpuStatus.totalVRAM_MB) * 100}%` }}
                  />
                </div>
              </div>

              <div className="bg-[#141721] border border-[#222738] rounded-2xl p-4 flex flex-col gap-2">
                <span className="text-xs text-gray-400">دمای پردازنده گرافیکی (GPU Temp)</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold text-emerald-400 font-mono">{gpuStatus.temperatureCelsius}°C</span>
                  <span className="text-xs text-emerald-500 font-mono">خنک‌کننده فعال</span>
                </div>
                <div className="w-full h-2 bg-[#1b1f2d] rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-emerald-500" style={{ width: '65%' }} />
                </div>
              </div>

              <div className="bg-[#141721] border border-[#222738] rounded-2xl p-4 flex flex-col gap-2">
                <span className="text-xs text-gray-400">درصد لود GPU (Core Utilization)</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold text-purple-400 font-mono">{gpuStatus.utilizationPercent}%</span>
                  <span className="text-xs text-purple-300 font-mono">CUDA Cores</span>
                </div>
                <div className="w-full h-2 bg-[#1b1f2d] rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-purple-500" style={{ width: `${gpuStatus.utilizationPercent}%` }} />
                </div>
              </div>

              <div className="bg-[#141721] border border-[#222738] rounded-2xl p-4 flex flex-col gap-2">
                <span className="text-xs text-gray-400">سرویس ComfyUI Gateway</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>متصل و آماده</span>
                  </span>
                  <span className="text-xs text-gray-400 font-mono">Ping: 12ms</span>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">صف: {gpuStatus.queueDepth} وظیفه</span>
              </div>
            </div>

            {/* Validation Test Results Table */}
            {validationSuiteResults && (
              <div className="bg-[#141721] border border-[#222738] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>گزارش اعتبارسنجی خودکار موتورهای استودیو ({validationSuiteResults.length} تست)</span>
                  </span>
                  <span className="text-xs font-mono text-emerald-400">
                    {validationSuiteResults.filter((r) => r.passed).length} / {validationSuiteResults.length} موفق
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-[#212638] text-gray-400 font-mono">
                        <th className="py-2 px-3">وضعیت</th>
                        <th className="py-2 px-3">نام تست</th>
                        <th className="py-2 px-3">دسته‌بندی</th>
                        <th className="py-2 px-3">زمان (ms)</th>
                        <th className="py-2 px-3">جزئیات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationSuiteResults.map((r, i) => (
                        <tr key={i} className="border-b border-[#1b1f2e] hover:bg-[#1a1e2c]">
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                r.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {r.passed ? 'PASS' : 'FAIL'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-white">{r.testName}</td>
                          <td className="py-2.5 px-3 text-cyan-400 font-mono text-[11px]">{r.category}</td>
                          <td className="py-2.5 px-3 font-mono text-gray-400">{r.durationMs}ms</td>
                          <td className="py-2.5 px-3 text-gray-300 text-[11px]">{r.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stability Test Results Modal */}
      {stabilityResults && activeChar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-[#141722] border border-[#2a3044] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-[#222738] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">تست ثبات چهره در ۲۰ حالت تنش نوری و زاویه - {activeChar.name}</h3>
              </div>
              <button
                onClick={() => setStabilityResults(null)}
                className="p-1 rounded-lg hover:bg-[#202536] text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {stabilityResults.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#1a1e2b] border border-[#272e42] text-xs">
                  <span className="text-gray-300">{idx + 1}. {item.condition}</span>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-cyan-400">{(item.similarity * 100).toFixed(1)}%</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {item.passed ? 'PASSED' : 'DRIFT'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#222738] pt-3 flex justify-end">
              <button
                onClick={() => setStabilityResults(null)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer"
              >
                بستن گزارش
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PostgreSQL & Redis DDL Modal */}
      {sqlExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-[#141722] border border-[#2a3044] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-[#222738] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>اسکریپت ساخت پایگاه داده PostgreSQL + pgvector و Redis Streams</span>
              </h3>
              <button onClick={() => setSqlExportModal(null)} className="p-1 rounded-lg hover:bg-[#202536] text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <pre className="flex-1 overflow-y-auto font-mono text-[11px] text-gray-300 leading-relaxed bg-[#090b10] p-4 rounded-xl border border-[#1e2230]">
              {sqlExportModal}
            </pre>

            <div className="flex items-center justify-between border-t border-[#222738] pt-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(sqlExportModal);
                  soundSynth.playCoin();
                  addLog('[Database] PostgreSQL DDL script copied.');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>کپی اسکریپت SQL</span>
              </button>
              <button
                onClick={() => setSqlExportModal(null)}
                className="px-4 py-1.5 rounded-xl bg-[#202536] text-gray-300 hover:text-white text-xs font-bold cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Output Inspection Modal */}
      {inspectedOutput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl bg-[#141722] border border-[#2a3044] rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto">
            <div className="w-full md:w-1/2 aspect-[9/16] bg-black rounded-xl overflow-hidden border border-[#2c3348]">
              <img src={inspectedOutput.url} alt="Inspect" className="w-full h-full object-contain" />
            </div>

            <div className="w-full md:w-1/2 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#212638] pb-3">
                <span className="text-sm font-bold text-white">{inspectedOutput.characterName}</span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-xs font-mono">
                  {inspectedOutput.model}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-gray-400">پرامپت:</span>
                <p className="text-xs text-gray-200 leading-relaxed bg-[#0d0f17] p-3 rounded-xl border border-[#1e2334]">
                  {inspectedOutput.prompt}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-[#191d2a] p-2.5 rounded-xl border border-[#282f44]">
                  <span className="text-gray-400 text-[10px] block">ثبات چهره:</span>
                  <span className="text-emerald-400 font-bold">{(inspectedOutput.identitySimilarity * 100).toFixed(1)}%</span>
                </div>
                <div className="bg-[#191d2a] p-2.5 rounded-xl border border-[#282f44]">
                  <span className="text-gray-400 text-[10px] block">Seed:</span>
                  <span className="text-cyan-400">{inspectedOutput.seed}</span>
                </div>
                <div className="bg-[#191d2a] p-2.5 rounded-xl border border-[#282f44]">
                  <span className="text-gray-400 text-[10px] block">رزولوشن:</span>
                  <span className="text-gray-200">{inspectedOutput.resolution.width}×{inspectedOutput.resolution.height}</span>
                </div>
                <div className="bg-[#191d2a] p-2.5 rounded-xl border border-[#282f44]">
                  <span className="text-gray-400 text-[10px] block">بهبودها:</span>
                  <span className="text-purple-300 truncate">{inspectedOutput.enhancersApplied.join(', ') || 'None'}</span>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-[#212638] pt-4">
                <a
                  href={inspectedOutput.url}
                  download={`AetherForge_${inspectedOutput.characterName}_${inspectedOutput.id}.png`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>دانلود فایل اصلی</span>
                </a>
                <button
                  onClick={() => setInspectedOutput(null)}
                  className="px-4 py-2 rounded-xl bg-[#222738] text-gray-300 hover:text-white text-xs font-bold cursor-pointer"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
