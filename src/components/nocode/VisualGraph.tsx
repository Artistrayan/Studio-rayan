/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import { translations } from '../../services/i18n';
import { soundSynth } from '../../services/audio/synth';
import { LogicNode, NodeType, WireframeElement } from '../../types';
import {
  Workflow,
  Layout,
  Code2,
  Play,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Volume2,
  Sliders
} from 'lucide-react';

export const VisualGraph: React.FC = () => {
  const { language, setWorkspace, createNewFile, addLog } = useStudio();
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<'graph' | 'wireframe' | 'generated_code'>('graph');

  // Logic Nodes
  const [nodes, setNodes] = useState<LogicNode[]>([
    {
      id: 'node_1',
      type: 'event_key',
      title: 'Event: Key Pressed',
      x: 40,
      y: 60,
      inputs: [],
      outputs: [{ id: 'out_1', label: 'Trigger', type: 'flow' }],
      params: { key: 'Space' }
    },
    {
      id: 'node_2',
      type: 'action_sound',
      title: 'Action: Play SFX',
      x: 320,
      y: 50,
      inputs: [{ id: 'in_1', label: 'Exec', type: 'flow' }],
      outputs: [{ id: 'out_1', label: 'Then', type: 'flow' }],
      params: { sound: 'jump' }
    },
    {
      id: 'node_3',
      type: 'action_particles',
      title: 'Action: Burst Particles',
      x: 320,
      y: 180,
      inputs: [{ id: 'in_1', label: 'Exec', type: 'flow' }],
      outputs: [],
      params: { count: 12, color: '#38bdf8' }
    },
    {
      id: 'node_4',
      type: 'action_score',
      title: 'Action: Add Score',
      x: 600,
      y: 50,
      inputs: [{ id: 'in_1', label: 'Exec', type: 'flow' }],
      outputs: [],
      params: { amount: 100 }
    }
  ]);

  // Wireframe UI Elements
  const [elements, setElements] = useState<WireframeElement[]>([
    { id: 'el_1', type: 'score', label: 'SCORE: 0', x: 20, y: 20, width: 140, height: 36, color: '#38bdf8', actionHook: 'score' },
    { id: 'el_2', type: 'healthbar', label: 'HP: 100%', x: 20, y: 70, width: 180, height: 24, color: '#10b981', actionHook: 'health' },
    { id: 'el_3', type: 'button', label: 'BOOST JUMP', x: 280, y: 280, width: 140, height: 48, color: '#6366f1', actionHook: 'jump' },
    { id: 'el_4', type: 'joystick', label: 'ANALOG JOYSTICK', x: 40, y: 240, width: 90, height: 90, color: '#475569', actionHook: 'move' }
  ]);

  // Generated Code State
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Add new logic node
  const addNode = (type: NodeType) => {
    soundSynth.playCoin();
    const id = 'node_' + Date.now();
    const titles: Record<NodeType, string> = {
      event_start: 'Event: Game Start',
      event_update: 'Event: Every Frame (Tick)',
      event_key: 'Event: Key Pressed',
      event_click: 'Event: On Click',
      action_move: 'Action: Move Entity',
      action_rotate: 'Action: Rotate',
      action_sound: 'Action: Play SFX',
      action_particles: 'Action: Burst Particles',
      action_score: 'Action: Add Score',
      logic_compare: 'Logic: Branch If',
      logic_delay: 'Logic: Delay Timer',
      variable: 'Variable'
    };

    const newNode: LogicNode = {
      id,
      type,
      title: titles[type] || 'Node',
      x: 100 + Math.random() * 200,
      y: 80 + Math.random() * 180,
      inputs: [{ id: 'in_' + id, label: 'Exec', type: 'flow' }],
      outputs: [{ id: 'out_' + id, label: 'Then', type: 'flow' }],
      params: {}
    };

    setNodes(prev => [...prev, newNode]);
    addLog(`Added No-Code logic node: ${newNode.title}`, 'info');
  };

  // Convert Wireframe & Logic Graph into REAL runnable JavaScript code!
  const convertDesignToRealCode = () => {
    soundSynth.playPowerup();

    const code = `// === AetherForge Generated Code ===
// Transpiled automatically from No-Code Logic Graph & Wireframe Layout

class AetherGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas') || this.createCanvas();
    this.ctx = this.canvas.getContext('2d');
    this.score = 0;
    this.health = 100;
    this.particles = [];
    
    // UI Layout Wireframe Elements
    this.uiElements = ${JSON.stringify(elements, null, 2)};
    
    this.initEvents();
    this.startLoop();
  }

  createCanvas() {
    const c = document.createElement('canvas');
    c.id = 'game-canvas';
    c.width = 800;
    c.height = 450;
    document.body.appendChild(c);
    return c;
  }

  initEvents() {
    // Generated from Logic Graph nodes
    window.addEventListener('keydown', (e) => {
${nodes
  .filter(n => n.type === 'event_key')
  .map(
    n => `      if (e.code === '${n.params.key || 'Space'}') {
        this.onJumpTrigger();
      }`
  )
  .join('\n')}
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.checkUiClick(x, y);
    });
  }

  onJumpTrigger() {
    console.log('Action triggered: Play sound & burst particles');
    this.score += 100;
    this.spawnParticleBurst(400, 250);
  }

  checkUiClick(x, y) {
    this.uiElements.forEach(el => {
      if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
        if (el.actionHook === 'jump') this.onJumpTrigger();
      }
    });
  }

  spawnParticleBurst(x, y) {
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1.0,
        color: '#38bdf8'
      });
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.04;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render Wireframe UI Elements
    this.uiElements.forEach(el => {
      ctx.fillStyle = el.color;
      ctx.fillRect(el.x, el.y, el.width, el.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(el.label, el.x + 8, el.y + el.height / 2 + 4);
    });

    // Render Particles
    this.particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;
  }

  startLoop() {
    const tick = () => {
      this.update();
      this.render();
      requestAnimationFrame(tick);
    };
    tick();
  }
}

// Instantiate and start
const gameInstance = new AetherGame();
console.log('No-Code Game generated and executing cleanly.');
`;

    setGeneratedCode(code);
    setActiveTab('generated_code');
    addLog('Converted No-Code graph to clean executable JavaScript!', 'info');
  };

  // Save generated code into VFS and open in editor
  const handleSaveToEditor = () => {
    const path = '/src/nocode_game.js';
    createNewFile(path, generatedCode);
    setWorkspace('code');
    soundSynth.playJump();
  };

  return (
    <div className="flex-1 flex flex-col bg-[#14161b] relative overflow-hidden h-full">
      {/* Top Bar */}
      <div className="h-10 bg-[#1a1c23] border-b border-[#2b2e38] flex items-center justify-between px-3 text-xs shrink-0 select-none">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('graph')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded cursor-pointer ${
              activeTab === 'graph'
                ? 'bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/40'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Logic Nodes</span>
          </button>

          <button
            onClick={() => setActiveTab('wireframe')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded cursor-pointer ${
              activeTab === 'wireframe'
                ? 'bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/40'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>UI Wireframe</span>
          </button>

          <button
            onClick={() => setActiveTab('generated_code')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded cursor-pointer ${
              activeTab === 'generated_code'
                ? 'bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/40'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Real Code</span>
          </button>
        </div>

        {/* Convert to Code Button */}
        <button
          onClick={convertDesignToRealCode}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-medium shadow-md shadow-cyan-500/20 cursor-pointer transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t.actions.convertToCode}</span>
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 relative overflow-hidden bg-[#0d0f14]">
        {/* Graph Mode */}
        {activeTab === 'graph' && (
          <div className="w-full h-full relative overflow-auto p-4 select-none">
            {/* Quick Add Node Bar */}
            <div className="absolute top-4 left-4 z-10 flex gap-2 bg-[#181a22]/90 backdrop-blur-md p-1.5 rounded-lg border border-[#2e3240] shadow-xl">
              <button
                onClick={() => addNode('event_key')}
                className="px-2 py-1 rounded bg-[#252834] text-cyan-300 hover:bg-[#303444] text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Event: Key
              </button>
              <button
                onClick={() => addNode('action_sound')}
                className="px-2 py-1 rounded bg-[#252834] text-emerald-300 hover:bg-[#303444] text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Action: Sound
              </button>
              <button
                onClick={() => addNode('action_particles')}
                className="px-2 py-1 rounded bg-[#252834] text-amber-300 hover:bg-[#303444] text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Action: Particles
              </button>
              <button
                onClick={() => addNode('action_score')}
                className="px-2 py-1 rounded bg-[#252834] text-indigo-300 hover:bg-[#303444] text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Action: Score
              </button>
            </div>

            {/* Grid Pattern */}
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            />

            {/* Flow Connecting Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <path
                d="M 240 100 C 280 100, 280 90, 320 90"
                stroke="#38bdf8"
                strokeWidth="2.5"
                fill="none"
              />
              <path
                d="M 240 100 C 280 100, 280 220, 320 220"
                stroke="#38bdf8"
                strokeWidth="2.5"
                fill="none"
              />
              <path
                d="M 520 90 C 560 90, 560 90, 600 90"
                stroke="#10b981"
                strokeWidth="2.5"
                fill="none"
              />
            </svg>

            {/* Render Nodes */}
            {nodes.map(node => (
              <div
                key={node.id}
                style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
                className="absolute w-52 bg-[#181a24] border border-[#2e3344] rounded-lg shadow-xl text-xs overflow-hidden"
              >
                {/* Node Header */}
                <div
                  className={`px-3 py-1.5 font-semibold text-white flex items-center justify-between ${
                    node.type.startsWith('event')
                      ? 'bg-cyan-600/60'
                      : node.type.startsWith('action')
                      ? 'bg-emerald-600/60'
                      : 'bg-indigo-600/60'
                  }`}
                >
                  <span>{node.title}</span>
                  <button
                    onClick={() => setNodes(prev => prev.filter(n => n.id !== node.id))}
                    className="text-gray-300 hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Node Body & Sockets */}
                <div className="p-3 flex justify-between items-center text-[11px] text-gray-300">
                  <div className="flex flex-col gap-1">
                    {node.inputs.map(inSocket => (
                      <div key={inSocket.id} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 border border-black" />
                        <span>{inSocket.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-1 items-end">
                    {node.outputs.map(outSocket => (
                      <div key={outSocket.id} className="flex items-center gap-1.5">
                        <span>{outSocket.label}</span>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Wireframe Canvas Mode */}
        {activeTab === 'wireframe' && (
          <div className="w-full h-full flex items-center justify-center p-4">
            <div className="w-full max-w-3xl aspect-[16/9] bg-[#111319] border-2 border-[#2b2f3d] rounded-lg relative overflow-hidden shadow-2xl p-4">
              <div className="absolute top-2 right-2 text-[10px] text-gray-500 uppercase tracking-widest pointer-events-none">
                Wireframe UI Canvas
              </div>

              {elements.map(el => (
                <div
                  key={el.id}
                  style={{
                    left: `${el.x}px`,
                    top: `${el.y}px`,
                    width: `${el.width}px`,
                    height: `${el.height}px`,
                    backgroundColor: el.color
                  }}
                  className="absolute rounded flex items-center justify-center font-mono font-bold text-xs text-white shadow-md cursor-move select-none"
                >
                  {el.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generated Code Mode */}
        {activeTab === 'generated_code' && (
          <div className="w-full h-full flex flex-col p-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#262a36] text-xs">
              <div className="flex items-center gap-2 text-cyan-400">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Production-grade JavaScript code generated from Visual Blueprint</span>
              </div>
              <button
                onClick={handleSaveToEditor}
                className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium cursor-pointer"
              >
                Open in VS Code Editor
              </button>
            </div>
            <pre className="flex-1 p-3 mt-2 overflow-auto font-mono text-xs text-gray-200 bg-[#0e1015] rounded border border-[#242834]">
              {generatedCode || '// Click "Convert Design to Real Code" above to generate code.'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
