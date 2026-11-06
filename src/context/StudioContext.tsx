/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { WorkspaceMode, Language, Theme, VFSFile, StudioAsset } from '../types';
import { vfsInstance } from '../services/vfs/fileSystem';
import { soundSynth } from '../services/audio/synth';

interface StudioContextType {
  workspace: WorkspaceMode;
  setWorkspace: (ws: WorkspaceMode) => void;
  files: VFSFile[];
  activeFile: VFSFile;
  setActiveFile: (file: VFSFile) => void;
  saveActiveFileContent: (content: string) => void;
  createNewFile: (path: string, content?: string) => void;
  deleteFile: (path: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  fps: number;
  setFps: (fps: number) => void;
  consoleLogs: { type: 'log' | 'warn' | 'error' | 'info'; text: string; time: string }[];
  addLog: (text: string, type?: 'log' | 'warn' | 'error' | 'info') => void;
  clearLogs: () => void;
  custom3DModelCode: string;
  setCustom3DModelCode: (code: string) => void;
  activeTextureUrl: string | null;
  setActiveTextureUrl: (url: string | null) => void;
}

const StudioContext = createContext<StudioContextType | null>(null);

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspace, setWorkspace] = useState<WorkspaceMode>('game');
  const [files, setFiles] = useState<VFSFile[]>(() => vfsInstance.getFiles());
  const [activeFile, setActiveFile] = useState<VFSFile>(() => vfsInstance.getFiles()[0]);
  const [language, setLanguage] = useState<Language>('fa'); // Default to Persian as requested by user
  const [theme, setTheme] = useState<Theme>('dark');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [fps, setFps] = useState<number>(60);
  const [consoleLogs, setConsoleLogs] = useState<{ type: 'log' | 'warn' | 'error' | 'info'; text: string; time: string }[]>([
    { type: 'info', text: 'AetherForge Studio v2.4 initialized in offline mode.', time: '00:00:01' },
    { type: 'log', text: 'All sub-systems ready: 3D Studio, Physics Engine, WebGL Shader pipeline, VFS.', time: '00:00:02' }
  ]);
  const [custom3DModelCode, setCustom3DModelCode] = useState<string>('');
  const [activeTextureUrl, setActiveTextureUrl] = useState<string | null>(null);

  // Sync files list when VFS updates
  const refreshFiles = () => {
    const list = vfsInstance.getFiles();
    setFiles([...list]);
  };

  const saveActiveFileContent = (content: string) => {
    if (!activeFile) return;
    const updated = vfsInstance.saveFile(activeFile.path, content);
    setActiveFile({ ...updated });
    refreshFiles();
  };

  const createNewFile = (path: string, content: string = '') => {
    const newF = vfsInstance.createFile(path, content);
    refreshFiles();
    setActiveFile(newF);
    addLog(`File created: ${path}`, 'info');
  };

  const deleteFile = (path: string) => {
    vfsInstance.deleteFile(path);
    refreshFiles();
    const remaining = vfsInstance.getFiles();
    if (remaining.length > 0) setActiveFile(remaining[0]);
    addLog(`File deleted: ${path}`, 'warn');
  };

  const addLog = (text: string, type: 'log' | 'warn' | 'error' | 'info' = 'log') => {
    const time = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [...prev.slice(-150), { type, text, time }]);
  };

  const clearLogs = () => {
    setConsoleLogs([]);
  };

  return (
    <StudioContext.Provider
      value={{
        workspace,
        setWorkspace,
        files,
        activeFile,
        setActiveFile,
        saveActiveFileContent,
        createNewFile,
        deleteFile,
        language,
        setLanguage,
        theme,
        setTheme,
        isPlaying,
        setIsPlaying,
        fps,
        setFps,
        consoleLogs,
        addLog,
        clearLogs,
        custom3DModelCode,
        setCustom3DModelCode,
        activeTextureUrl,
        setActiveTextureUrl
      }}
    >
      {children}
    </StudioContext.Provider>
  );
};

export const useStudio = () => {
  const context = useContext(StudioContext);
  if (!context) throw new Error('useStudio must be used within StudioProvider');
  return context;
};
