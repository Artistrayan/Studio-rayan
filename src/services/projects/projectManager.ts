/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VFSFile } from '../../types';
import { DEFAULT_FILES } from '../vfs/fileSystem';
import { ProjectTemplateId, PROJECT_TEMPLATES } from './projectTemplates';
import { idbAdapter } from '../vfs/indexedDBAdapter';
import { FileSanitizer } from '../vfs/fileSanitizer';
import { CryptoUtils } from '../security/cryptoUtils';

export interface ProjectSnapshot {
  id: string;
  projectId: string;
  versionLabel: string;
  timestamp: number;
  files: VFSFile[];
}

export interface StudioProject {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  files: VFSFile[];
  template: ProjectTemplateId | 'default';
  snapshots?: ProjectSnapshot[];
}

const PROJECTS_STORAGE_KEY = 'aetherforge_all_projects';
const ACTIVE_PROJECT_ID_KEY = 'aetherforge_active_project_id';

export const POLITICAL_GAME_DEFAULT_FILES: VFSFile[] = [
  {
    id: 'pol_1',
    name: 'political_sim.js',
    path: '/src/political_sim.js',
    language: 'javascript',
    content: `// === AetherForge Political & Statecraft Strategy Engine ===
// Playable simulation of national state, cabinet decisions, and public approval

const state = {
  approval: 65,      // % Public Approval
  treasury: 500,     // Million USD Budget
  security: 70,      // % Defense & Stability
  liberty: 60,       // % Civil Liberties
  corruption: 25,    // % Corruption Index
  year: 2026,
  turn: 1,
  history: []
};

// Current Policy Decrees
const decisions = [
  {
    title: "National Clean Energy Transition Act",
    desc: "Subsidize renewable solar & wind infrastructure across rural provinces.",
    effects: { approval: +8, treasury: -60, liberty: +4, security: +2 }
  },
  {
    title: "Emergency Security Border Modernization",
    desc: "Deploy radar arrays and autonomous patrol drones to protect strategic corridors.",
    effects: { approval: -3, treasury: -90, liberty: -6, security: +15 }
  },
  {
    title: "Anti-Corruption Whistleblower Protection",
    desc: "Empower independent judiciary to audit state ministry contracts.",
    effects: { approval: +12, treasury: +20, liberty: +10, corruption: -15 }
  }
];

function enactDecision(idx) {
  const d = decisions[idx];
  if (!d) return;
  console.log("Enacting Decree: " + d.title);
  for (const [key, val] of Object.entries(d.effects)) {
    if (state[key] !== undefined) state[key] = Math.max(0, Math.min(100, state[key] + val));
  }
  state.turn++;
  console.log("Updated National Metrics:", JSON.stringify(state));
}

// Enact first decree
enactDecision(0);
console.log("Statecraft simulation ready for cabinet orders.");
`
  }
];

export class ProjectManager {
  private projects: StudioProject[] = [];
  private activeProjectId: string = '';

  constructor() {
    this.init();
  }

  private async init() {
    let loadedFromIDB = false;
    try {
      const idbProjects = await idbAdapter.getAll<StudioProject>('projects');
      if (idbProjects && idbProjects.length > 0) {
        this.projects = idbProjects;
        loadedFromIDB = true;
      }
    } catch (e) {
      console.warn('Failed to load from IndexedDB, using localStorage', e);
    }

    if (!loadedFromIDB && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (raw) {
        try {
          const parsed: StudioProject[] = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.projects = parsed;
          }
        } catch (e) {
          console.warn('Failed to parse projects list', e);
        }
      }
    }

    if (this.projects.length === 0) {
      const defaultProject: StudioProject = {
        id: 'proj_default',
        name: 'AetherForge Primary Game',
        description: 'Main project with 2D physics engine, 3D studio, and GLSL shaders.',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        files: [...DEFAULT_FILES],
        template: 'default',
        snapshots: [
          {
            id: CryptoUtils.generateId('snap', 8),
            projectId: 'proj_default',
            versionLabel: 'v1.0 Initial Boot',
            timestamp: Date.now(),
            files: [...DEFAULT_FILES]
          }
        ]
      };
      this.projects = [defaultProject];
      this.saveProjectsToStorage();
    }

