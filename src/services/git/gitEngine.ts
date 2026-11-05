/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GitBranch, GitCommit, PullRequest, VFSFile } from '../../types';
import { CryptoUtils } from '../security/cryptoUtils';

const GIT_STORAGE_KEY = 'aetherforge_git_state';

export interface GitState {
  currentBranch: string;
  branches: GitBranch[];
  commits: GitCommit[];
  stagedFiles: string[];
  pullRequests: PullRequest[];
}

export class GitEngine {
  private state: GitState = {
    currentBranch: 'main',
    branches: [
      { name: 'main', commitHash: 'c1a90f2' },
      { name: 'feature/particles', commitHash: 'e48b11c' }
    ],
    commits: [
      {
        id: '1',
        hash: 'c1a90f2',
        message: 'Initial commit: Core 2D game engine and shader setup',
        author: 'Developer <dev@aetherforge.studio>',
        timestamp: Date.now() - 3600000 * 24,
        files: { '/src/game2d.js': 'Initial setup' },
        branch: 'main'
      },
      {
        id: '2',
        hash: 'e48b11c',
        message: 'Add dynamic particle emitter and audio jump synthesis',
        author: 'Developer <dev@aetherforge.studio>',
        timestamp: Date.now() - 3600000 * 4,
        files: { '/src/game2d.js': 'Added particle emitter' },
        branch: 'feature/particles'
      }
    ],
    stagedFiles: [],
    pullRequests: [
      {
        id: 'pr_1',
        title: 'Add particle burst physics and sound synthesizers',
        sourceBranch: 'feature/particles',
        targetBranch: 'main',
        status: 'open',
        description: 'Implements particle pooling for jump/coin events and connects Web Audio oscillator sound hooks.',
        createdAt: Date.now() - 3600000 * 3
      }
    ]
  };

  constructor() {
    this.load();
  }

  private load() {
    const raw = localStorage.getItem(GIT_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.currentBranch && parsed.branches) {
          this.state = parsed;
        }
      } catch (e) {
        console.warn('Failed to load git state', e);
      }
    }
  }

  private save() {
    try {
      localStorage.setItem(GIT_STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save git state', e);
    }
  }

  public getState(): GitState {
    return { ...this.state };
  }

  public getBranches(): GitBranch[] {
    return this.state.branches;
  }

  public getCurrentBranch(): string {
    return this.state.currentBranch;
  }

  public getCommits(): GitCommit[] {
    return this.state.commits;
  }

  public getPullRequests(): PullRequest[] {
    return this.state.pullRequests;
  }

  public createBranch(name: string): boolean {
    if (this.state.branches.some(b => b.name === name)) return false;
    const currentCommit = this.state.commits.find(c => c.branch === this.state.currentBranch)?.hash || 'head000';
    this.state.branches.push({ name, commitHash: currentCommit });
    this.save();
    return true;
  }

  public checkout(branchName: string): boolean {
    const branch = this.state.branches.find(b => b.name === branchName);
    if (!branch) return false;
    this.state.currentBranch = branchName;
    this.save();
    return true;
  }

  public stageFile(path: string): void {
    if (!this.state.stagedFiles.includes(path)) {
      this.state.stagedFiles.push(path);
      this.save();
    }
  }

  public unstageFile(path: string): void {
    this.state.stagedFiles = this.state.stagedFiles.filter(p => p !== path);
    this.save();
  }

  public commit(message: string, currentFiles: VFSFile[]): GitCommit {
    const hash = CryptoUtils.generateHexHash(7);
    const filesSnapshot: Record<string, string> = {};
    currentFiles.forEach(f => {
      filesSnapshot[f.path] = f.content;
    });

    const newCommit: GitCommit = {
      id: CryptoUtils.generateId('commit', 8),
      hash,
      message,
      author: 'Studio Creator <creator@aetherforge.dev>',
      timestamp: Date.now(),
      files: filesSnapshot,
      branch: this.state.currentBranch
    };

    this.state.commits.unshift(newCommit);
    // Update branch head
    const b = this.state.branches.find(br => br.name === this.state.currentBranch);
    if (b) b.commitHash = hash;
    this.state.stagedFiles = [];
    this.save();
    return newCommit;
  }

  public createPullRequest(title: string, description: string, source: string, target: string = 'main'): PullRequest {
    const pr: PullRequest = {
      id: CryptoUtils.generateId('pr', 8),
      title,
      description,
      sourceBranch: source,
      targetBranch: target,
      status: 'open',
      createdAt: Date.now()
    };
    this.state.pullRequests.unshift(pr);
    this.save();
    return pr;
  }

  public mergePullRequest(prId: string): boolean {
    const pr = this.state.pullRequests.find(p => p.id === prId);
    if (!pr || pr.status !== 'open') return false;
    pr.status = 'merged';

    // Create a merge commit
    const hash = CryptoUtils.generateHexHash(7);
    this.state.commits.unshift({
      id: 'commit_' + Date.now(),
      hash,
      message: `Merge pull request #${pr.id.slice(-4)} from ${pr.sourceBranch} into ${pr.targetBranch}`,
      author: 'AetherForge Bot <git@aetherforge.dev>',
      timestamp: Date.now(),
      files: {},
      branch: pr.targetBranch
    });

    this.save();
    return true;
  }
}

export const gitEngine = new GitEngine();
