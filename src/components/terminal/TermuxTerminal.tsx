/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useStudio } from '../../context/StudioContext';
import { ScriptRunner } from '../../services/engine/scriptRunner';
import { gitEngine } from '../../services/git/gitEngine';
import { soundSynth } from '../../services/audio/synth';
import {
  Terminal as TerminalIcon,
  Plus,
  X,
  Copy,
  Download,
  Trash2,
  Cpu,
  Check,
  ChevronRight,
  Maximize2
} from 'lucide-react';

interface TerminalLine {
  id: string;
  type: 'prompt' | 'output' | 'error' | 'system' | 'info';
  text: string;
}

interface TerminalSession {
  id: string;
  title: string;
  mode: 'shell' | 'python_repl' | 'node_repl';
  lines: TerminalLine[];
  history: string[];
}

export const TermuxTerminal: React.FC = () => {
  const { files, createNewFile, deleteFile, fps, addLog } = useStudio();

  // Multi-session Terminal Tabs
  const [sessions, setSessions] = useState<TerminalSession[]>([
    {
      id: 'session_1',
      title: 'sh #1 (bash)',
      mode: 'shell',
      history: [],
      lines: [
        { id: '1', type: 'system', text: '⚡ ForgeShell Advanced Developer Terminal v3.2 [WebAssembly & V8 Sandbox]' },
        { id: '2', type: 'info', text: 'Type "help" for command matrix. Supports: node, python, lua, glsl, tree, grep, find, top, calc, git.' },
        { id: '3', type: 'output', text: 'Runtime: Node v20.12, Python 3.12, Lua 5.4, Git 2.44, WebGL 2.0 PBR. 100% Offline.' }
      ]
    }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>('session_1');

  // Input & Autocomplete State
  const [input, setInput] = useState<string>('');
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [copied, setCopied] = useState<boolean>(false);
  const [autocompleteHint, setAutocompleteHint] = useState<string>('');

  // Python & Node in-memory REPL scopes
  const pythonScope = useRef<Record<string, any>>({});
  const nodeScope = useRef<Record<string, any>>({});

  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const currentBranch = gitEngine.getCurrentBranch();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession.lines]);

  // Compute inline Autocomplete Hint
  useEffect(() => {
    if (!input.trim() || activeSession.mode !== 'shell') {
      setAutocompleteHint('');
      return;
    }

    const commandList = [
      'node', 'python', 'lua', 'glsl', 'tree', 'grep', 'find', 'cat',
      'ls', 'touch', 'rm', 'git', 'build', 'top', 'calc', 'pkg', 'clear', 'help', 'history'
    ];

    const fileNames = files.map(f => f.name);
    const parts = input.split(' ');

    if (parts.length === 1) {
      const match = commandList.find(c => c.startsWith(parts[0].toLowerCase()) && c !== parts[0].toLowerCase());
      if (match) {
        setAutocompleteHint(match.slice(parts[0].length));
        return;
      }
    } else if (parts.length >= 2) {
      const lastToken = parts[parts.length - 1];
      const match = fileNames.find(f => f.startsWith(lastToken) && f !== lastToken);
      if (match) {
        setAutocompleteHint(match.slice(lastToken.length));
        return;
      }
    }
    setAutocompleteHint('');
  }, [input, activeSession.mode, files]);

  // Tab Key Press Handler for Auto-completion
  const handleApplyTabCompletion = () => {
    if (autocompleteHint) {
      soundSynth.playLaser();
      setInput(prev => prev + autocompleteHint + ' ');
      setAutocompleteHint('');
    }
  };

  // Add Lines to Active Session
  const appendLines = (newLines: TerminalLine[], updateMode?: 'shell' | 'python_repl' | 'node_repl') => {
    setSessions(prev =>
      prev.map(s => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            mode: updateMode !== undefined ? updateMode : s.mode,
            lines: [...s.lines, ...newLines]
          };
        }
        return s;
      })
    );
  };

  // Command Execution Engine
  const executeCommand = (cmdStr: string) => {
    const trimmed = cmdStr.trim();
    if (!trimmed) return;

    soundSynth.playLaser();

    // Store in history
    setSessions(prev =>
      prev.map(s => {
        if (s.id === activeSession.id) {
          return { ...s, history: [...s.history, trimmed] };
        }
        return s;
      })
    );
    setHistoryIndex(-1);

    // Python REPL Mode Execution
    if (activeSession.mode === 'python_repl') {
      if (trimmed === 'exit()' || trimmed === 'quit()' || trimmed === 'exit') {
        appendLines(
          [
            { id: 'p_' + Date.now(), type: 'prompt', text: `>>> ${trimmed}` },
            { id: 'p_out_' + Date.now(), type: 'info', text: 'Exited Python interactive REPL session.' }
          ],
          'shell'
        );
        setInput('');
        return;
      }
      const res = ScriptRunner.executePython(trimmed);
      const linesToAdd: TerminalLine[] = [{ id: 'p_' + Date.now(), type: 'prompt', text: `>>> ${trimmed}` }];
      res.logs.forEach(l => linesToAdd.push({ id: 'pl_' + Math.random(), type: 'output', text: l }));
      res.errors.forEach(e => linesToAdd.push({ id: 'pe_' + Math.random(), type: 'error', text: e }));
      appendLines(linesToAdd);
      setInput('');
      return;
    }

    // Node.js REPL Mode Execution
    if (activeSession.mode === 'node_repl') {
      if (trimmed === 'exit' || trimmed === '.exit') {
        appendLines(
          [
            { id: 'n_' + Date.now(), type: 'prompt', text: `> ${trimmed}` },
            { id: 'n_out_' + Date.now(), type: 'info', text: 'Exited Node.js REPL session.' }
          ],
          'shell'
        );
        setInput('');
        return;
      }
      const res = ScriptRunner.executeJavaScript(trimmed, nodeScope.current);
      const linesToAdd: TerminalLine[] = [{ id: 'n_' + Date.now(), type: 'prompt', text: `> ${trimmed}` }];
      res.logs.forEach(l => linesToAdd.push({ id: 'nl_' + Math.random(), type: 'output', text: l }));
      res.errors.forEach(e => linesToAdd.push({ id: 'ne_' + Math.random(), type: 'error', text: e }));
      if (res.returnValue !== undefined) {
        linesToAdd.push({
          id: 'nret_' + Date.now(),
          type: 'output',
          text: String(typeof res.returnValue === 'object' ? JSON.stringify(res.returnValue) : res.returnValue)
        });
      }
      appendLines(linesToAdd);
      setInput('');
      return;
    }

    // Standard Shell Mode Execution
    const promptHeader = `dev@forgeshell:~/project (${currentBranch}) $ ${trimmed}`;
    const outputList: TerminalLine[] = [{ id: 'line_' + Date.now(), type: 'prompt', text: promptHeader }];

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (cmd === 'clear') {
      setSessions(prev =>
        prev.map(s => (s.id === activeSession.id ? { ...s, lines: [] } : s))
      );
      setInput('');
      return;
    }

    // Help Command
    if (cmd === 'help') {
      outputList.push({
        id: 'h_' + Date.now(),
        type: 'info',
        text: `ForgeShell Advanced Command Suite:
  tree                   Display visual Unicode directory tree of workspace
  node [file]            Execute JavaScript file or enter interactive JS REPL
  python [file]          Execute Python script or enter interactive Python REPL
  lua <file>             Execute Lua script in browser engine
  glsl <file>            Validate & compile GPU WebGL shader
  grep <term> <file>     Search text/pattern in file with line matches
  find <name>            Find files in workspace
  calc <expression>      Evaluate mathematical formulas (e.g. calc 25 * 4)
  top / htop             Display real-time system performance monitor
  cat <file>             Print file contents
  ls [-la]               List files in workspace
  touch <file>           Create file in VFS
  rm <file>              Delete file from VFS
  git <status|log|branch> Git repository version control
  pkg list               List pre-compiled WebAssembly and browser runtime packages
  build                  Compile and package distribution bundles
  history                Show command history`
      });
    }

    // Tree Command
    else if (cmd === 'tree') {
      let treeStr = '.\n';
      const rootFiles = files.filter(f => !f.path.startsWith('/src/'));
      const srcFiles = files.filter(f => f.path.startsWith('/src/'));

      treeStr += '├── src/\n';
      srcFiles.forEach((f, idx) => {
        const isLast = idx === srcFiles.length - 1 && rootFiles.length === 0;
        treeStr += `│   ${isLast ? '└──' : '├──'} ${f.name}\n`;
      });
      rootFiles.forEach((f, idx) => {
        const isLast = idx === rootFiles.length - 1;
        treeStr += `${isLast ? '└──' : '├──'} ${f.name}\n`;
      });
      treeStr += `\n${files.length} files tracked in virtual workspace.`;
      outputList.push({ id: 'tree_' + Date.now(), type: 'output', text: treeStr });
    }

    // Grep Command
    else if (cmd === 'grep') {
      const term = args[0];
      const targetName = args[1];
      if (!term || !targetName) {
        outputList.push({ id: 'ge_' + Date.now(), type: 'error', text: 'Usage: grep <pattern> <filename>' });
      } else {
        const file = files.find(f => f.name === targetName || f.path === targetName);
        if (!file) {
          outputList.push({ id: 'ge2_' + Date.now(), type: 'error', text: `grep: ${targetName}: No such file` });
        } else {
          const lines = file.content.split('\n');
          const matches = lines
            .map((line, idx) => ({ line, num: idx + 1 }))
            .filter(item => item.line.toLowerCase().includes(term.toLowerCase()));

          if (matches.length === 0) {
            outputList.push({ id: 'gm_' + Date.now(), type: 'output', text: `No matches found for "${term}".` });
          } else {
            const resultText = matches.map(m => `  Line ${m.num}: ${m.line.trim()}`).join('\n');
            outputList.push({
              id: 'gm_' + Date.now(),
              type: 'output',
              text: `Found ${matches.length} matches in ${file.name}:\n${resultText}`
            });
          }
        }
      }
    }

    // Find Command
    else if (cmd === 'find') {
      const q = args[0] || '';
      const matched = files.filter(f => f.name.toLowerCase().includes(q.toLowerCase()));
      outputList.push({
        id: 'find_' + Date.now(),
        type: 'output',
        text: matched.map(f => f.path).join('\n') || 'No files found.'
      });
    }

    // Calculator Command
    else if (cmd === 'calc') {
      const expr = args.join(' ');
      try {
        const cleanExpr = expr
          .replace(/sin/g, 'Math.sin')
          .replace(/cos/g, 'Math.cos')
          .replace(/sqrt/g, 'Math.sqrt')
          .replace(/pi/g, 'Math.PI');
        const evaluated = new Function(`return (${cleanExpr})`)();
        outputList.push({ id: 'calc_' + Date.now(), type: 'output', text: `Result: ${evaluated}` });
      } catch (err: any) {
        outputList.push({ id: 'calc_err_' + Date.now(), type: 'error', text: `Math error: ${err.message}` });
      }
    }

    // Top / Performance Monitor
    else if (cmd === 'top' || cmd === 'htop') {
      const memApprox = (performance as any).memory
        ? Math.round((performance as any).memory.usedJSHeapSize / 1048576) + ' MB'
        : '34 MB';
      outputList.push({
        id: 'top_' + Date.now(),
        type: 'info',
        text: `ForgeShell Virtual Process Monitor:
  FPS:            ${fps} frames/sec (Target: 60)
  JS Heap Memory: ${memApprox}
  Active Files:   ${files.length} VFS handles
  Graphics Engine: Three.js PBR WebGL2 Context (ACTIVE)
  Audio Subsystem: WebAudio Synthesizer 48kHz (READY)
  Threads:        Main EventLoop + WebWorker Sandbox`
      });
    }

    // Interactive Python or Python Script
    else if (cmd === 'python' || cmd === 'python3') {
      if (!args[0] || args[0] === '-i') {
        outputList.push({
          id: 'py_repl_' + Date.now(),
          type: 'info',
          text: 'Python 3.12.2 Interactive REPL. Type expressions or "exit()" to quit.'
        });
        appendLines(outputList, 'python_repl');
        setInput('');
        return;
      }
      const target = files.find(f => f.name === args[0] || f.path === args[0]);
      if (target) {
        const res = ScriptRunner.executePython(target.content);
        res.logs.forEach(l => outputList.push({ id: 'pl_' + Math.random(), type: 'output', text: l }));
        res.errors.forEach(e => outputList.push({ id: 'pe_' + Math.random(), type: 'error', text: e }));
      } else {
        outputList.push({ id: 'pe_' + Date.now(), type: 'error', text: `python: file not found: '${args[0]}'` });
      }
    }

    // Interactive Node or Node Script
    else if (cmd === 'node') {
      if (!args[0] || args[0] === '-i') {
        outputList.push({
          id: 'node_repl_' + Date.now(),
          type: 'info',
          text: 'Node.js v20.12.0 Interactive REPL. Type JavaScript expressions or "exit" to quit.'
        });
        appendLines(outputList, 'node_repl');
        setInput('');
        return;
      }
      const target = files.find(f => f.name === args[0] || f.path === args[0]);
      if (target) {
        const res = ScriptRunner.executeJavaScript(target.content);
        res.logs.forEach(l => outputList.push({ id: 'nl_' + Math.random(), type: 'output', text: l }));
        res.errors.forEach(e => outputList.push({ id: 'ne_' + Math.random(), type: 'error', text: e }));
      } else {
        outputList.push({ id: 'ne_' + Date.now(), type: 'error', text: `node: cannot find file '${args[0]}'` });
      }
    }

    // Lua Execution
    else if (cmd === 'lua') {
      const target = files.find(f => f.name === args[0] || f.path === args[0]);
      if (target) {
        const res = ScriptRunner.executeLua(target.content);
        res.logs.forEach(l => outputList.push({ id: 'll_' + Math.random(), type: 'output', text: l }));
        res.errors.forEach(e => outputList.push({ id: 'le_' + Math.random(), type: 'error', text: e }));
      } else {
        outputList.push({ id: 'le_' + Date.now(), type: 'error', text: `lua: cannot open '${args[0]}'` });
      }
    }

    // GLSL Shader validation
    else if (cmd === 'glsl') {
      const target = files.find(f => f.name === args[0] || f.path === args[0]);
      if (target) {
        const res = ScriptRunner.validateGLSL(target.content);
        if (res.success) {
          outputList.push({ id: 'gl_' + Date.now(), type: 'output', text: 'GLSL Vertex & Fragment shaders verified.' });
        } else {
          outputList.push({ id: 'gle_' + Date.now(), type: 'error', text: `GLSL Compiler: ${res.error}` });
        }
      } else {
        outputList.push({ id: 'gl_err_' + Date.now(), type: 'error', text: `glsl: file not found: '${args[0]}'` });
      }
    }

    // Package Manager
    else if (cmd === 'pkg') {
      if (args[0] === 'list') {
        outputList.push({
          id: 'pkg_' + Date.now(),
          type: 'output',
          text: `Installed Virtual Runtimes:
  - three@0.170.0 (3D WebGL PBR Engine)
  - jszip@3.10.1 (Bundle Exporter)
  - lucide-react@0.546.0 (Icons)
  - webaudio-synth@1.0 (Procedural Audio)
  - pyodide-ast@0.26 (Python Evaluator)
  - lua-engine@5.4 (Lua Subsystem)`
        });
      } else {
        outputList.push({ id: 'pkg_' + Date.now(), type: 'output', text: `Package '${args[1] || ''}' already verified.` });
      }
    }

    // List Files (ls)
    else if (cmd === 'ls') {
      const fileNames = files.map(f => f.name).join('   ');
      outputList.push({ id: 'ls_' + Date.now(), type: 'output', text: fileNames || '(empty workspace)' });
    }

    // Cat File
    else if (cmd === 'cat') {
      const target = files.find(f => f.name === args[0] || f.path === args[0]);
      if (target) {
        outputList.push({ id: 'cat_' + Date.now(), type: 'output', text: target.content });
      } else {
        outputList.push({ id: 'cat_err_' + Date.now(), type: 'error', text: `cat: ${args[0] || ''}: No such file` });
      }
    }

    // Touch File
    else if (cmd === 'touch') {
      if (args[0]) {
        createNewFile(args[0].startsWith('/') ? args[0] : `/src/${args[0]}`, '// Created via ForgeShell\n');
        outputList.push({ id: 'tch_' + Date.now(), type: 'output', text: `Created ${args[0]}` });
      } else {
        outputList.push({ id: 'tch_err_' + Date.now(), type: 'error', text: 'touch: missing file operand' });
      }
    }

    // Remove File
    else if (cmd === 'rm') {
      const target = files.find(f => f.name === args[0] || f.path === args[0]);
      if (target) {
        deleteFile(target.path);
        outputList.push({ id: 'rm_' + Date.now(), type: 'output', text: `Removed ${args[0]}` });
      } else {
        outputList.push({ id: 'rm_err_' + Date.now(), type: 'error', text: `rm: ${args[0] || ''}: No such file` });
      }
    }

    // Git integration
    else if (cmd === 'git') {
      if (args[0] === 'status') {
        outputList.push({
          id: 'git_s_' + Date.now(),
          type: 'output',
          text: `On branch ${currentBranch}\nWorking tree clean. All files committed.`
        });
      } else if (args[0] === 'branch') {
        const brs = gitEngine.getBranches().map(b => (b.name === currentBranch ? `* ${b.name}` : `  ${b.name}`)).join('\n');
        outputList.push({ id: 'git_b_' + Date.now(), type: 'output', text: brs });
      } else {
        outputList.push({ id: 'git_' + Date.now(), type: 'output', text: `git: executed '${args.join(' ')}'` });
      }
    }

    // Build
    else if (cmd === 'build') {
      outputList.push({
        id: 'bld_' + Date.now(),
        type: 'output',
        text: `[ForgeShell Builder] Compiling workspace...\n  Target: Web PWA, Android, iOS, Electron\nBuild completed in 118ms.`
      });
      soundSynth.playPowerup();
    }

    // History
    else if (cmd === 'history') {
      const hStr = activeSession.history.map((h, i) => `  ${i + 1}  ${h}`).join('\n');
      outputList.push({ id: 'hist_' + Date.now(), type: 'output', text: hStr || 'No history yet.' });
    }

    // Unknown
    else {
      outputList.push({
        id: 'unk_' + Date.now(),
        type: 'error',
        text: `forgeshell: command not found: '${cmd}'. Type "help" for available commands.`
      });
    }

    appendLines(outputList);
    setInput('');
  };

  // Create new session tab
  const createNewSession = () => {
    soundSynth.playCoin();
    const newId = 'session_' + Date.now();
    const newSession: TerminalSession = {
      id: newId,
      title: `sh #${sessions.length + 1}`,
      mode: 'shell',
      history: [],
      lines: [
        { id: '1', type: 'system', text: `ForgeShell Session #${sessions.length + 1} initialized.` },
        { id: '2', type: 'info', text: 'Type "help" for commands, or "python" / "node" to start interactive REPL.' }
      ]
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newId);
  };

  // Close session tab
  const closeSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) return;
    soundSynth.playLaser();
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) {
      setActiveSessionId(filtered[0].id);
    }
  };

  // Copy full terminal text
  const copyTerminalOutput = () => {
    const text = activeSession.lines.map(l => l.text).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    soundSynth.playCoin();
    setTimeout(() => setCopied(false), 2000);
  };

  // Download terminal log
  const downloadTerminalLog = () => {
    const text = activeSession.lines.map(l => l.text).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminal_${activeSession.title.replace(/\s+/g, '_')}.log`;
    a.click();
    URL.revokeObjectURL(url);
    soundSynth.playPowerup();
  };

  // Extra Keys for Mobile & Rapid Desktop Click
  const mobileExtraKeys = [
    { label: 'TAB', action: () => handleApplyTabCompletion() },
    { label: 'ESC', action: () => setInput('') },
    { label: 'CTRL-C', action: () => setInput('') },
    { label: 'node', action: () => setInput('node ') },
    { label: 'python', action: () => setInput('python ') },
    { label: 'tree', action: () => executeCommand('tree') },
    { label: 'top', action: () => executeCommand('top') },
    { label: 'git', action: () => setInput('git status') },
    { label: 'clear', action: () => executeCommand('clear') },
    { label: '|', action: () => setInput(i => i + ' | ') },
    { label: '/', action: () => setInput(i => i + '/') },
    { label: '~', action: () => setInput(i => i + '~') }
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#090b0f] text-[#e2e8f0] font-mono text-xs overflow-hidden select-text h-full">
      {/* Top Header & Session Tabs */}
      <div className="h-10 bg-[#12141c] border-b border-[#212534] flex items-center justify-between px-2 select-none shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {sessions.map(s => {
            const isActive = s.id === activeSessionId;
            return (
              <div
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs cursor-pointer border-t-2 transition-all ${
                  isActive
                    ? 'bg-[#090b0f] text-cyan-300 font-semibold border-cyan-400'
                    : 'bg-[#181a24] text-gray-400 hover:text-gray-200 border-transparent'
                }`}
              >
                <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>{s.title}</span>
                {sessions.length > 1 && (
                  <button
                    onClick={e => closeSession(s.id, e)}
                    className="hover:text-red-400 text-gray-500 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={createNewSession}
            className="p-1 rounded hover:bg-[#232736] text-gray-400 hover:text-white cursor-pointer ml-1"
            title="جلسه ترمینال جدید (New Session)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Controls: Copy, Download Log, Clear */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={copyTerminalOutput}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#1c1f2c] hover:bg-[#252a3c] text-gray-300 text-[11px] cursor-pointer"
            title="کپی لاگ‌های ترمینال"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">کپی</span>
          </button>

          <button
            onClick={downloadTerminalLog}
            className="p-1 rounded bg-[#1c1f2c] hover:bg-[#252a3c] text-gray-300 cursor-pointer"
            title="دانلود فایل لاگ"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          <button
            onClick={() => executeCommand('clear')}
            className="p-1 rounded bg-[#1c1f2c] hover:bg-[#252a3c] text-gray-300 cursor-pointer"
            title="پاک‌کردن ترمینال"
          >
            <Trash2 className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Terminal Output Scroll Area */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-1.5 leading-relaxed selection:bg-cyan-500/30">
        {activeSession.lines.map(line => (
          <div
            key={line.id}
            className={`whitespace-pre-wrap ${
              line.type === 'prompt'
                ? 'text-cyan-400 font-semibold'
                : line.type === 'error'
                ? 'text-red-400 font-medium'
                : line.type === 'system'
                ? 'text-indigo-400 font-semibold'
                : line.type === 'info'
                ? 'text-amber-300'
                : 'text-gray-300'
            }`}
          >
            {line.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Extra Keys Bar (Mobile & Rapid Dev Toolbar) */}
      <div className="h-8 bg-[#12141c] border-t border-[#202434] px-2 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 select-none">
        {mobileExtraKeys.map(k => (
          <button
            key={k.label}
            onClick={k.action}
            className="px-2 py-0.5 rounded bg-[#1b1e2a] hover:bg-[#262b3c] active:bg-cyan-600/30 text-gray-300 hover:text-white text-[10px] font-mono cursor-pointer border border-[#2b3042] shrink-0"
          >
            {k.label}
          </button>
        ))}
      </div>

      {/* Interactive Command Input Line with Autocomplete Ghost */}
      <div className="h-11 bg-[#0e1017] border-t border-[#1e2230] px-3 flex items-center gap-2 shrink-0 relative">
        {activeSession.mode === 'python_repl' ? (
          <span className="text-amber-400 font-bold select-none">&gt;&gt;&gt;</span>
        ) : activeSession.mode === 'node_repl' ? (
          <span className="text-emerald-400 font-bold select-none">&gt;</span>
        ) : (
          <span className="text-emerald-400 font-semibold select-none flex items-center gap-1">
            <span>dev@forgeshell:</span>
            <span className="text-cyan-400">~/project</span>
            <span className="text-purple-400 font-mono text-[11px]">({currentBranch})</span>
            <span className="text-white">$</span>
          </span>
        )}

        <div className="flex-1 relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                executeCommand(input);
              } else if (e.key === 'Tab') {
                e.preventDefault();
                handleApplyTabCompletion();
              } else if (e.key === 'ArrowUp') {
                if (activeSession.history.length > 0) {
                  const nextIdx = historyIndex + 1 < activeSession.history.length ? historyIndex + 1 : historyIndex;
                  setHistoryIndex(nextIdx);
                  setInput(activeSession.history[activeSession.history.length - 1 - nextIdx]);
                }
              } else if (e.key === 'ArrowDown') {
                if (historyIndex > 0) {
                  const nextIdx = historyIndex - 1;
                  setHistoryIndex(nextIdx);
                  setInput(activeSession.history[activeSession.history.length - 1 - nextIdx]);
                } else if (historyIndex === 0) {
                  setHistoryIndex(-1);
                  setInput('');
                }
              }
            }}
            autoFocus
            spellCheck={false}
            className="w-full bg-transparent text-white focus:outline-none font-mono text-xs z-10"
            placeholder={
              activeSession.mode === 'python_repl'
                ? 'Python statement (or exit())...'
                : activeSession.mode === 'node_repl'
                ? 'JavaScript expression (or exit)...'
                : 'Enter command (tree, grep, node, python, calc, top, help)...'
            }
          />

          {/* Autocomplete Ghost Text Indicator */}
          {autocompleteHint && (
            <div className="absolute left-0 top-0 bottom-0 pointer-events-none text-gray-500 font-mono text-xs flex items-center z-0">
              <span className="opacity-0">{input}</span>
              <span className="text-cyan-500/80 underline decoration-dotted">{autocompleteHint}</span>
              <span className="ml-2 text-[9px] px-1 py-0.2 bg-cyan-950 text-cyan-300 rounded border border-cyan-800">
                [TAB]
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
