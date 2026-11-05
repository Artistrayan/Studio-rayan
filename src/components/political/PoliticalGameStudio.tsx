/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import { soundSynth } from '../../services/audio/synth';
import { translations } from '../../services/i18n';
import {
  Landmark,
  Shield,
  Coins,
  Scale,
  Globe2,
  Users,
  AlertTriangle,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  XCircle,
  Vote,
  Newspaper,
  Code2,
  Sliders
} from 'lucide-react';

export interface PoliticalMetric {
  id: string;
  name: string;
  value: number; // 0 to 100
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface PoliticalCard {
  id: string;
  title: string;
  advisor: string;
  role: string;
  scenario: string;
  choiceA: {
    text: string;
    effects: Record<string, number>;
  };
  choiceB: {
    text: string;
    effects: Record<string, number>;
  };
}

export const PoliticalGameStudio: React.FC = () => {
  const { language, setWorkspace, createNewFile, addLog } = useStudio();
  const t = translations[language];

  // Core National Metrics
  const [metrics, setMetrics] = useState<Record<string, number>>({
    approval: 68,
    treasury: 55,
    military: 60,
    liberty: 62,
    diplomacy: 58
  });

  const [turn, setTurn] = useState<number>(1);
  const [year, setYear] = useState<number>(2026);
  const [newsTicker, setNewsTicker] = useState<string>('مجلس شورای ملی لایحه بودجه سال جدید را تصویب کرد.');
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);

  // Ready-to-play Political Decision Cards
  const [cards, setCards] = useState<PoliticalCard[]>([
    {
      id: 'c1',
      title: 'بحران انرژی و یارانه‌های سوخت',
      advisor: 'دکتر جمشیدی',
      role: 'وزیر اقتصاد و دارایی',
      scenario: 'خزانه دولت به دلیل یارانه‌های سنگین انرژی تحت فشار شدید است. آیا یارانه‌ها را کاهش داده و منابع را صرف زیرساخت‌های پاک کنیم، یا برای حفظ رضایت عمومی قیمت را ثابت نگه داریم؟',
      choiceA: {
        text: 'کاهش یارانه‌ها و سرمایه‌گذاری سبز',
        effects: { approval: -8, treasury: +18, liberty: 0, diplomacy: +5 }
      },
      choiceB: {
        text: 'تثبیت قیمت‌ها برای رفاه مردم',
        effects: { approval: +10, treasury: -15, liberty: +2, diplomacy: -2 }
      }
    },
    {
      id: 'c2',
      title: 'مذاکرات صلح و پیمان دفاعی منطقه‌ای',
      advisor: 'سردار نامدار',
      role: 'فرمانده ستاد کل نیروهای مسلح',
      scenario: 'کشور همسایه پیشنهاد امضای یک پیمان عدم تجاوز و بازرسی متقابل تسلیحاتی داده است. ژنرال‌ها نگران افشای توان بازدارندگی هستند.',
      choiceA: {
        text: 'امضای معاهده صلح بین‌المللی',
        effects: { approval: +6, military: -12, treasury: +8, diplomacy: +22 }
      },
      choiceB: {
        text: 'رد معاهده و رزمایش موشکی جدید',
        effects: { approval: +4, military: +15, treasury: -10, diplomacy: -16 }
      }
    },
    {
      id: 'c3',
      title: 'لایحه آزادی مطبوعات و شفافیت مالی',
      advisor: 'خانم مهندس آریا',
      role: 'نماینده فراکسیون مستقلین',
      scenario: 'جامعه مدنی خواستار لغو مجوزهای انحصاری رسانه‌ها و انتشار عمومی دارایی‌های کلیه وزرا و کارگزاران دولتی است.',
      choiceA: {
        text: 'تصویب کامل لایحه شفافیت',
        effects: { approval: +15, liberty: +18, treasury: +4, military: -5 }
      },
      choiceB: {
        text: 'رد لایحه به بهانه امنیت ملی',
        effects: { approval: -14, liberty: -15, military: +6, diplomacy: -8 }
      }
    },
    {
      id: 'c4',
      title: 'وام کلان از صندوق بین‌المللی',
      advisor: 'پروفسور صدر',
      role: 'رئیس کل بانک مرکزی',
      scenario: 'برای مهار تورم نیاز به ۱۰ میلیارد دلار ارز داریم، اما شرط وام اصلاحات ریاضتی شدید در استخدام‌های دولتی است.',
      choiceA: {
        text: 'پذیرش وام با شرایط ریاضتی',
        effects: { treasury: +25, approval: -12, liberty: -4, diplomacy: +10 }
      },
      choiceB: {
        text: 'اتکا به توان داخلی و اقتصاد مقاومتی',
        effects: { treasury: -10, approval: +6, liberty: +2, diplomacy: -6 }
      }
    }
  ]);

