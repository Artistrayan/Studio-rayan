/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VFSFile } from '../../types';
import { DEFAULT_FILES } from '../vfs/fileSystem';
import { ProjectTemplateId, PROJECT_TEMPLATES } from './projectTemplates';

export interface StudioProject {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  files: VFSFile[];
  template: ProjectTemplateId | 'default';
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

  private init() {
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

    if (this.projects.length === 0) {
      const defaultProject: StudioProject = {
        id: 'proj_default',
        name: 'AetherForge Primary Game',
        description: 'Main project with 2D physics engine, 3D studio, and GLSL shaders.',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        files: [...DEFAULT_FILES],
        template: 'default'
      };
      const polProject: StudioProject = {
        id: 'proj_political',
        name: 'استراتژی سیاسی و دولت‌داری (Statecraft)',
        description: 'شبیه‌ساز بازی سیاسی، مدیریت بودجه، محبوبیت مردمی، احزاب و بحران‌های بین‌المللی.',
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 1800000,
        files: [...POLITICAL_GAME_DEFAULT_FILES],
        template: 'political_strategy'
      };
      this.projects = [defaultProject, polProject];
      this.saveProjectsToStorage();
    }

    const savedActive = localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
    if (savedActive && this.projects.some(p => p.id === savedActive)) {
      this.activeProjectId = savedActive;
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
    localStorage.setItem(ACTIVE_PROJECT_ID_KEY, id);
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
    } else if (template === 'political_strategy' as any) {
      files = [...POLITICAL_GAME_DEFAULT_FILES];
    }

    const newProject: StudioProject = {
      id: 'proj_' + Date.now() + Math.random().toString(36).substring(2, 6),
      name: name.trim() || 'New Project',
      description: description || (tmpl ? tmpl.descriptionFa : 'Custom Project'),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      files,
      template
    };

    this.projects.unshift(newProject);
    this.activeProjectId = newProject.id;
    localStorage.setItem(ACTIVE_PROJECT_ID_KEY, newProject.id);
    this.saveProjectsToStorage();
    return newProject;
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
    if (this.projects.length <= 1) return false; // Keep at least one project
    this.projects = this.projects.filter(p => p.id !== id);
    if (this.activeProjectId === id) {
      this.activeProjectId = this.projects[0].id;
      localStorage.setItem(ACTIVE_PROJECT_ID_KEY, this.activeProjectId);
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

  public importProjectJSON(jsonString: string): StudioProject | null {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.name && Array.isArray(parsed.files)) {
        const importedProject: StudioProject = {
          id: 'proj_' + Date.now(),
          name: parsed.name + ' (Imported)',
          description: parsed.description || 'Imported project file',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          files: parsed.files,
          template: parsed.template || 'default'
        };
        this.projects.unshift(importedProject);
        this.activeProjectId = importedProject.id;
        localStorage.setItem(ACTIVE_PROJECT_ID_KEY, importedProject.id);
        this.saveProjectsToStorage();
        return importedProject;
      }
    } catch (e) {
      console.error('Invalid project JSON', e);
    }
    return null;
  }

  private saveProjectsToStorage() {
    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(this.projects));
    } catch (e) {
      console.warn('Failed to persist projects to storage', e);
    }
  }
}

export const projectManager = new ProjectManager();
