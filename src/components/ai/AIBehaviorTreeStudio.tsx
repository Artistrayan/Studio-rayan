/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  AIStateNode,
  AITransition,
  AIEnemyInstance,
  DEFAULT_AI_STATES,
  DEFAULT_AI_TRANSITIONS
} from '../../types/aiStateMachine';
import { soundSynth } from '../../services/audio/synth';
import {
  Bot,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Activity,
  ShieldAlert,
  Compass,
  ArrowRight,
  Eye,
  Crosshair,
  Sliders
} from 'lucide-react';

export const AIBehaviorTreeStudio: React.FC = () => {
  const [states, setStates] = useState<AIStateNode[]>(() => [...DEFAULT_AI_STATES]);
  const [transitions, setTransitions] = useState<AITransition[]>(() => [...DEFAULT_AI_TRANSITIONS]);
  const [selectedStateId, setSelectedStateId] = useState<string>('state_patrol');
  const [isSimulating, setIsSimulating] = useState<boolean>(true);

  // Live simulation arena state
  const [playerDistance, setPlayerDistance] = useState<number>(200);
  const [enemyHealth, setEnemyHealth] = useState<number>(100);
  const [enemy, setEnemy] = useState<AIEnemyInstance>({
    id: 'enemy_goblin',
    name: 'شکارچی سایه (Shadow Stalker)',
    x: 120,
    y: 150,
    currentStateId: 'state_patrol',
    health: 100,
    maxHealth: 100,
    patrolOriginX: 120,
    patrolRange: 140,
    direction: 1,
    alertLevel: 10,
    targetDistance: 200,
    lastAction: 'گشت‌زنی آرام'
  });

  const activeState = states.find(s => s.id === enemy.currentStateId) || states[0];

  // Simulation tick for state machine transition evaluation
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setEnemy(prev => {
        let nextStateId = prev.currentStateId;
        let action = prev.lastAction;
        let alertLvl = prev.alertLevel;

        // Evaluate transitions from current state
        const availableTransitions = transitions.filter(t => t.fromStateId === prev.currentStateId);

        for (const t of availableTransitions) {
          if (t.condition === 'health_low' && enemyHealth <= (t.conditionValue || 25)) {
            nextStateId = t.toStateId;
            action = 'هشدار جان کم! فرار در مسیر خلاف بازیکن';
            alertLvl = 100;
            break;
          }
          if (t.condition === 'player_spotted' && playerDistance < 180) {
            nextStateId = t.toStateId;
            action = 'رویت بازیکن! شروع تعقیب سریع با شتاب';
            alertLvl = 80;
            soundSynth.playLaser();
            break;
          }
          if (t.condition === 'player_in_range' && playerDistance < 45) {
            nextStateId = t.toStateId;
            action = 'ضربه حمله نزدیک وارد شد!';
            alertLvl = 100;
            soundSynth.playExplosion();
            break;
          }
          if (t.condition === 'player_escaped' && playerDistance > 240) {
            nextStateId = t.toStateId;
            action = 'بازیکن فرار کرد؛ بازگشت به گشت‌زنی روتین';
            alertLvl = 20;
            break;
          }
        }

        // Movement simulation based on active state
        let nx = prev.x;
        let dir = prev.direction;
        if (nextStateId === 'state_patrol') {
          nx += dir * 2.2;
          if (Math.abs(nx - prev.patrolOriginX) > prev.patrolRange) {
            dir = (dir * -1) as 1 | -1;
          }
        } else if (nextStateId === 'state_chase') {
          nx += (playerDistance > 0 ? 1 : -1) * 4.2;
        } else if (nextStateId === 'state_flee') {
          nx -= (playerDistance > 0 ? 1 : -1) * 5.0;
        }

        return {
          ...prev,
          currentStateId: nextStateId,
          x: nx,
          direction: dir,
          alertLevel: alertLvl,
          lastAction: action,
          targetDistance: playerDistance,
          health: enemyHealth
        };
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isSimulating, transitions, playerDistance, enemyHealth]);

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-[#121316] text-[#e1e4ea] select-none overflow-hidden">
      {/* Left: Visual State Nodes Editor */}
      <div className="w-full md:w-80 bg-[#161821] border-b md:border-b-0 md:border-r border-[#262937] p-4 flex flex-col shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#292e3e] mb-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">ماشین حالت هوش مصنوعی (FSM)</h3>
          </div>
        </div>

        {/* State Nodes List */}
        <p className="text-gray-400 text-xs mb-2">وضعیت‌های رفتار دشمن (States):</p>
        <div className="space-y-2 mb-4">
          {states.map(s => {
            const isCurrent = enemy.currentStateId === s.id;
            const isSelected = selectedStateId === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setSelectedStateId(s.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isCurrent
                    ? 'ring-2 ring-cyan-400 bg-cyan-500/10 border-cyan-500'
                    : isSelected
                    ? 'bg-[#222533] border-indigo-500'
                    : 'bg-[#1b1e28] border-[#2d3142] hover:bg-[#232735]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="font-semibold text-xs text-white">{s.name}</span>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold animate-pulse">
                      در حال اجرا
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">{s.actionText}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400 font-mono">
                  <span>سرعت: {s.speed}</span>
                  <span>دید: {s.visionRadius}px</span>
                  <span>حمله: {s.attackRange}px</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Transition Rules */}
        <div className="pt-3 border-t border-[#292e3e] space-y-2 text-xs">
          <span className="font-bold text-gray-200 flex items-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            <span>شرط‌های گذار (Transitions):</span>
          </span>
          <div className="space-y-1.5">
            {transitions.map(tr => (
              <div key={tr.id} className="p-2 rounded-lg bg-[#14161f] border border-[#2b3042] text-[11px]">
                <div className="flex items-center justify-between text-gray-300 font-medium mb-1">
                  <span className="text-cyan-400">{states.find(s => s.id === tr.fromStateId)?.name.split(' ')[0]}</span>
                  <span className="text-gray-500">➔</span>
                  <span className="text-amber-400">{states.find(s => s.id === tr.toStateId)?.name.split(' ')[0]}</span>
                </div>
                <span className="text-gray-400">{tr.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right / Center: Interactive Live Arena & Distance Tester */}
      <div className="flex-1 flex flex-col bg-[#0b0c10] overflow-hidden">
        {/* Top Arena Header */}
        <div className="h-12 bg-[#151720] border-b border-[#252836] flex items-center justify-between px-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-rose-400" />
              <span>میدان شبیه‌سازی زنده هوش مصنوعی</span>
            </span>
            <span className="text-gray-500">|</span>
            <span className="text-cyan-400 font-mono text-[11px]">
              وضعیت فعال: {activeState.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isSimulating
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isSimulating ? 'توقف شبیه‌سازی' : 'شروع تست رفتار'}</span>
            </button>
          </div>
        </div>

        {/* Arena Viewport */}
        <div className="flex-1 relative flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#0b0c11] to-[#12141c]">
          {/* Visual Enemy Character in Arena */}
          <div className="relative w-full max-w-2xl h-64 bg-[#141722] rounded-2xl border border-[#2b3042] overflow-hidden shadow-2xl flex items-center justify-center p-6">
            {/* Arena Grid line */}
            <div className="absolute inset-x-0 bottom-12 h-1 bg-[#282d3e]" />

            {/* AI Vision Cone / Radar */}
            <div
              className="absolute transition-all duration-300 rounded-full border border-dashed opacity-30 pointer-events-none"
              style={{
                width: activeState.visionRadius * 2,
                height: activeState.visionRadius * 2,
                borderColor: activeState.color,
                backgroundColor: `${activeState.color}15`
              }}
            />

            {/* AI Enemy Node */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 border-2"
                style={{
                  backgroundColor: `${activeState.color}30`,
                  borderColor: activeState.color,
                  boxShadow: `0 0 24px ${activeState.color}50`
                }}
              >
                <Bot className="w-8 h-8" style={{ color: activeState.color }} />
              </div>
              <span className="font-bold text-xs text-white mt-2">{enemy.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e2330] text-gray-300 mt-1 border border-[#343b50]">
                {activeState.name}
              </span>
            </div>

            {/* Status Callout Banner */}
            <div className="absolute top-4 inset-x-4 bg-[#1b1e2c]/90 backdrop-blur p-2.5 rounded-xl border border-[#333a50] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-gray-300">عملیات جاری هوش مصنوعی:</span>
                <span className="text-cyan-300 font-semibold">{enemy.lastAction}</span>
              </div>
              <span className="font-mono text-amber-400">سطح هشدار: {enemy.alertLevel}%</span>
            </div>
          </div>

          {/* Interactive Player Controls to trigger AI transitions */}
          <div className="w-full max-w-2xl mt-4 bg-[#171a25] p-4 rounded-xl border border-[#282c3c] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Slider 1: Distance between player and enemy */}
            <div>
              <div className="flex justify-between text-gray-300 mb-1.5 font-medium">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>فاصله فرضی تا بازیکن (Distance):</span>
                </span>
                <span className="font-mono text-cyan-400 font-bold">{playerDistance} px</span>
              </div>
              <input
                type="range"
                min="10"
                max="350"
                value={playerDistance}
                onChange={e => setPlayerDistance(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
                <span>تماس حمله (&lt;۴۵)</span>
                <span>شعاع رویت (۱۸۰)</span>
                <span>فرار (&gt;۲۶۰)</span>
              </div>
            </div>

            {/* Slider 2: Enemy Health */}
            <div>
              <div className="flex justify-between text-gray-300 mb-1.5 font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>سطح سلامتی دشمن (Health):</span>
                </span>
                <span className="font-mono text-rose-400 font-bold">{enemyHealth}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={enemyHealth}
                onChange={e => setEnemyHealth(Number(e.target.value))}
                className="w-full accent-rose-400"
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
                <span>هشدار جان کم (&lt;۲۵)</span>
                <span>سلامتی کامل (۱۰۰)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
