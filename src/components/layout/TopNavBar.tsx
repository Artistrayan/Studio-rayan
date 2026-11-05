/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useStudio } from '../../context/StudioContext';
import { translations } from '../../services/i18n';
import { WorkspaceMode } from '../../types';
import { projectManager } from '../../services/projects/projectManager';
import { ProjectModal } from '../projects/ProjectModal';
import { DesignToCodeModal } from '../design2code/DesignToCodeModal';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import {
  Gamepad2,
  Grid,
  Volume2,
  Sparkles,
  Bot,
  Paintbrush,
  Layout,
  Database,
  Globe,
  Activity,
  Code2,
  Box,
  Landmark,
  Workflow,
  Palette,
  Terminal,
  GitBranch,
  Download,
  FolderOpen,
  Play,
  Pause,
  Languages,
  Sun,
  Moon,
  Maximize2,
  FolderTree,
  ChevronDown,
  Layers,
  Wrench,
  Search,
  Command,
  HelpCircle,
  Sliders
} from 'lucide-react';
import { soundSynth } from '../../services/audio/synth';

interface ToolItem {
  id: WorkspaceMode;
  name: string;
  nameEn: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  tag: string;
}

interface MenuCategory {
  id: 'game_dev' | 'software_dev' | 'art_studio' | 'tools_deploy';
  labelFa: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  tools: ToolItem[];
}

