/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import { gitEngine } from '../../services/git/gitEngine';
import { translations } from '../../services/i18n';
import { soundSynth } from '../../services/audio/synth';
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  Plus,
  Check,
  CheckCircle2,
  Clock,
  User,
  GitMerge,
  FileText
} from 'lucide-react';

export const GitView: React.FC = () => {
  const { files, language, addLog } = useStudio();
  const t = translations[language];

  const [gitState, setGitState] = useState(() => gitEngine.getState());
  const [activeTab, setActiveTab] = useState<'commits' | 'branches' | 'prs'>('commits');
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [newBranchName, setNewBranchName] = useState<string>('');
  const [newPrTitle, setNewPrTitle] = useState<string>('');
  const [newPrDesc, setNewPrDesc] = useState<string>('');
  const [showNewPrModal, setShowNewPrModal] = useState<boolean>(false);

  const refreshState = () => {
    setGitState(gitEngine.getState());
  };

  const handleCommit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) return;

    soundSynth.playCoin();
    const commit = gitEngine.commit(commitMessage.trim(), files);
    setCommitMessage('');
    refreshState();
    addLog(`Committed [${commit.hash}]: ${commit.message}`, 'info');
  };

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    soundSynth.playLaser();
    gitEngine.createBranch(newBranchName.trim());
    gitEngine.checkout(newBranchName.trim());
    setNewBranchName('');
    refreshState();
    addLog(`Created and checked out branch: ${newBranchName}`, 'info');
  };

  const handleCheckout = (branchName: string) => {
    gitEngine.checkout(branchName);
    soundSynth.playJump();
    refreshState();
    addLog(`Switched to branch: ${branchName}`, 'info');
  };

  const handleCreatePR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrTitle.trim()) return;

    soundSynth.playLaser();
    gitEngine.createPullRequest(newPrTitle, newPrDesc, gitState.currentBranch, 'main');
    setNewPrTitle('');
    setNewPrDesc('');
    setShowNewPrModal(false);
    refreshState();
    addLog(`Opened Pull Request: ${newPrTitle}`, 'info');
  };

  const handleMergePR = (prId: string) => {
    soundSynth.playPowerup();
    gitEngine.mergePullRequest(prId);
    refreshState();
    addLog(`Merged Pull Request #${prId}`, 'info');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#14161b] relative overflow-hidden h-full">
      {/* Top Bar Tabs */}
      <div className="h-10 bg-[#1a1c23] border-b border-[#2b2e38] flex items-center justify-between px-3 text-xs shrink-0 select-none">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('commits')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded cursor-pointer ${
              activeTab === 'commits'
                ? 'bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/40'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Commits ({gitState.commits.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('branches')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded cursor-pointer ${
              activeTab === 'branches'
                ? 'bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/40'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Branches ({gitState.branches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('prs')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded cursor-pointer ${
              activeTab === 'prs'
                ? 'bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/40'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <GitPullRequest className="w-3.5 h-3.5" />
            <span>Pull Requests ({gitState.pullRequests.length})</span>
          </button>
        </div>

        {/* Current Branch Tag */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-gray-400">Head:</span>
          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
            {gitState.currentBranch}
          </span>
        </div>
      </div>

      {/* Main Git Content */}
      <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full text-xs">
        {/* COMMITS VIEW */}
        {activeTab === 'commits' && (
          <div className="flex flex-col gap-4">
            {/* Commit Box */}
            <form onSubmit={handleCommit} className="bg-[#181a24] p-3 rounded-lg border border-[#2c3040] shadow-md">
              <span className="text-gray-300 font-semibold block mb-2">Stage & Commit Changes</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Commit message (e.g. Add jump mechanics and particles)..."
                  value={commitMessage}
                  onChange={e => setCommitMessage(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-[#101217] border border-[#2b2f3e] rounded text-white text-xs focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium cursor-pointer shadow-md"
                >
                  Commit
                </button>
              </div>
            </form>

            {/* Commit History List */}
            <div className="space-y-2">
              <span className="text-gray-400 font-medium text-[11px] uppercase tracking-wider block">Commit Log</span>
              {gitState.commits.map(c => (
                <div key={c.id} className="bg-[#181a22] p-3 rounded-lg border border-[#262936] flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-gray-200 text-xs">{c.message}</span>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1 font-mono text-cyan-400">
                        <User className="w-3 h-3" /> {c.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(c.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-[#242735] text-[10px] text-gray-300 font-mono">
                        {c.branch}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40 text-[11px]">
                    {c.hash}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BRANCHES VIEW */}
        {activeTab === 'branches' && (
          <div className="flex flex-col gap-4">
            {/* Create Branch */}
            <form onSubmit={handleCreateBranch} className="bg-[#181a24] p-3 rounded-lg border border-[#2c3040]">
              <span className="text-gray-300 font-semibold block mb-2">Create New Branch</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Branch name (e.g. feature/audio-synth)..."
                  value={newBranchName}
                  onChange={e => setNewBranchName(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-[#101217] border border-[#2b2f3e] rounded text-white text-xs focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium cursor-pointer"
                >
                  Create & Switch
                </button>
              </div>
            </form>

            {/* Branches List */}
            <div className="space-y-2">
              {gitState.branches.map(b => {
                const isCurrent = b.name === gitState.currentBranch;
                return (
                  <div
                    key={b.name}
                    className="bg-[#181a22] p-3 rounded-lg border border-[#262936] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <GitBranch className={`w-4 h-4 ${isCurrent ? 'text-cyan-400' : 'text-gray-500'}`} />
                      <span className={`font-mono text-xs ${isCurrent ? 'font-bold text-white' : 'text-gray-300'}`}>
                        {b.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800">
                          CURRENT
                        </span>
                      )}
                    </div>

                    {!isCurrent && (
                      <button
                        onClick={() => handleCheckout(b.name)}
                        className="px-2.5 py-1 rounded bg-[#252834] hover:bg-[#303546] text-gray-300 cursor-pointer"
                      >
                        Checkout
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PULL REQUESTS VIEW */}
        {activeTab === 'prs' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-200">Internal Pull Requests</span>
              <button
                onClick={() => setShowNewPrModal(!showNewPrModal)}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Pull Request</span>
              </button>
            </div>

            {/* Create PR Form */}
            {showNewPrModal && (
              <form onSubmit={handleCreatePR} className="bg-[#181a24] p-3 rounded-lg border border-[#2c3040] space-y-2">
                <input
                  type="text"
                  placeholder="PR Title..."
                  value={newPrTitle}
                  onChange={e => setNewPrTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#101217] border border-[#2b2f3e] rounded text-white text-xs focus:outline-none"
                />
                <textarea
                  rows={2}
                  placeholder="Description of changes..."
                  value={newPrDesc}
                  onChange={e => setNewPrDesc(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#101217] border border-[#2b2f3e] rounded text-white text-xs focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewPrModal(false)}
                    className="px-3 py-1 rounded bg-[#252834] text-gray-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium cursor-pointer"
                  >
                    Open PR
                  </button>
                </div>
              </form>
            )}

            {/* PR List */}
            <div className="space-y-2">
              {gitState.pullRequests.map(pr => (
                <div key={pr.id} className="bg-[#181a22] p-3 rounded-lg border border-[#262936] flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-200">{pr.title}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${
                          pr.status === 'open'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                        }`}
                      >
                        {pr.status}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs">{pr.description}</p>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-400 mt-1">
                      <span>{pr.sourceBranch}</span>
                      <span>&rarr;</span>
                      <span>{pr.targetBranch}</span>
                    </div>
                  </div>

                  {pr.status === 'open' && (
                    <button
                      onClick={() => handleMergePR(pr.id)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium cursor-pointer shadow-md"
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                      <span>Merge</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
