/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type WorkspaceMode =
  | 'game'
  | 'tilemap'
  | 'audio_synth'
  | 'particles'
  | 'ai_behavior'
  | 'sprites'
  | 'uibuilder'
  | 'database'
  | 'apiclient'
  | 'profiler'
  | 'code'
  | '3d_studio'
  | 'political'
  | 'nocode'
  | 'textures'
  | 'terminal'
  | 'git'
  | 'export'
  | 'assets'
  | 'ai_character';


export type Language = 'en' | 'fa';
export type Theme = 'dark' | 'light';

export interface VFSFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: 'javascript' | 'typescript' | 'python' | 'lua' | 'glsl' | 'html' | 'css' | 'json' | 'markdown';
  isDirty?: boolean;
}

export interface VFSDirectory {
  id: string;
  name: string;
  path: string;
  children: (VFSFile | VFSDirectory)[];
}

export interface GitCommit {
  id: string;
  hash: string;
  message: string;
  author: string;
  timestamp: number;
  files: Record<string, string>;
  branch: string;
}

export interface GitBranch {
  name: string;
  commitHash: string;
}

export interface PullRequest {
  id: string;
  title: string;
  sourceBranch: string;
  targetBranch: string;
  status: 'open' | 'merged' | 'closed';
  description: string;
  createdAt: number;
}

// 3D Studio Types
export type MeshPrimitiveType =
  | 'cube'
  | 'sphere'
  | 'cylinder'
  | 'torus'
  | 'plane'
  | 'mech'
  | 'terrain'
  | 'parliament'
  | 'jet'
  | 'tank'
  | 'skyscraper'
  | 'satellite'
  | 'supercar'
  | 'throne';

export interface Transform3D {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface KeyframeData {
  time: number; // in seconds
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface ModelBone {
  id: string;
  name: string;
  parentId?: string;
  rotation: [number, number, number];
}

export interface MaterialProperties {
  color: string;
  roughness: number;
  metalness: number;
  wireframe: boolean;
  textureType: 'none' | 'checker' | 'noise' | 'grid' | 'rust';
}

// No-Code Logic Graph Types
export type NodeType = 
  | 'event_start'
  | 'event_update'
  | 'event_key'
  | 'event_click'
  | 'action_move'
  | 'action_rotate'
  | 'action_sound'
  | 'action_particles'
  | 'action_score'
  | 'logic_compare'
  | 'logic_delay'
  | 'variable';

export interface LogicNode {
  id: string;
  type: NodeType;
  title: string;
  x: number;
  y: number;
  inputs: { id: string; label: string; type: 'flow' | 'number' | 'string' }[];
  outputs: { id: string; label: string; type: 'flow' | 'number' | 'string' }[];
  params: Record<string, any>;
}

export interface NodeConnection {
  id: string;
  fromNodeId: string;
  fromOutputId: string;
  toNodeId: string;
  toInputId: string;
}

export interface WireframeElement {
  id: string;
  type: 'button' | 'joystick' | 'healthbar' | 'score' | 'card' | 'label' | 'toggle';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  actionHook: string;
}

// Asset Library Types
export interface StudioAsset {
  id: string;
  name: string;
  category: 'model' | 'texture' | 'sound' | 'particle';
  thumbnailUrl?: string;
  data: any;
  format: string;
}

// Game Engine Entity
export interface GameEntity {
  id: string;
  name: string;
  x: number;
  y: number;
  z?: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  type: 'player' | 'enemy' | 'platform' | 'coin' | 'bullet' | 'particle_emitter';
  isGrounded?: boolean;
}