export const TopNavBar: React.FC = () => {
  const {
    workspace,
    setWorkspace,
    language,
    setLanguage,
    theme,
    setTheme,
    isPlaying,
    setIsPlaying
  } = useStudio();

  const t = translations[language];
  const [showProjectsModal, setShowProjectsModal] = useState<boolean>(false);
  const [showDesignModal, setShowDesignModal] = useState<boolean>(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeProject = projectManager.getActiveProject();
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Categorized Clean Hierarchy
  const categories: MenuCategory[] = [
    {
      id: 'game_dev',
      labelFa: 'بازیسازی و مرحله',
      labelEn: 'Game Dev & Levels',
      icon: Gamepad2,
      color: '#06b6d4',
      tools: [
        {
          id: 'game',
          name: 'موتور و اجرای بازی',
          nameEn: 'Game Engine & Viewport',
          description: 'محیط اجرای زنده بازی ۲ بعدی با فیزیک و جاذبه',
          icon: Gamepad2,
          tag: 'Core'
        },
        {
          id: 'tilemap',
          name: 'طراح مرحله و تایل (Tilemap)',
          nameEn: 'Tilemap & Level Editor',
          description: 'لایه‌بندی نقشه، پالت تایل‌ها و ماسک برخورد فیزیکی',
          icon: Grid,
          tag: 'Level'
        },
        {
          id: 'particles',
          name: 'جلوه‌های ویژه ذرات (VFX)',
          nameEn: 'Particle FX Designer',
          description: 'طراحی آتش، دود، انفجار، برف، باران و رد جادویی',
          icon: Sparkles,
          tag: 'VFX'
        },
        {
          id: 'ai_behavior',
          name: 'هوش مصنوعی و FSM',
          nameEn: 'AI Behavior & State Machine',
          description: 'طراحی گره‌ای رفتار دشمنان، گشت‌زنی و تعقیب',
          icon: Bot,
          tag: 'AI'
        },
        {
          id: 'political',
          name: 'بازی استراتژی سیاسی',
          nameEn: 'Political Simulation (No-Code)',
          description: 'ساخت کارت‌های تصمیم‌گیری و مدیریت جناح‌ها',
          icon: Landmark,
          tag: 'Sim'
        }
      ]
    },
    {
      id: 'software_dev',
      labelFa: 'توسعه نرم‌افزار و وب',
      labelEn: 'Software & App Dev',
      icon: Code2,
      color: '#3b82f6',
      tools: [
        {
          id: 'code',
          name: 'ویرایشگر کد (VS Code)',
          nameEn: 'VS Code Editor',
          description: 'کدنویسی کامل با تشخیص اشتباهات، اصلاح خودکار و تب‌ها',
          icon: Code2,
          tag: 'IDE'
        },
        {
          id: 'uibuilder',
          name: 'سازنده بصری رابط کاربری',
          nameEn: 'Visual UI/UX Builder',
          description: 'درگ‌ودراپ المان‌ها با خروجی به React، HTML و Flutter',
          icon: Layout,
          tag: 'UI/UX'
        },
        {
          id: 'database',
          name: 'دیتابیس محلی (SQLite / Mock DB)',
          nameEn: 'Local DB & SQLite',
          description: 'جدول‌ها، ردیف‌ها، فیلترها و اجرای کوئری SQL',
          icon: Database,
          tag: 'Data'
        },
        {
          id: 'apiclient',
          name: 'تست‌کننده API (Postman)',
          nameEn: 'API Client & Tester',
          description: 'ارسال متدهای GET/POST/PUT/DELETE با مانیتورینگ پاسخ',
          icon: Globe,
          tag: 'Network'
        },
        {
          id: 'terminal',
          name: 'ترمینال پیشرفته فورج‌شل',
          nameEn: 'ForgeShell Terminal',
          description: 'ترمینال چندتبی با REPLهای پایتون، لینوکس و جاوااسکریپت',
          icon: Terminal,
          tag: 'CLI'
        }
      ]
    },
    {
      id: 'art_studio',
      labelFa: 'استودیوهای هنر و صدا',
      labelEn: 'Art & Audio Studios',
      icon: Palette,
      color: '#a855f7',
      tools: [
        {
          id: '3d_studio',
          name: 'استودیو سه‌بعدی (بلندر)',
          nameEn: '3D Blender Studio',
          description: '۱۰ قلم مجسمه‌سازی، تقارن X و ۱۴ مدل آماده',
          icon: Box,
          tag: '3D'
        },
        {
          id: 'audio_synth',
          name: 'سنتز صدا و افکت صوتی (SFX)',
          nameEn: 'SFX & 8-Bit Synth',
          description: 'تولید صدای شلیک، پرش، انفجار، سکه و موزیک ۸ بیتی',
          icon: Volume2,
          tag: 'Audio'
        },
        {
          id: 'sprites',
          name: 'پیکسل‌آرت و انیماتور ۲D',
          nameEn: 'Pixel Art & Sprites',
          description: 'رسم اسپریت ۱۶×۱۶، لایه‌ها و ساخت استرایت‌شیت PNG',
          icon: Paintbrush,
          tag: 'Pixel'
        },
        {
          id: 'textures',
          name: 'تکسچرساز و متریال ۳D',
          nameEn: 'Texture Workshop',
          description: 'تولید پترن‌های فرکتال، خطوط و متریال‌های سه‌بعدی',
          icon: Palette,
          tag: 'Texture'
        }
      ]
    },
    {
      id: 'tools_deploy',
      labelFa: 'سیستم و خروجی',
      labelEn: 'System & Export',
      icon: Wrench,
      color: '#10b981',
      tools: [
        {
          id: 'nocode',
          name: 'برنامه‌نویسی گره‌ای (No-Code)',
          nameEn: 'Visual Logic Graph',
          description: 'اتصال رویدادها، اکشن‌ها و شروط بدون کدنویسی',
          icon: Workflow,
          tag: 'Graph'
        },
        {
          id: 'profiler',
          name: 'دیباگر و مانیتورینگ عملکرد',
          nameEn: 'Profiler & Debugger',
          description: 'پایش زنده FPS، رم، زمان رندر فریم‌ها و متغیرها',
          icon: Activity,
          tag: 'Debug'
        },
        {
          id: 'git',
          name: 'گیت و نسخه‌بندی (GitHub)',
          nameEn: 'Git & Versioning',
          description: 'مدیریت شاخه‌ها، کامیت‌ها و ادغام پول‌ریکوئست‌ها',
          icon: GitBranch,
          tag: 'VCS'
        },
        {
          id: 'export',
          name: 'بیلد و خروجی چندسکویی',
          nameEn: 'Build & Multiplatform Export',
          description: 'خروجی تک‌فایلی HTML5، پکیج اندروید و دسکتاپ',
          icon: Download,
          tag: 'Build'
        },
        {
          id: 'assets',
          name: 'کتابخانه Asset های آماده',
          nameEn: 'Asset Library',
          description: 'مجموعه مدل‌های ۳D، صداها، پترن‌ها و متریال‌ها',
          icon: FolderOpen,
          tag: 'Assets'
        }
      ]
    }
  ];

  // Find active tool details
  const allTools = categories.flatMap(c => c.tools);
  const activeTool = allTools.find(t => t.id === workspace) || allTools[0];
  const activeCategory = categories.find(c => c.tools.some(t => t.id === workspace)) || categories[0];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Ctrl+K / Cmd+K search listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectTool = (id: WorkspaceMode) => {
    soundSynth.playCoin();
    setWorkspace(id);
    setOpenDropdown(null);
    setIsQuickSearchOpen(false);
  };

  const handlePlayToggle = () => {
    soundSynth.playJump();
    setIsPlaying(!isPlaying);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const filteredTools = searchQuery.trim()
    ? allTools.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allTools;

  return (
    <>
      <header className="h-12 bg-[#16171d] border-b border-[#262833] flex items-center justify-between px-3 text-sm select-none z-30 shrink-0">
        {/* Left Section: Logo, Project Switcher & Category Dropdowns */}
        <div className="flex items-center gap-2.5" ref={dropdownRef}>
          {/* Brand Emblem */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-sm shadow-cyan-500/20 text-xs">
              AF
            </div>
            <span className="font-bold text-white text-xs hidden lg:inline tracking-tight">
              AetherForge
            </span>
          </div>

          {/* Project Manager Button */}
          <button
            onClick={() => {
              soundSynth.playCoin();
              setShowProjectsModal(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#20232c] hover:bg-[#282c38] border border-[#2f3444] text-xs text-gray-200 cursor-pointer transition-all max-w-[130px] sm:max-w-[160px]"
            title="مدیریت پروژه‌ها (ساخت، حذف، تغییر نام و ذخیره)"
          >
            <FolderTree className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate font-medium">{activeProject?.name || 'Project'}</span>
          </button>

          <div className="h-5 w-px bg-[#2a2d3b] mx-0.5 hidden md:block" />

          {/* Categorized Mega Dropdown Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {categories.map(cat => {
              const Icon = cat.icon;
              const isCategoryActive = cat.tools.some(t => t.id === workspace);
              const isOpen = openDropdown === cat.id;

              return (
                <div key={cat.id} className="relative">
                  <button
                    onClick={() => {
                      soundSynth.playCoin();
                      setOpenDropdown(isOpen ? null : cat.id);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isCategoryActive
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : isOpen
                        ? 'bg-[#222530] text-white border border-[#33384a]'
                        : 'text-gray-300 hover:text-white hover:bg-[#20232c] border border-transparent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                    <span>{language === 'fa' ? cat.labelFa : cat.labelEn}</span>
                    <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Mega Dropdown Menu */}
                  {isOpen && (
                    <div className="absolute top-full mt-1.5 start-0 w-80 bg-[#171922] border border-[#2e3346] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-2 py-1.5 mb-1 border-b border-[#262a3a] flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                          <span>{language === 'fa' ? cat.labelFa : cat.labelEn}</span>
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">{cat.tools.length} ابزار</span>
                      </div>

                      <div className="space-y-1">
                        {cat.tools.map(tool => {
                          const ToolIcon = tool.icon;
                          const isToolActive = workspace === tool.id;
                          return (
                            <button
                              key={tool.id}
                              onClick={() => handleSelectTool(tool.id)}
                              className={`w-full p-2 rounded-xl text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                                isToolActive
                                  ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-300'
                                  : 'hover:bg-[#20232f] text-gray-300 border border-transparent'
                              }`}
                            >
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                                style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                              >
                                <ToolIcon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-bold text-white truncate">
                                    {language === 'fa' ? tool.name : tool.nameEn}
                                  </span>
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#252938] text-gray-400 font-mono">
                                    {tool.tag}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                  {tool.description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Current Workspace Status Badge & Quick Search Trigger */}
        <div className="flex items-center gap-2">
          {/* Quick Search Palette (Ctrl+K) */}
          <button
            onClick={() => {
              soundSynth.playCoin();
              setIsQuickSearchOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#20232c] hover:bg-[#282d38] border border-[#2f3546] text-gray-400 hover:text-gray-200 text-xs transition-all cursor-pointer"
            title="جستجوی سریع ابزارها (Ctrl + K)"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">ابزارها...</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#161820] border border-[#2a2e3d] text-gray-400">
              Ctrl+K
            </kbd>
          </button>

          {/* Current Workspace Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1c1e27] border border-[#2b2f3f] text-xs font-medium text-white shadow-inner">
            <activeTool.icon className="w-3.5 h-3.5" style={{ color: activeCategory.color }} />
            <span className="font-bold text-gray-200">
              {language === 'fa' ? activeTool.name : activeTool.nameEn}
            </span>
          </div>
        </div>

        {/* Right Section: Actions & Utilities */}
        <div className="flex items-center gap-2 shrink-0">
          {/* PWA Direct Installation Button */}
          <PWAInstallButton />

          {/* Convert Design to Code Quick Button */}
          <button
            onClick={() => {
              soundSynth.playCoin();
              setShowDesignModal(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-600/30 to-indigo-600/30 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 text-xs font-medium cursor-pointer transition-all hidden xl:flex"
            title="تبدیل طراحی و عکس به کد واقعی"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>طرح به کد</span>
          </button>

          {/* Play / Pause Game Loop */}
          <button
            onClick={handlePlayToggle}
            title={isPlaying ? t.actions.pause : t.actions.run}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              isPlaying
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">{t.actions.pause}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">{t.actions.run}</span>
              </>
            )}
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'fa' : 'en')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#20232c] hover:bg-[#282d38] text-gray-300 text-xs border border-[#2f3444] cursor-pointer"
            title="تغییر زبان / Change Language"
          >
            <Languages className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-[11px] uppercase font-bold">{language}</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-lg bg-[#20232c] hover:bg-[#282d38] text-gray-300 border border-[#2f3444] cursor-pointer"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-[#20232c] hover:bg-[#282d38] text-gray-300 border border-[#2f3444] cursor-pointer hidden sm:block"
            title={t.actions.fullscreen}
          >
            <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </header>

      {/* Quick Search Palette Modal (Ctrl+K) */}
      {isQuickSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setIsQuickSearchOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-[#171922] border border-[#34394c] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="p-3.5 border-b border-[#282d3e] flex items-center gap-3 bg-[#13151c]">
              <Search className="w-4 h-4 text-cyan-400 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="جستجوی ابزارها (مثلاً: ادیتور، تایل‌مپ، فیزیک، پایتون، SQLite، بلندر)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
              />
              <kbd className="text-[10px] text-gray-500 font-mono px-2 py-0.5 rounded bg-[#20232e]">ESC</kbd>
            </div>

            {/* Filtered Tools List */}
            <div className="max-h-96 overflow-y-auto p-2 space-y-1">
              {filteredTools.map(tool => {
                const ToolIcon = tool.icon;
                const isToolActive = workspace === tool.id;
                const parentCat = categories.find(c => c.tools.some(t => t.id === tool.id));

                return (
                  <button
                    key={tool.id}
                    onClick={() => handleSelectTool(tool.id)}
                    className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isToolActive
                        ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-300'
                        : 'hover:bg-[#20232f] text-gray-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${parentCat?.color || '#3b82f6'}20`, color: parentCat?.color }}
                      >
                        <ToolIcon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white truncate">
                          {language === 'fa' ? tool.name : tool.nameEn}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">
                          {tool.description}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#232736] text-gray-400 shrink-0 font-mono">
                      {tool.tag}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Project Manager Modal */}
      <ProjectModal isOpen={showProjectsModal} onClose={() => setShowProjectsModal(false)} />

      {/* Design to Code Modal */}
      <DesignToCodeModal isOpen={showDesignModal} onClose={() => setShowDesignModal(false)} />
    </>
  );
};