  const [currentCardIdx, setCurrentCardIdx] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'play' | 'builder' | 'code'>('play');

  // Custom Card Creator Inputs
  const [newTitle, setNewTitle] = useState('');
  const [newAdvisor, setNewAdvisor] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newScenario, setNewScenario] = useState('');
  const [newA_Text, setNewA_Text] = useState('');
  const [newB_Text, setNewB_Text] = useState('');

  // Handle Player Choice
  const handleMakeChoice = (choice: 'A' | 'B') => {
    if (gameOverReason) return;
    const card = cards[currentCardIdx];
    if (!card) return;

    soundSynth.playLaser();
    const branch = choice === 'A' ? card.choiceA : card.choiceB;
    const updated = { ...metrics };

    for (const [key, delta] of Object.entries(branch.effects)) {
      if (updated[key] !== undefined) {
        updated[key] = Math.max(0, Math.min(100, updated[key] + delta));
      }
    }

    setMetrics(updated);
    setTurn(t => t + 1);
    if ((turn + 1) % 4 === 0) setYear(y => y + 1);

    // Dynamic News Ticker
    if (choice === 'A') {
      setNewsTicker(`دولت تصمیم گرفت: "${branch.text}" اجرایی شد.`);
    } else {
      setNewsTicker(`واکنش رسانه‌ها به تصمیم کابینه: "${branch.text}".`);
    }

    // Check Win/Loss conditions
    if (updated.approval <= 15) {
      setGameOverReason('سقوط دولت با قیام عمومی و استیضاح در مجلس به دلیل افت شدید محبوبیت!');
      soundSynth.playExplosion();
      return;
    }
    if (updated.treasury <= 5) {
      setGameOverReason('ورشکستگی کامل خزانه ملی و توقف خدمات عمومی کشور!');
      soundSynth.playExplosion();
      return;
    }
    if (updated.military <= 10) {
      setGameOverReason('کودتای نظامیان یا تسلیم در برابر تهدید خارجی به دلیل ضعف نیروهای مسلح!');
      soundSynth.playExplosion();
      return;
    }

    // Next Card
    setCurrentCardIdx((currentCardIdx + 1) % cards.length);
  };

  // Reset Political Simulation
  const handleResetGame = () => {
    setMetrics({
      approval: 68,
      treasury: 55,
      military: 60,
      liberty: 62,
      diplomacy: 58
    });
    setTurn(1);
    setYear(2026);
    setCurrentCardIdx(0);
    setGameOverReason(null);
    setNewsTicker('دولت جدید کار خود را آغاز کرد. اعضای کابینه آماده دریافت احکام هستند.');
    soundSynth.playPowerup();
  };

  // Add Custom Political Scenario
  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newScenario.trim()) return;

    soundSynth.playCoin();
    const newCard: PoliticalCard = {
      id: 'custom_' + Date.now(),
      title: newTitle.trim(),
      advisor: newAdvisor.trim() || 'مشاور ویژه',
      role: newRole.trim() || 'دبیر شورای عالی',
      scenario: newScenario.trim(),
      choiceA: {
        text: newA_Text.trim() || 'پذیرش پیشنهاد',
        effects: { approval: +8, treasury: -6, military: +4 }
      },
      choiceB: {
        text: newB_Text.trim() || 'رد قاطع پیشنهاد',
        effects: { approval: -4, treasury: +8, liberty: -4 }
      }
    };

    setCards(prev => [...prev, newCard]);
    setNewTitle('');
    setNewAdvisor('');
    setNewRole('');
    setNewScenario('');
    setNewA_Text('');
    setNewB_Text('');
    setActiveTab('play');
    addLog(`کارت سناریوی سیاسی جدید اضافه شد: ${newCard.title}`, 'info');
  };

  // Convert to Real Code
  const convertPoliticalGameToCode = () => {
    soundSynth.playPowerup();
    const code = `// === Political Statecraft Game Engine ===
// Generated by AetherForge Political No-Code Studio

class PoliticalGame {
  constructor() {
    this.metrics = ${JSON.stringify(metrics, null, 2)};
    this.cards = ${JSON.stringify(cards, null, 2)};
    this.currentIdx = 0;
    this.turn = 1;
    this.year = 2026;
    console.log("Political Statecraft engine ready. Turn: 1");
  }

  makeDecision(choice) {
    const card = this.cards[this.currentIdx];
    const effects = choice === 'A' ? card.choiceA.effects : card.choiceB.effects;
    
    for (const [key, val] of Object.entries(effects)) {
      if (this.metrics[key] !== undefined) {
        this.metrics[key] = Math.max(0, Math.min(100, this.metrics[key] + val));
      }
    }
    
    this.turn++;
    this.currentIdx = (this.currentIdx + 1) % this.cards.length;
    return this.metrics;
  }
}

const game = new PoliticalGame();
console.log("Initial state:", game.metrics);
`;

    createNewFile('/src/political_game_engine.js', code);
    setWorkspace('code');
    addLog('Political Strategy Game converted to clean JavaScript in VS Code!', 'info');
  };

  const currentCard = cards[currentCardIdx];

  return (
    <div className="flex-1 flex flex-col bg-[#111317] relative overflow-hidden h-full">
      {/* Top Bar Navigation */}
      <div className="h-10 bg-[#171922] border-b border-[#242735] flex items-center justify-between px-3 text-xs shrink-0 select-none">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('play')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded cursor-pointer ${
              activeTab === 'play'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Landmark className="w-3.5 h-3.5 text-amber-400" />
            <span>میز فرماندهی و تصمیم‌گیری (Play)</span>
          </button>

          <button
            onClick={() => setActiveTab('builder')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded cursor-pointer ${
              activeTab === 'builder'
                ? 'bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/40'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>افزودن سناریوی سیاسی (Builder)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={convertPoliticalGameToCode}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-medium cursor-pointer shadow-sm"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>تبدیل بازی سیاسی به کد واقعی</span>
          </button>

          <button
            onClick={handleResetGame}
            className="p-1 rounded bg-[#242735] hover:bg-[#2e3244] text-gray-400 hover:text-white cursor-pointer"
            title="شروع مجدد دوره ریاست"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-y-auto p-4 max-w-4xl mx-auto w-full">
        {/* National Metrics Dashboard Header */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-4">
          {/* Approval */}
          <div className="bg-[#171922] p-2.5 rounded-xl border border-[#262a3a] flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-cyan-400" /> محبوبیت مردمی
              </span>
              <span className="font-mono font-bold text-cyan-300">{metrics.approval}%</span>
            </div>
            <div className="w-full bg-[#101217] rounded-full h-1.5 overflow-hidden">
              <div className="bg-cyan-400 h-full rounded-full transition-all duration-300" style={{ width: `${metrics.approval}%` }} />
            </div>
          </div>

          {/* Treasury */}
          <div className="bg-[#171922] p-2.5 rounded-xl border border-[#262a3a] flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
              <span className="flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" /> خزانه ملی
              </span>
              <span className="font-mono font-bold text-amber-300">{metrics.treasury}%</span>
            </div>
            <div className="w-full bg-[#101217] rounded-full h-1.5 overflow-hidden">
              <div className="bg-amber-400 h-full rounded-full transition-all duration-300" style={{ width: `${metrics.treasury}%` }} />
            </div>
          </div>

          {/* Military */}
          <div className="bg-[#171922] p-2.5 rounded-xl border border-[#262a3a] flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-red-400" /> توان دفاعی
              </span>
              <span className="font-mono font-bold text-red-300">{metrics.military}%</span>
            </div>
            <div className="w-full bg-[#101217] rounded-full h-1.5 overflow-hidden">
              <div className="bg-red-400 h-full rounded-full transition-all duration-300" style={{ width: `${metrics.military}%` }} />
            </div>
          </div>

          {/* Civil Liberty */}
          <div className="bg-[#171922] p-2.5 rounded-xl border border-[#262a3a] flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
              <span className="flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-emerald-400" /> آزادی‌های مدنی
              </span>
              <span className="font-mono font-bold text-emerald-300">{metrics.liberty}%</span>
            </div>
            <div className="w-full bg-[#101217] rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full transition-all duration-300" style={{ width: `${metrics.liberty}%` }} />
            </div>
          </div>

          {/* Diplomacy */}
          <div className="bg-[#171922] p-2.5 rounded-xl border border-[#262a3a] flex flex-col justify-between shadow-md col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
              <span className="flex items-center gap-1">
                <Globe2 className="w-3.5 h-3.5 text-indigo-400" /> دیپلماسی
              </span>
              <span className="font-mono font-bold text-indigo-300">{metrics.diplomacy}%</span>
            </div>
            <div className="w-full bg-[#101217] rounded-full h-1.5 overflow-hidden">
              <div className="bg-indigo-400 h-full rounded-full transition-all duration-300" style={{ width: `${metrics.diplomacy}%` }} />
            </div>
          </div>
        </div>

        {/* Live News Ticker */}
        <div className="bg-[#151720] border border-[#242838] px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs text-gray-300 mb-4 select-none">
          <Newspaper className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[10px] uppercase font-bold text-amber-400 shrink-0">اخبار فوری:</span>
          <span className="truncate">{newsTicker}</span>
          <div className="mr-auto font-mono text-gray-500 text-[11px] shrink-0">
            سال {year} | نوبت {turn}
          </div>
        </div>

        {/* TAB 1: INTERACTIVE PLAYTESTING */}
        {activeTab === 'play' && (
          <div className="flex-1 flex flex-col items-center justify-center">
            {gameOverReason ? (
              <div className="bg-[#1d1f2b] p-6 rounded-2xl border-2 border-red-500/50 text-center max-w-lg shadow-2xl">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-2">پایان دوره حکومت</h3>
                <p className="text-gray-300 text-xs leading-relaxed mb-4">{gameOverReason}</p>
                <button
                  onClick={handleResetGame}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs cursor-pointer shadow-lg shadow-cyan-600/30"
                >
                  شروع دوباره بازی سیاسی
                </button>
              </div>
            ) : currentCard ? (
              <div className="w-full max-w-md bg-[#181a24] rounded-2xl border-2 border-[#2f3448] overflow-hidden shadow-2xl flex flex-col">
                {/* Card Header & Advisor */}
                <div className="bg-gradient-to-r from-[#212433] to-[#1c1f2e] p-4 border-b border-[#2a2f42] flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-300 text-sm">
                    {currentCard.advisor.slice(0, 1)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs">{currentCard.title}</h3>
                    <span className="text-[11px] text-gray-400">
                      {currentCard.advisor} — <span className="text-amber-400">{currentCard.role}</span>
                    </span>
                  </div>
                </div>

                {/* Scenario Description */}
                <div className="p-4 flex-1">
                  <p className="text-gray-200 text-xs leading-relaxed">{currentCard.scenario}</p>
                </div>

                {/* Decisions Actions (Choice A vs Choice B) */}
                <div className="p-3 border-t border-[#252838] bg-[#141620] grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleMakeChoice('A')}
                    className="p-3 rounded-xl bg-[#202434] hover:bg-emerald-600/25 border border-[#32384e] hover:border-emerald-500/60 text-start cursor-pointer transition-all active:scale-95"
                  >
                    <span className="block font-bold text-emerald-400 text-xs mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> گزینه الف
                    </span>
                    <span className="text-[11px] text-gray-300 leading-snug block">{currentCard.choiceA.text}</span>
                  </button>

                  <button
                    onClick={() => handleMakeChoice('B')}
                    className="p-3 rounded-xl bg-[#202434] hover:bg-red-600/25 border border-[#32384e] hover:border-red-500/60 text-start cursor-pointer transition-all active:scale-95"
                  >
                    <span className="block font-bold text-red-400 text-xs mb-1 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> گزینه ب
                    </span>
                    <span className="text-[11px] text-gray-300 leading-snug block">{currentCard.choiceB.text}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 2: NO-CODE SCENARIO BUILDER */}
        {activeTab === 'builder' && (
          <form onSubmit={handleAddCard} className="bg-[#181a24] p-4 rounded-xl border border-[#2b2f42] space-y-3 text-xs">
            <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>ساخت سناریو و لایحه سیاسی جدید بدون کدنویسی</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-gray-400 text-[11px] block mb-1">عنوان لایحه یا بحران:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: لایحه اصلاحات ارزی و مالیات بر سرمایه"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#101218] border border-[#2b2f3e] rounded text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-[11px] block mb-1">نام مشاور یا مقام مربوطه:</label>
                <input
                  type="text"
                  placeholder="مثال: دکتر راد"
                  value={newAdvisor}
                  onChange={e => setNewAdvisor(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#101218] border border-[#2b2f3e] rounded text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-[11px] block mb-1">سمت سیاسی:</label>
                <input
                  type="text"
                  placeholder="مثال: رئیس دیوان محاسبات"
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#101218] border border-[#2b2f3e] rounded text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-[11px] block mb-1">متن شرح ماجرا و دوراهی تصمیم‌گیری:</label>
              <textarea
                rows={3}
                required
                placeholder="توضیح کامل سناریو برای رئیس جمهور یا نخست‌وزیر..."
                value={newScenario}
                onChange={e => setNewScenario(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#101218] border border-[#2b2f3e] rounded text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="bg-[#13151c] p-2.5 rounded-lg border border-[#262a38]">
                <span className="font-semibold text-emerald-400 block mb-1">متن تصمیم گزینه الف:</span>
                <input
                  type="text"
                  placeholder="مثال: تصویب قانون و برخورد قضایی قاطع"
                  value={newA_Text}
                  onChange={e => setNewA_Text(e.target.value)}
                  className="w-full px-2.5 py-1 bg-[#0d0f14] border border-[#2b2f3e] rounded text-white text-xs mb-2"
                />
                <span className="text-[10px] text-gray-500">اثر خودکار: افزایش محبوبیت و شفافیت</span>
              </div>

              <div className="bg-[#13151c] p-2.5 rounded-lg border border-[#262a38]">
                <span className="font-semibold text-red-400 block mb-1">متن تصمیم گزینه ب:</span>
                <input
                  type="text"
                  placeholder="مثال: حفظ وضع موجود و سازش سیاسی"
                  value={newB_Text}
                  onChange={e => setNewB_Text(e.target.value)}
                  className="w-full px-2.5 py-1 bg-[#0d0f14] border border-[#2b2f3e] rounded text-white text-xs mb-2"
                />
                <span className="text-[10px] text-gray-500">اثر خودکار: حفظ بودجه و نفوذ ارتش</span>
              </div>
            </div>

            <button
              type="submit"
              className="mt-3 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium cursor-pointer shadow-md shadow-cyan-600/20"
            >
              ذخیره و افزودن سناریو به بازی
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
