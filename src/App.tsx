/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StudioProvider, useStudio } from './context/StudioContext';
import { TopNavBar } from './components/layout/TopNavBar';
import { StatusBar } from './components/layout/StatusBar';
import { GameViewport } from './components/game/GameViewport';
import { CodeEditor } from './components/editor/CodeEditor';
import { Studio3DView } from './components/studio3d/Studio3DView';
import { VisualGraph } from './components/nocode/VisualGraph';
import { TextureWorkshop } from './components/textures/TextureWorkshop';
import { TermuxTerminal } from './components/terminal/TermuxTerminal';
import { GitView } from './components/git/GitView';
import { ExportView } from './components/export/ExportView';
import { AssetLibraryView } from './components/assets/AssetLibraryView';
import { PoliticalGameStudio } from './components/political/PoliticalGameStudio';
import { TilemapEditor } from './components/level/TilemapEditor';
import { AudioSynthStudio } from './components/audio/AudioSynthStudio';
import { ParticleSystemDesigner } from './components/particles/ParticleSystemDesigner';
import { AIBehaviorTreeStudio } from './components/ai/AIBehaviorTreeStudio';
import { AICharacterStudio } from './components/ai/AICharacterStudio';
import { PixelSpriteAnimator } from './components/sprites/PixelSpriteAnimator';
import { VisualUIBuilder } from './components/uibuilder/VisualUIBuilder';
import { LocalDatabaseStudio } from './components/database/LocalDatabaseStudio';
import { APIClientStudio } from './components/api/APIClientStudio';
import { PerformanceProfiler } from './components/debugger/PerformanceProfiler';

const StudioMain: React.FC = () => {
  const { workspace, language, theme } = useStudio();

  return (
    <div
      dir={language === 'fa' ? 'rtl' : 'ltr'}
      className={`w-screen h-screen flex flex-col overflow-hidden ${
        theme === 'dark' ? 'bg-[#121316] text-[#e1e4ea]' : 'bg-[#f4f5f8] text-[#1c1e24]'
      }`}
    >
      {/* Top Application Bar */}
      <TopNavBar />

      {/* Main Dynamic Workspace Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {workspace === 'game' && <GameViewport />}
        {workspace === 'tilemap' && <TilemapEditor />}
        {workspace === 'audio_synth' && <AudioSynthStudio />}
        {workspace === 'particles' && <ParticleSystemDesigner />}
        {workspace === 'ai_behavior' && <AIBehaviorTreeStudio />}
        {workspace === 'ai_character' && <AICharacterStudio />}
        {workspace === 'sprites' && <PixelSpriteAnimator />}
        {workspace === 'uibuilder' && <VisualUIBuilder />}
        {workspace === 'database' && <LocalDatabaseStudio />}
        {workspace === 'apiclient' && <APIClientStudio />}
        {workspace === 'profiler' && <PerformanceProfiler />}
        {workspace === 'code' && <CodeEditor />}
        {workspace === '3d_studio' && <Studio3DView />}
        {workspace === 'political' && <PoliticalGameStudio />}
        {workspace === 'nocode' && <VisualGraph />}
        {workspace === 'textures' && <TextureWorkshop />}
        {workspace === 'terminal' && <TermuxTerminal />}
        {workspace === 'git' && <GitView />}
        {workspace === 'export' && <ExportView />}
        {workspace === 'assets' && <AssetLibraryView />}
      </main>

      {/* Bottom Global Status Bar */}
      <StatusBar />
    </div>
  );
};

export default function App() {
  return (
    <StudioProvider>
      <StudioMain />
    </StudioProvider>
  );
}
