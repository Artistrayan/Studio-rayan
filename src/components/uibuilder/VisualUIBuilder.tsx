/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  UIComponent,
  UIScreen,
  createInitialScreen
} from '../../types/uiBuilder';
import { soundSynth } from '../../services/audio/synth';
import {
  Layout,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  Code2,
  Smartphone,
  Tablet,
  Monitor,
  Eye,
  Sliders,
  Sparkles
} from 'lucide-react';

export const VisualUIBuilder: React.FC = () => {
  const [screen, setScreen] = useState<UIScreen>(() => createInitialScreen());
  const [selectedCompId, setSelectedCompId] = useState<string | null>('comp_btn');
  const [exportFramework, setExportFramework] = useState<'react' | 'html' | 'flutter'>('react');
  const [copied, setCopied] = useState<boolean>(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const selectedComp = screen.components.find(c => c.id === selectedCompId);

  // Add Component
  const handleAddComponent = (type: UIComponent['type']) => {
    const id = `comp_${Date.now()}`;
    const newComp: UIComponent = {
      id,
      type,
      label: type === 'button' ? 'دکمه اقدام (Click)' : type === 'input' ? 'ورودی متن...' : 'کارت محتوا',
      x: 30,
      y: 60,
      w: type === 'button' ? 140 : type === 'input' ? 240 : 280,
      h: type === 'button' || type === 'input' ? 42 : 120,
      color: type === 'button' ? '#0284c7' : '#1e293b',
      textColor: '#ffffff'
    };
    setScreen(prev => ({
      ...prev,
      components: [...prev.components, newComp]
    }));
    setSelectedCompId(id);
    soundSynth.playLaser();
  };

  // Delete component
  const handleDeleteComponent = (id: string) => {
    setScreen(prev => ({
      ...prev,
      components: prev.components.filter(c => c.id !== id)
    }));
    setSelectedCompId(null);
    soundSynth.playExplosion();
  };

  // Generate Real Code based on selected framework
  const generateCode = (): string => {
    if (exportFramework === 'react') {
      return `import React from 'react';

export const ${screen.name.split(' ')[0] || 'AppScreen'}: React.FC = () => {
  return (
    <div className="w-full min-h-screen bg-[#0f172a] text-white p-6 flex flex-col gap-4">
${screen.components
  .map(c => {
    if (c.type === 'navbar') return `      {/* Navbar */}\n      <nav className="w-full bg-slate-800 p-4 rounded-xl shadow-lg font-bold text-sky-400">${c.label}</nav>`;
    if (c.type === 'card') return `      {/* Card */}\n      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md font-medium text-emerald-400">${c.label}</div>`;
    if (c.type === 'chart') return `      {/* Chart */}\n      <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 h-32 flex items-center justify-center text-slate-400 font-mono">${c.label}</div>`;
    if (c.type === 'button') return `      <button className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-md transition">${c.label}</button>`;
    if (c.type === 'input') return `      <input type="text" placeholder="${c.label}" className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500" />`;
    return `      <div>${c.label}</div>`;
  })
  .join('\n')}
    </div>
  );
};
`;
    }

    if (exportFramework === 'html') {
      return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-white p-6 space-y-4">
${screen.components
  .map(c => {
    if (c.type === 'navbar') return `  <nav class="bg-slate-800 p-4 rounded-xl text-sky-400 font-bold">${c.label}</nav>`;
    if (c.type === 'button') return `  <button class="bg-sky-600 px-5 py-2 rounded-lg text-white font-medium">${c.label}</button>`;
    if (c.type === 'input') return `  <input class="bg-slate-800 p-2.5 rounded-lg border border-slate-700 text-white" placeholder="${c.label}" />`;
    return `  <div class="bg-slate-800 p-4 rounded-xl">${c.label}</div>`;
  })
  .join('\n')}
</body>
</html>`;
    }

    // Flutter / Dart code
    return `import 'package:flutter/material.dart';

class GeneratedScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Color(0xFF0F172A),
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
${screen.components
  .map(c => {
    if (c.type === 'button') return `              ElevatedButton(onPressed: () {}, child: Text('${c.label}')),`;
    if (c.type === 'input') return `              TextField(decoration: InputDecoration(hintText: '${c.label}')),`;
    return `              Card(child: Padding(padding: EdgeInsets.all(12), child: Text('${c.label}'))),`;
  })
  .join('\n')}
            ],
          ),
        ),
      ),
    );
  }
}
`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generateCode());
    setCopied(true);
    soundSynth.playCoin();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-[#121316] text-[#e1e4ea] select-none overflow-hidden">
      {/* Left: UI Component Library Palette */}
      <div className="w-full md:w-72 bg-[#161821] border-b md:border-b-0 md:border-r border-[#262937] p-4 flex flex-col shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#292e3e] mb-4">
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-sm text-white">سازنده بصری UI (Screen Builder)</h3>
          </div>
        </div>

        <p className="text-gray-400 text-xs mb-2">کامپوننت‌های رابط کاربری:</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(['button', 'input', 'card', 'chart', 'navbar'] as const).map(type => (
            <button
              key={type}
              onClick={() => handleAddComponent(type)}
              className="p-2.5 rounded-xl bg-[#1e212b] hover:bg-[#252936] border border-[#2c3140] text-gray-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>{type}</span>
            </button>
          ))}
        </div>

        {/* Selected Component Properties */}
        {selectedComp ? (
          <div className="pt-3 border-t border-[#292e3e] space-y-3 text-xs">
            <div className="flex items-center justify-between font-bold text-gray-200">
              <span>ویژگی‌های المان ({selectedComp.type})</span>
              <button
                onClick={() => handleDeleteComponent(selectedComp.id)}
                className="text-rose-400 hover:text-rose-300"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <span className="block text-gray-400 mb-1">متن / عنوان:</span>
              <input
                type="text"
                value={selectedComp.label}
                onChange={e => {
                  const val = e.target.value;
                  setScreen(prev => ({
                    ...prev,
                    components: prev.components.map(c => c.id === selectedComp.id ? { ...c, label: val } : c)
                  }));
                }}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#111217] border border-[#2d3142] text-white"
              />
            </div>

            <div>
              <span className="block text-gray-400 mb-1">رنگ پس‌زمینه:</span>
              <input
                type="color"
                value={selectedComp.color || '#0284c7'}
                onChange={e => {
                  const val = e.target.value;
                  setScreen(prev => ({
                    ...prev,
                    components: prev.components.map(c => c.id === selectedComp.id ? { ...c, color: val } : c)
                  }));
                }}
                className="w-full h-8 rounded bg-transparent cursor-pointer border border-[#2d3142]"
              />
            </div>

            <div>
              <span className="block text-gray-400 mb-1">اتصال به اکشن دیتابیس (DB Action):</span>
              <select
                value={selectedComp.dbAction || ''}
                onChange={e => {
                  const val = e.target.value as any;
                  setScreen(prev => ({
                    ...prev,
                    components: prev.components.map(c => c.id === selectedComp.id ? { ...c, dbAction: val || undefined } : c)
                  }));
                  soundSynth.playCoin();
                }}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#111217] border border-[#2d3142] text-xs text-cyan-300 focus:outline-none"
              >
                <option value="">بدون اکشن دیتابیس</option>
                <option value="insert_user">افزودن کاربر به جدول users</option>
                <option value="load_items">دریافت لیست از inventory</option>
                <option value="increase_score">افزایش امتیاز کاربر (+100)</option>
                <option value="refresh_stats">تازه‌سازی آمار داشبورد</option>
              </select>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-xs text-center py-4">روی یک المان کلیک کنید تا ویژگی‌های آن ویرایش شود.</p>
        )}
      </div>

      {/* Center: Live Screen Canvas */}
      <div className="flex-1 flex flex-col bg-[#0b0c10] overflow-hidden">
        {/* Device Switcher Header */}
        <div className="h-10 bg-[#151720] border-b border-[#252836] flex items-center justify-between px-4 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewDevice('desktop')}
              className={`p-1.5 rounded ${previewDevice === 'desktop' ? 'bg-sky-500/20 text-sky-400' : 'text-gray-400'}`}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPreviewDevice('tablet')}
              className={`p-1.5 rounded ${previewDevice === 'tablet' ? 'bg-sky-500/20 text-sky-400' : 'text-gray-400'}`}
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPreviewDevice('mobile')}
              className={`p-1.5 rounded ${previewDevice === 'mobile' ? 'bg-sky-500/20 text-sky-400' : 'text-gray-400'}`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
          <span className="text-gray-400 text-xs font-medium">{screen.name}</span>
        </div>

        {/* Viewport Frame */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
          <div
            className={`transition-all duration-300 rounded-3xl border-4 border-[#2c3144] bg-[#0f172a] shadow-2xl p-6 flex flex-col gap-4 overflow-y-auto ${
              previewDevice === 'mobile'
                ? 'w-[360px] h-[640px]'
                : previewDevice === 'tablet'
                ? 'w-[580px] h-[720px]'
                : 'w-[820px] h-[520px]'
            }`}
          >
            {screen.components.map(c => {
              const isSelected = selectedCompId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCompId(c.id);
                    soundSynth.playCoin();
                  }}
                  className={`cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-[#0f172a]' : ''
                  }`}
                >
                  {c.type === 'navbar' && (
                    <div className="p-3.5 rounded-xl font-bold text-sky-400 flex items-center justify-between" style={{ backgroundColor: c.color }}>
                      <span>{c.label}</span>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </div>
                  )}

                  {c.type === 'card' && (
                    <div className="p-4 rounded-xl border border-slate-700/50 shadow-md font-medium" style={{ backgroundColor: c.color, color: c.textColor }}>
                      {c.label}
                    </div>
                  )}

                  {c.type === 'chart' && (
                    <div className="p-4 rounded-xl border border-slate-700 flex flex-col gap-2" style={{ backgroundColor: c.color }}>
                      <span className="text-xs text-gray-300 font-semibold">{c.label}</span>
                      <div className="h-16 flex items-end gap-3 pt-2">
                        {(c.contentData || [30, 60, 45, 80, 95]).map((v: number, i: number) => (
                          <div key={i} className="flex-1 bg-sky-500/80 rounded-t" style={{ height: `${v}%` }} />
                        ))}
                      </div>
                    </div>
                  )}

                  {c.type === 'button' && (
                    <button className="px-5 py-2.5 rounded-xl font-bold shadow-md cursor-pointer" style={{ backgroundColor: c.color, color: c.textColor }}>
                      {c.label}
                    </button>
                  )}

                  {c.type === 'input' && (
                    <input
                      type="text"
                      readOnly
                      placeholder={c.label}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-700 text-gray-300 focus:outline-none"
                      style={{ backgroundColor: c.color }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Real Code Exporter Panel */}
      <div className="w-full md:w-80 bg-[#161821] border-t md:border-t-0 md:border-l border-[#262937] p-4 flex flex-col shrink-0">
        <div className="flex items-center justify-between pb-3 border-b border-[#292e3e] mb-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">خروجی کد واقعی</h3>
          </div>
          <button
            onClick={handleCopyCode}
            className="p-1.5 rounded-lg bg-[#232736] hover:bg-[#2c3144] text-emerald-300 flex items-center gap-1 text-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'کپی شد' : 'کپی کد'}</span>
          </button>
        </div>

        {/* Framework Selector */}
        <div className="grid grid-cols-3 gap-1.5 mb-3 bg-[#131418] p-1 rounded-lg border border-[#2a2d3b]">
          {(['react', 'html', 'flutter'] as const).map(fw => (
            <button
              key={fw}
              onClick={() => setExportFramework(fw)}
              className={`py-1 rounded text-xs font-medium uppercase ${
                exportFramework === fw
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-gray-400'
              }`}
            >
              {fw}
            </button>
          ))}
        </div>

        <pre className="flex-1 bg-[#0b0c10] p-3 rounded-xl border border-[#282d3d] text-[11px] font-mono text-emerald-300 overflow-auto whitespace-pre leading-relaxed">
          {generateCode()}
        </pre>
      </div>
    </div>
  );
};
