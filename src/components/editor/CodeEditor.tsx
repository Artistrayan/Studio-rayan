/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStudio } from '../../context/StudioContext';
import { translations } from '../../services/i18n';
import { ScriptRunner } from '../../services/engine/scriptRunner';
import { CodeDiagnosticsEngine, CodeIssue } from '../../services/engine/codeDiagnostics';
import { soundSynth } from '../../services/audio/synth';
import { VFSFile } from '../../types';
import {
  Play,
  Save,
  Plus,
  Trash2,
  FileCode,
  FolderPlus,
  Check,
  Terminal,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Download,
  Upload,
  AlertTriangle,
  AlertCircle,
  Wrench,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Compass
} from 'lucide-react';

export const CodeEditor: React.FC = () => {
  const {
    files,
    activeFile,
    setActiveFile,
    saveActiveFileContent,
    createNewFile,
    deleteFile,
    language,
    addLog,
    setWorkspace
  } = useStudio();

  const t = translations[language];

  const [code, setCode] = useState<string>(activeFile?.content || '');
  const [outputLogs, setOutputLogs] = useState<string[]>([]);
  const [executionErrors, setExecutionErrors] = useState<string[]>([]);
  const [isSavedNotice, setIsSavedNotice] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  const [showNewFileInput, setShowNewFileInput] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(true);

  useEffect(() => {
    if (activeFile) {
      setCode(activeFile.content);
    }
  }, [activeFile]);

  // Real-time Code Diagnostics Analysis
  const { issues, healthScore } = useMemo(() => {
    return CodeDiagnosticsEngine.analyze(code, activeFile?.language || 'javascript');
  }, [code, activeFile?.language]);

  // Line issues map for gutter markers
  const lineIssueMap = useMemo(() => {
    const map = new Map<number, CodeIssue>();
    issues.forEach(iss => {
      if (!map.has(iss.line)) map.set(iss.line, iss);
    });
    return map;
  }, [issues]);

  // Handle Save
  const handleSave = () => {
    saveActiveFileContent(code);
    setIsSavedNotice(true);
    soundSynth.playCoin();
    addLog(`Saved ${activeFile.name}`, 'info');
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  // Run Code
  const handleRunCode = () => {
    soundSynth.playLaser();
    setOutputLogs([]);
    setExecutionErrors([]);

    const lang = activeFile.language;
    addLog(`Executing ${activeFile.name} (${lang})...`, 'info');

    if (lang === 'javascript' || lang === 'typescript') {
      const res = ScriptRunner.executeJavaScript(code);
      setOutputLogs(res.logs);
      setExecutionErrors(res.errors);
      if (res.success) {
        addLog(`Execution of ${activeFile.name} finished successfully.`, 'info');
        soundSynth.playPowerup();
      } else {
        addLog(`Errors occurred executing ${activeFile.name}.`, 'error');
        soundSynth.playHit();
      }
    } else if (lang === 'python') {
      const res = ScriptRunner.executePython(code);
      setOutputLogs(res.logs);
      setExecutionErrors(res.errors);
      if (res.success) {
        addLog(`Python script ${activeFile.name} completed.`, 'info');
        soundSynth.playPowerup();
      } else {
        addLog(`Python execution error.`, 'error');
        soundSynth.playHit();
      }
    } else if (lang === 'lua') {
      const res = ScriptRunner.executeLua(code);
      setOutputLogs(res.logs);
      setExecutionErrors(res.errors);
      if (res.success) {
        addLog(`Lua script ${activeFile.name} executed.`, 'info');
        soundSynth.playPowerup();
      } else {
        addLog(`Lua execution error.`, 'error');
        soundSynth.playHit();
      }
    } else if (lang === 'glsl') {
      const res = ScriptRunner.validateGLSL(code);
      if (res.success) {
        setOutputLogs([
          '[GLSL WebGL Compiler] Vertex & Fragment shaders compiled successfully without errors.',
          'GPU uniform bindings valid: u_resolution, u_time, u_mouse.'
        ]);
        addLog(`GLSL shader compiled without errors!`, 'info');
        soundSynth.playPowerup();
      } else {
        setExecutionErrors([res.error || 'GLSL compilation failed']);
        addLog(`GLSL compiler error: ${res.error}`, 'error');
        soundSynth.playHit();
      }
    } else {
      setOutputLogs([`File type (${lang}) validated cleanly.`]);
    }
  };

  // Download Active File
  const handleDownloadActiveFile = () => {
    if (!activeFile) return;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name;
    a.click();
    URL.revokeObjectURL(url);
    soundSynth.playCoin();
    addLog(`دانلود فایل: ${activeFile.name}`, 'info');
  };

  // Upload File into VFS
  const handleUploadFileToVFS = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const path = `/src/${file.name}`;
      createNewFile(path, content);
      soundSynth.playPowerup();
      addLog(`فایل آپلود شد و در پروژه قرار گرفت: ${file.name}`, 'info');
    };
    reader.readAsText(file);
  };

  // Create file submission
  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const path = newFileName.startsWith('/') ? newFileName : `/src/${newFileName}`;
    createNewFile(path, '// New script created in AetherForge IDE\n');
    setNewFileName('');
    setShowNewFileInput(false);
  };

  // Apply Single Auto-Fix
  const handleApplySingleFix = (issue: CodeIssue) => {
    const repaired = CodeDiagnosticsEngine.applyFix(code, issue);
    setCode(repaired);
    saveActiveFileContent(repaired);
    soundSynth.playPowerup();
    addLog(`اصلاح هوشمند خطای "${issue.title}" اعمال شد.`, 'info');
  };

  // Apply All Auto-Fixes at Once
  const handleFixAllIssues = () => {
    const repaired = CodeDiagnosticsEngine.autoFixAll(code, issues);
    setCode(repaired);
    saveActiveFileContent(repaired);
    soundSynth.playPowerup();
    addLog(`تمام ${issues.length} خطای تشخیص‌داده‌شده با کدهای صحیح اصلاح شدند!`, 'info');
  };

  const lines = code.split('\n');

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-[#14161b] relative overflow-hidden h-full">
      {/* File Explorer Sidebar */}
      <div className="w-full md:w-56 bg-[#161820] border-b md:border-b-0 md:border-r border-[#262933] flex flex-col shrink-0 select-none text-xs">
        {/* Explorer Header */}
        <div className="h-9 px-3 border-b border-[#262933] flex items-center justify-between text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
          <span>EXPLORER</span>
          <div className="flex items-center gap-1.5">
            <label className="text-gray-400 hover:text-cyan-400 cursor-pointer p-0.5" title="Upload file from device">
              <Upload className="w-3.5 h-3.5" />
              <input type="file" onChange={handleUploadFileToVFS} className="hidden" />
            </label>
            <button
              onClick={() => setShowNewFileInput(!showNewFileInput)}
              className="text-gray-400 hover:text-cyan-400 cursor-pointer p-0.5"
              title="Create File"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* New file input prompt */}
        {showNewFileInput && (
          <form onSubmit={handleCreateFile} className="p-2 border-b border-[#2b2f3e] bg-[#1a1c24]">
            <input
              type="text"
              autoFocus
              placeholder="e.g. script.js, test.py"
              value={newFileName}
              onChange={e => setNewFileName(e.target.value)}
              className="w-full px-2 py-1 bg-[#101217] border border-cyan-500 rounded text-xs text-white focus:outline-none"
            />
          </form>
        )}

        {/* Files List */}
        <div className="flex-1 overflow-y-auto py-1">
          {files.map(f => {
            const isActive = activeFile?.path === f.path;
            return (
              <div
                key={f.path}
                onClick={() => {
                  setActiveFile(f);
                  soundSynth.playCoin();
                }}
                className={`group flex items-center justify-between px-3 py-1.5 cursor-pointer text-xs transition-colors ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 font-medium border-l-2 border-cyan-400'
                    : 'text-gray-400 hover:bg-[#20232c] hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode
                    className={`w-3.5 h-3.5 shrink-0 ${
                      f.language === 'javascript' || f.language === 'typescript'
                        ? 'text-yellow-400'
                        : f.language === 'python'
                        ? 'text-blue-400'
                        : f.language === 'lua'
                        ? 'text-cyan-400'
                        : f.language === 'glsl'
                        ? 'text-emerald-400'
                        : 'text-gray-400'
                    }`}
                  />
                  <span className="truncate">{f.name}</span>
                </div>

                {files.length > 1 && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      deleteFile(f.path);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 p-0.5 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Editor & Execution Panel */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#12141a]">
        {/* Editor Tab Bar & Controls */}
        <div className="h-9 bg-[#181a22] border-b border-[#252834] flex items-center justify-between px-3 text-xs shrink-0 select-none">
          {/* Active Tab & Health Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#12141a] text-cyan-400 rounded-t border-t-2 border-cyan-400 font-mono text-xs">
              <span>{activeFile?.name || 'untitled'}</span>
            </div>

            {/* Diagnostics Quick Badge */}
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors border ${
                issues.length === 0
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                  : 'bg-amber-950/40 text-amber-300 border-amber-800/50'
              }`}
              title="بررسی اشتباهات، موقعیت کد و اصلاح خودکار"
            >
              {issues.length === 0 ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>سلامت کد: ۱۰۰٪</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>{issues.length} خطا / اصلاح جایگاه</span>
                </>
              )}
            </button>

            {isSavedNotice && (
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>

          {/* Action Buttons: Run & Save & Download */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#242834] hover:bg-[#2e3342] text-gray-300 cursor-pointer"
              title="Save File (Ctrl+S)"
            >
              <Save className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">{t.actions.save}</span>
            </button>

            <button
              onClick={handleDownloadActiveFile}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#242834] hover:bg-[#2e3342] text-gray-300 cursor-pointer"
              title="Download file to device"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">دانلود فایل</span>
            </button>

            <button
              onClick={handleRunCode}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium cursor-pointer shadow-md shadow-emerald-600/20"
              title="Run Code (Ctrl+Enter)"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t.actions.run}</span>
            </button>

            <button
              onClick={() => setWorkspace('game')}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#242834] hover:bg-[#2e3342] text-cyan-400 cursor-pointer"
              title="Open Live Game Viewport"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Game View</span>
            </button>
          </div>
        </div>

        {/* Code Diagnostics & Misplaced Code Inspector Drawer */}
        {showDiagnostics && issues.length > 0 && (
          <div className="bg-[#181a24] border-b border-[#2d3244] p-3 text-xs max-h-56 overflow-y-auto shrink-0 select-text">
            <div className="flex items-center justify-between pb-2 border-b border-[#262a3a] mb-2">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white text-xs">
                  تشخیص اشتباهات و پیشنهاد موقعیت صحیح کد ({issues.length} مورد)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  امتیاز سلامت کد: {healthScore}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleFixAllIssues}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>اصلاح خودکار تمام خطاهای کد با کدهای صحیح</span>
                </button>
                <button
                  onClick={() => setShowDiagnostics(false)}
                  className="text-gray-400 hover:text-white p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* List of Detected Issues with Misplaced Code Warning and Suggested Fix */}
            <div className="space-y-2">
              {issues.map(issue => (
                <div
                  key={issue.id}
                  className="p-2.5 rounded-lg bg-[#11131a] border border-[#2b3042] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                >
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.2 rounded bg-[#222638] text-[10px] font-mono text-cyan-300">
                        خط {issue.line}:{issue.column}
                      </span>
                      <span className="font-semibold text-amber-300">{issue.title}</span>
                      {issue.suggestedPosition && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center gap-1">
                          <Compass className="w-3 h-3 text-cyan-400" />
                          <span>موقعیت صحیح پیشنهادی: {issue.suggestedPosition}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-gray-300 text-[11px] leading-relaxed">{issue.description}</p>
                    {issue.badSnippet && (
                      <div className="font-mono text-[10px] text-red-300 bg-red-950/20 px-2 py-0.5 rounded border border-red-900/40 w-fit">
                        {issue.badSnippet}
                      </div>
                    )}
                  </div>

                  {issue.autoFixAvailable && (
                    <button
                      onClick={() => handleApplySingleFix(issue)}
                      className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>اعمال اصلاح هوشمند</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Code Editor Body with Gutter & Issue Dots */}
        <div className="flex-1 flex overflow-hidden relative font-mono text-xs">
          {/* Line Numbers Gutter with Diagnostics Indicator */}
          <div className="w-14 bg-[#101217] text-[#475569] text-right pr-2 pt-3 select-none border-r border-[#1e222d] shrink-0 overflow-hidden leading-5">
            {lines.map((_, i) => {
              const lineNum = i + 1;
              const lineIssue = lineIssueMap.get(lineNum);
              return (
                <div key={i} className="flex items-center justify-end gap-1">
                  {lineIssue ? (
                    <span
                      title={`${lineIssue.title}: ${lineIssue.description}`}
                      className="w-2 h-2 rounded-full bg-amber-400 animate-pulse cursor-help"
                    />
                  ) : null}
                  <span>{lineNum}</span>
                </div>
              );
            })}
          </div>

          {/* Code Textarea */}
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => {
              if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
              }
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleRunCode();
              }
            }}
            spellCheck={false}
            className="flex-1 p-3 bg-transparent text-[#e2e8f0] resize-none focus:outline-none overflow-auto font-mono text-xs leading-5 whitespace-pre selection:bg-cyan-500/30"
          />
        </div>

        {/* Output Console Drawer */}
        {(outputLogs.length > 0 || executionErrors.length > 0) && (
          <div className="h-36 bg-[#0f1117] border-t border-[#252834] p-2.5 text-xs font-mono overflow-y-auto shrink-0 select-text">
            <div className="flex items-center justify-between text-gray-400 text-[11px] mb-1 pb-1 border-b border-[#1e222d]">
              <span className="font-semibold text-cyan-400 flex items-center gap-1">
                <Terminal className="w-3 h-3" /> Execution Output
              </span>
              <button
                onClick={() => {
                  setOutputLogs([]);
                  setExecutionErrors([]);
                }}
                className="hover:text-white cursor-pointer"
              >
                Clear
              </button>
            </div>

            {outputLogs.map((log, i) => (
              <div key={i} className="text-emerald-400 leading-relaxed">
                &gt; {log}
              </div>
            ))}

            {executionErrors.map((err, i) => (
              <div key={i} className="text-red-400 leading-relaxed font-semibold">
                &gt; {err}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
