/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import { projectManager, StudioProject } from '../../services/projects/projectManager';
import { ProjectTemplateId } from '../../services/projects/projectTemplates';
import { soundSynth } from '../../services/audio/synth';
import {
  FolderOpen,
  Plus,
  Trash2,
  Edit2,
  Save,
  Download,
  Upload,
  Check,
  Sparkles,
  Layers,
  Landmark,
  FileCode,
  Clock,
  Copy
} from 'lucide-react';

export const ProjectModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const { files, addLog } = useStudio();
  const [projects, setProjects] = useState<StudioProject[]>(() => projectManager.getProjects());
  const [activeProj, setActiveProj] = useState<StudioProject>(() => projectManager.getActiveProject());

  // New Project Form
  const [showNewForm, setShowNewForm] = useState<boolean>(false);
  const [newProjName, setNewProjName] = useState<string>('');
  const [newProjDesc, setNewProjDesc] = useState<string>('');
  const [newProjTemplate, setNewProjTemplate] = useState<ProjectTemplateId | 'default'>('sidescroller_2d');

  // Rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState<string>('');

  if (!isOpen) return null;

  const refreshList = () => {
    setProjects(projectManager.getProjects());
    setActiveProj(projectManager.getActiveProject());
  };

  // Switch Active Project
  const handleSelectProject = (id: string) => {
    projectManager.saveCurrentProjectFiles(files);
    const p = projectManager.setActiveProject(id);
    if (p) {
      soundSynth.playCoin();
      addLog(`پروژه فعال تغییر یافت به: ${p.name}`, 'info');
      refreshList();
      window.location.reload(); // Reload VFS with new active project files
    }
  };

  // Create Project
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    soundSynth.playLaser();
    projectManager.saveCurrentProjectFiles(files);
    const created = projectManager.createProject(newProjName, newProjDesc, newProjTemplate);
    setNewProjName('');
    setNewProjDesc('');
    setShowNewForm(false);
    refreshList();
    addLog(`پروژه جدید ساخته شد: ${created.name}`, 'info');
    window.location.reload();
  };

  // Delete Project
  const handleDeleteProject = (id: string, name: string) => {
    if (projects.length <= 1) {
      addLog('امکان حذف تنها پروژه موجود وجود ندارد.', 'warn');
      return;
    }
    if (confirm(`آیا از حذف پروژه "${name}" اطمینان دارید؟`)) {
      soundSynth.playHit();
      projectManager.deleteProject(id);
      refreshList();
      addLog(`پروژه حذف شد: ${name}`, 'warn');
      window.location.reload();
    }
  };

  // Rename Project
  const handleRename = (id: string) => {
    if (!renameInput.trim()) return;
    soundSynth.playCoin();
    projectManager.renameProject(id, renameInput);
    setEditingId(null);
    setRenameInput('');
    refreshList();
    addLog('نام پروژه با موفقیت تغییر کرد.', 'info');
  };

  // Save Project explicitly
  const handleSaveProject = () => {
    projectManager.saveCurrentProjectFiles(files);
    soundSynth.playCoin();
    addLog('کل محتویات و فایل‌های پروژه با موفقیت ذخیره شد.', 'info');
  };

  const handleDuplicateProject = (id: string) => {
    soundSynth.playPowerup();
    const dup = projectManager.duplicateProject(id);
    if (dup) {
      refreshList();
      addLog(`پروژه کپی شد: ${dup.name}`, 'info');
      window.location.reload();
    }
  };

  // Export / Download Project JSON
  const handleDownloadProjectJSON = (proj: StudioProject) => {
    soundSynth.playPowerup();
    const jsonStr = projectManager.exportProjectJSON(proj.id);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proj.name.replace(/\s+/g, '_')}_Backup.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog(`دانلود فایل بک‌آپ پروژه: ${proj.name}`, 'info');
  };

  // Upload / Import Project JSON
  const handleImportProjectJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const res = projectManager.importProjectJSON(reader.result as string);
        if (res) {
          soundSynth.playPowerup();
          addLog(`پروژه "${res.name}" با موفقیت آپلود و بازیابی شد!`, 'info');
          refreshList();
          window.location.reload();
        } else {
          addLog('فایل نامعتبر است.', 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 select-none">
      <div className="bg-[#161822] border-2 border-[#2f354a] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="h-12 bg-[#1b1e2b] border-b border-[#2a2f42] px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white text-sm">مدیریت پروژه‌ها (ساخت، حذف، تغییر نام، ذخیره)</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#252a3c] hover:bg-[#323850] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>

        {/* Modal Controls Bar */}
        <div className="p-3 bg-[#13151c] border-b border-[#252838] flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewForm(!showNewForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>ساخت پروژه جدید</span>
            </button>

            <button
              onClick={handleSaveProject}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#222636] hover:bg-[#2b3044] text-gray-300 cursor-pointer border border-[#343a50]"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>ذخیره پروژه فعال</span>
            </button>
          </div>

          <label className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#222636] hover:bg-[#2b3044] text-gray-300 cursor-pointer border border-[#343a50]">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>آپلود پروژه (JSON)</span>
            <input type="file" accept=".json" onChange={handleImportProjectJSON} className="hidden" />
          </label>
        </div>

        {/* Body Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3 text-xs">
          {/* New Project Creator Form with Visual Template Picker */}
          {showNewForm && (
            <form onSubmit={handleCreateProject} className="bg-[#1b1e2a] p-4 rounded-xl border border-cyan-500/40 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#282d3e]">
                <span className="font-bold text-white text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>انتخاب قالب و اطلاعات پروژه جدید</span>
                </span>
                <span className="text-[10px] text-gray-400">بوترپ و راه‌اندازی خودکار فایل‌ها</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="نام پروژه (مثال: قهرمان نینجا ۲D)..."
                  value={newProjName}
                  onChange={e => setNewProjName(e.target.value)}
                  className="px-3 py-2 bg-[#101218] border border-[#2c3144] rounded-lg text-white text-xs focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="text"
                  placeholder="توضیحات کوتاه پروژه..."
                  value={newProjDesc}
                  onChange={e => setNewProjDesc(e.target.value)}
                  className="px-3 py-2 bg-[#101218] border border-[#2c3144] rounded-lg text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Template Selection Cards Grid */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-gray-300 block">انتخاب قالب اولیه (Project Template):</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {[
                    {
                      id: 'sidescroller_2d',
                      title: 'بازی دوبعدی ساید-اسکرولر (2D Side-Scroller)',
                      desc: 'فیزیک پرش، سکه‌ها، جاذبه، تایل‌مپ و دوربین متحرک',
                      tag: 'Platformer',
                      color: '#06b6d4'
                    },
                    {
                      id: 'sandbox_3d',
                      title: 'استودیو سه‌بعدی و سندباکس (3D Sandbox)',
                      desc: 'نورپردازی استودیو، متریال‌های PBR، توروس و کنترلر مدارگرد',
                      tag: 'Three.js 3D',
                      color: '#8b5cf6'
                    },
                    {
                      id: 'political_strategy',
                      title: 'شبیه‌ساز استراتژی سیاسی (Political Sim)',
                      desc: 'مدیریت احزاب، پارلمان، فرمان‌های کشوری و بحران‌ها',
                      tag: 'Strategy',
                      color: '#f59e0b'
                    },
                    {
                      id: 'mobile_app',
                      title: 'اپلیکیشن و داشبورد موبایل (Mobile App)',
                      desc: 'داشبورد کاربری، اتصال به دیتابیس محلی SQLite و کلاینت API',
                      tag: 'App / UI',
                      color: '#10b981'
                    }
                  ].map(tmpl => {
                    const isSelected = newProjTemplate === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => setNewProjTemplate(tmpl.id as any)}
                        className={`p-2.5 rounded-xl border text-right cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                            : 'bg-[#13151e] border-[#292e3e] hover:border-gray-500 text-gray-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-white truncate">{tmpl.title}</span>
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold"
                            style={{ backgroundColor: `${tmpl.color}25`, color: tmpl.color }}
                          >
                            {tmpl.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed truncate">{tmpl.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#262a39]">
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#252834] text-gray-400 hover:text-white cursor-pointer text-xs"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer shadow-md shadow-cyan-600/20"
                >
                  راه‌اندازی و بازکردن پروژه
                </button>
              </div>
            </form>
          )}

          {/* Projects List */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              لیست پروژه‌های ذخیره‌شده ({projects.length})
            </span>

            {projects.map(proj => {
              const isActive = proj.id === activeProj.id;
              return (
                <div
                  key={proj.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-cyan-500/10 border-cyan-500/50 shadow-md'
                      : 'bg-[#181a24] border-[#262a3a] hover:border-[#383e54]'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    {proj.template === 'political_strategy' || (proj.template as any) === 'political' ? (
                      <Landmark className="w-5 h-5 text-amber-400 shrink-0" />
                    ) : (
                      <Layers className="w-5 h-5 text-cyan-400 shrink-0" />
                    )}

                    <div className="truncate">
                      {editingId === proj.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={renameInput}
                            onChange={e => setRenameInput(e.target.value)}
                            className="px-2 py-0.5 bg-[#0f1118] border border-cyan-400 rounded text-xs text-white"
                          />
                          <button
                            onClick={() => handleRename(proj.id)}
                            className="p-1 rounded bg-emerald-600 text-white cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-xs ${isActive ? 'text-cyan-300 font-bold' : 'text-gray-200'}`}>
                            {proj.name}
                          </span>
                          {isActive && (
                            <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1.5 py-0.2 rounded font-mono">
                              فعال
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{proj.description}</p>
                    </div>
                  </div>

                  {/* Actions: Select, Rename, Download, Delete */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isActive && (
                      <button
                        onClick={() => handleSelectProject(proj.id)}
                        className="px-2.5 py-1 rounded bg-[#242838] hover:bg-cyan-600 hover:text-white text-cyan-400 text-xs cursor-pointer transition-colors"
                      >
                        بارگذاری
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setEditingId(proj.id);
                        setRenameInput(proj.name);
                      }}
                      className="p-1.5 rounded hover:bg-[#25293a] text-gray-400 hover:text-white cursor-pointer"
                      title="تغییر نام پروژه"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDuplicateProject(proj.id)}
                      className="p-1.5 rounded hover:bg-[#25293a] text-gray-400 hover:text-cyan-300 cursor-pointer"
                      title="کپی / دابلیکیت پروژه"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDownloadProjectJSON(proj)}
                      className="p-1.5 rounded hover:bg-[#25293a] text-gray-400 hover:text-cyan-300 cursor-pointer"
                      title="دانلود فایل بک‌آپ پروژه"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {projects.length > 1 && (
                      <button
                        onClick={() => handleDeleteProject(proj.id, proj.name)}
                        className="p-1.5 rounded hover:bg-red-950/40 text-gray-500 hover:text-red-400 cursor-pointer"
                        title="حذف پروژه"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
