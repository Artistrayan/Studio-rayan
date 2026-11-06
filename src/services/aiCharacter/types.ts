/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ImageModelType =
  | 'FLUX.2 Max'
  | 'GPT Image'
  | 'Google Nano Banana'
  | 'Seedream 5 Pro'
  | 'SDXL Custom';

export type IdentityEngineType =
  | 'PuLID'
  | 'IP-Adapter FaceID'
  | 'LoRA Dedicated'
  | 'Character Identity Lock';

export type PoseControlNetType =
  | 'OpenPose'
  | 'Depth ControlNet'
  | 'Canny ControlNet'
  | 'Inpainting'
  | 'None';

export type EnhancerType =
  | 'CodeFormer'
  | 'GFPGAN'
  | 'ADetailer'
  | 'SUPIR'
  | '4x-UltraSharp'
  | 'ESRGAN';

export type VideoModelType =
  | 'Wan 2.2'
  | 'LTX-2.3'
  | 'RIFE';

export type CameraMotion =
  | 'static'
  | 'pan_left'
  | 'pan_right'
  | 'tilt_up'
  | 'tilt_down'
  | 'zoom_in'
  | 'zoom_out'
  | 'orbital_360';

export interface FaceEmbeddingProfile {
  vector: number[]; // 512-dim normalized feature vector
  confidence: number;
  landmarks: { x: number; y: number }[];
  genderEstimate: string;
  ageEstimate: number;
  qualityScore: number;
}

export interface CharacterProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  ethnicity: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  defaultOutfit: string;
  facialFeatures: string;
  identityLock: boolean;
  referenceImages: string[];
  embedding: FaceEmbeddingProfile;
  loraModel: string;
  loraWeight: number;
  faceSimilarityThreshold: number;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface GenerationParams {
  characterId: string;
  prompt: string;
  negativePrompt?: string;
  model: ImageModelType;
  identityEngine: IdentityEngineType;
  poseControl: PoseControlNetType;
  poseReferenceImage?: string;
  aspectRatio: '1:1' | '9:16' | '16:9' | '4:5';
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  seed: number;
  enhancers: {
    codeformer: boolean;
    codeformerStrength: number;
    gfpgan: boolean;
    adetailer: boolean;
    supir: boolean;
    ultraSharp: boolean;
  };
  cameraAngle?: string;
  environmentSetting?: string;
}

export interface VideoGenerationParams {
  characterId: string;
  sourceImageUrl: string;
  prompt: string;
  videoModel: VideoModelType;
  durationSeconds: number;
  fps: 30 | 60;
  motionIntensity: number; // 1-10
  cameraMotion: CameraMotion;
  preserveIdentity: boolean;
  seed: number;
}

export interface OutputItem {
  id: string;
  characterId: string;
  characterName: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl: string;
  model: string;
  prompt: string;
  negativePrompt?: string;
  identitySimilarity: number;
  passedIdentityLock: boolean;
  resolution: { width: number; height: number };
  duration?: number;
  fps?: number;
  seed: number;
  enhancersApplied: EnhancerType[];
  workflowGraph?: Record<string, any>;
  timestamp: number;
}

export interface WorkflowTask {
  id: string;
  characterId: string;
  type: 'image' | 'video';
  model: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep: string;
  logs: string[];
  output?: OutputItem;
  error?: string;
  startTime: number;
  endTime?: number;
  gpuMemoryAllocatedMB: number;
}

export interface GPUResourceStatus {
  totalVRAM_MB: number;
  allocatedVRAM_MB: number;
  freeVRAM_MB: number;
  temperatureCelsius: number;
  utilizationPercent: number;
  activeModelsLoaded: string[];
  activeWorkers: number;
  queueDepth: number;
}