    if (typeof localStorage !== 'undefined') {
      const savedActive = localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
      if (savedActive && this.projects.some(p => p.id === savedActive)) {
        this.activeProjectId = savedActive;
      } else {
        this.activeProjectId = this.projects[0].id;
      }
    } else {
      this.activeProjectId = this.projects[0].id;
    }
  }

  public getProjects(): StudioProject[] {
    return [...this.projects];
  }

  public getActiveProject(): StudioProject {
    return this.projects.find(p => p.id === this.activeProjectId) || this.projects[0];
  }

  public setActiveProject(id: string): StudioProject | null {
    const proj = this.projects.find(p => p.id === id);
    if (!proj) return null;
    this.activeProjectId = id;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_PROJECT_ID_KEY, id);
    }
    return proj;
  }

  public createProject(
    name: string,
    description: string = '',
    template: ProjectTemplateId | 'default' = 'default'
  ): StudioProject {
    let files: VFSFile[] = [...DEFAULT_FILES];
    const tmpl = PROJECT_TEMPLATES.find(t => t.id === template);
    if (tmpl && tmpl.files.length > 0) {
      files = [...tmpl.files, ...DEFAULT_FILES.filter(df => !tmpl.files.some(tf => tf.path === df.path))];
    } else if (template === ('political_strategy' as any)) {
      files = [...POLITICAL_GAME_DEFAULT_FILES];
    }

    const projectId = CryptoUtils.generateId('proj', 10);
    const newProject: StudioProject = {
      id: projectId,
      name: name.trim() || 'New Project',
      description: description || (tmpl ? tmpl.descriptionFa : 'Custom Project'),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      files,
      template,
      snapshots: [
        {
          id: CryptoUtils.generateId('snap', 8),
          projectId,
          versionLabel: 'v1.0 Initial Creation',
          timestamp: Date.now(),
          files: [...files]
        }
      ]
    };

    this.projects.unshift(newProject);
    this.activeProjectId = newProject.id;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_PROJECT_ID_KEY, newProject.id);
    }
    this.saveProjectsToStorage();
    return newProject;
  }

  public duplicateProject(projectId: string): StudioProject | null {
    const target = this.projects.find(p => p.id === projectId);
    if (!target) return null;

    const newId = CryptoUtils.generateId('proj', 10);
    const duplicated: StudioProject = {
      id: newId,
      name: `${target.name} (Copy)`,
      description: target.description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      files: JSON.parse(JSON.stringify(target.files)),
      template: target.template,
      snapshots: [
        {
          id: CryptoUtils.generateId('snap', 8),
          projectId: newId,
          versionLabel: 'v1.0 Duplicated Copy',
          timestamp: Date.now(),
          files: JSON.parse(JSON.stringify(target.files))
        }
      ]
    };

    this.projects.unshift(duplicated);
    this.activeProjectId = duplicated.id;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_PROJECT_ID_KEY, duplicated.id);
    }
    this.saveProjectsToStorage();
    return duplicated;
  }

  // PROJECT VERSION HISTORY & SNAPSHOT SYSTEM
  public createSnapshot(projectId?: string, label?: string): ProjectSnapshot | null {
    const target = projectId ? this.projects.find(p => p.id === projectId) : this.getActiveProject();
    if (!target) return null;

    if (!target.snapshots) target.snapshots = [];
    const count = target.snapshots.length + 1;
    const snapshot: ProjectSnapshot = {
      id: 'snap_' + Date.now(),
      projectId: target.id,
      versionLabel: label || `v1.${count} Snapshot (${new Date().toLocaleTimeString()})`,
      timestamp: Date.now(),
      files: JSON.parse(JSON.stringify(target.files))
    };

    target.snapshots.unshift(snapshot);
    this.saveProjectsToStorage();
    return snapshot;
  }

  public rollbackToSnapshot(snapshotId: string): boolean {
    const target = this.getActiveProject();
    if (!target || !target.snapshots) return false;

    const snap = target.snapshots.find(s => s.id === snapshotId);
    if (!snap) return false;

    target.files = JSON.parse(JSON.stringify(snap.files));
    target.updatedAt = Date.now();
    this.saveProjectsToStorage();
    return true;
  }

  public renameProject(id: string, newName: string): boolean {
    const proj = this.projects.find(p => p.id === id);
    if (!proj || !newName.trim()) return false;
    proj.name = newName.trim();
    proj.updatedAt = Date.now();
    this.saveProjectsToStorage();
    return true;
  }

  public deleteProject(id: string): boolean {
    if (this.projects.length <= 1) return false;
    this.projects = this.projects.filter(p => p.id !== id);
    if (this.activeProjectId === id) {
      this.activeProjectId = this.projects[0].id;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(ACTIVE_PROJECT_ID_KEY, this.activeProjectId);
      }
    }
    this.saveProjectsToStorage();
    return true;
  }

  public saveCurrentProjectFiles(files: VFSFile[]): void {
    const proj = this.getActiveProject();
    if (proj) {
      proj.files = [...files];
      proj.updatedAt = Date.now();
      this.saveProjectsToStorage();
    }
  }

  public exportProjectJSON(id?: string): string {
    const target = id ? this.projects.find(p => p.id === id) : this.getActiveProject();
    return JSON.stringify(target || this.getActiveProject(), null, 2);
  }

  // PROJECT IMPORT SCHEMA VALIDATOR WITH MALWARE & CORRUPTION SANITIZER
  public validateProjectJSON(jsonString: string): { valid: boolean; error?: string; project?: StudioProject } {
    try {
      const sanitizedRoot = FileSanitizer.sanitizeImportedFile('project.json', jsonString);
      if (!sanitizedRoot.valid) {
        return { valid: false, error: `فایل پروژه نامعتبر است: ${sanitizedRoot.error}` };
      }

      const parsed = JSON.parse(sanitizedRoot.cleanContent || jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return { valid: false, error: 'تغییرات فایل JSON نامعتبر است (فرمت غیر استاندارد).' };
      }
      if (!parsed.name || typeof parsed.name !== 'string') {
        return { valid: false, error: 'فایل پروژه نامعتبر است: نام پروژه (name) وجود ندارد.' };
      }
      if (!Array.isArray(parsed.files) || parsed.files.length === 0) {
        return { valid: false, error: 'فایل پروژه نامعتبر است: فهرست فایل‌های پروژه (files) خالی است.' };
      }
      for (const f of parsed.files) {
        if (!f.path || typeof f.content !== 'string') {
          return { valid: false, error: `فایل ساختاری نامعتبر در پروژه: ${f.name || 'آدرس نامشخص'}` };
        }
        // Sanitize individual file contents
        const fileCheck = FileSanitizer.sanitizeImportedFile(f.name || f.path, f.content);
        if (!fileCheck.valid) {
          return { valid: false, error: `محتوای آلوده یا خراب در فایل ${f.name}: ${fileCheck.error}` };
        }
        if (fileCheck.cleanContent) {
          f.content = fileCheck.cleanContent;
        }
      }
      return { valid: true, project: parsed };
    } catch (e: any) {
      return { valid: false, error: `خطای سینتکس در فایل JSON: ${e.message}` };
    }
  }

  public importProjectJSON(jsonString: string): StudioProject | null {
    const validation = this.validateProjectJSON(jsonString);
    if (!validation.valid || !validation.project) {
      console.warn('Import failed:', validation.error);
      return null;
    }

    const parsed = validation.project;
    const importedProject: StudioProject = {
      id: 'proj_' + Date.now(),
      name: parsed.name + ' (Imported)',
      description: parsed.description || 'Imported project file',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      files: parsed.files,
      template: parsed.template || 'default',
      snapshots: parsed.snapshots || []
    };

    this.projects.unshift(importedProject);
    this.activeProjectId = importedProject.id;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_PROJECT_ID_KEY, importedProject.id);
    }
    this.saveProjectsToStorage();
    return importedProject;
  }

  // ATOMIC PERSISTENCE & AUTO-SAVE TO INDEXEDDB + LOCALSTORAGE
  private saveProjectsToStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(this.projects));
      }
    } catch (e) {
      console.warn('LocalStorage quota exceeded, relying on IndexedDB', e);
    }

    // Persist to IndexedDB
    this.projects.forEach(p => {
      idbAdapter.setItem('projects', p.id, p);
    });
  }
}

export const projectManager = new ProjectManager();
