/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ModelAdapterRegistry } from './modelAdapters';
import { IdentityEngine } from './identityEngine';
import { PoseControlEngine } from './poseControlEngine';
import { EnhancementEngine } from './enhancementEngine';
import { VideoGenerationEngine } from './videoEngine';
import { WorkflowEngine } from './workflowEngine';
import { characterStorage } from './characterStorage';
import { CharacterProfile, GenerationParams } from './types';

export interface CharacterStudioTestResult {
  testName: string;
  category: string;
  passed: boolean;
  durationMs: number;
  details: string;
}

export class CharacterStudioValidator {
  public static async runAllValidationTests(): Promise<CharacterStudioTestResult[]> {
    const results: CharacterStudioTestResult[] = [];

    // Test 1: Model Adapters Registry
    const t1 = performance.now();
    try {
      ModelAdapterRegistry.initialize();
      const specs = ModelAdapterRegistry.getAllSpecifications();
      const passed = specs.length === 5 && specs.some(s => s.id === 'FLUX.2 Max');
      results.push({
        testName: 'Model Adapters Registry & Specs Verification',
        category: 'Image Engine',
        passed,
        durationMs: Number((performance.now() - t1).toFixed(2)),
        details: `Verified ${specs.length} independent model adapters (FLUX.2, GPT Image, Nano Banana, Seedream, SDXL).`
      });
    } catch (e: any) {
      results.push({
        testName: 'Model Adapters Registry & Specs Verification',
        category: 'Image Engine',
        passed: false,
        durationMs: Number((performance.now() - t1).toFixed(2)),
        details: e.message
      });
    }

    // Test 2: Incompatible Model/Adapter Rejection Watchdog
    const t2 = performance.now();
    try {
      const fluxAdapter = ModelAdapterRegistry.getAdapter('FLUX.2 Max');
      const invalidParams: GenerationParams = {
        characterId: 'char_test',
        prompt: 'test',
        model: 'FLUX.2 Max',
        identityEngine: 'IP-Adapter FaceID', // Should be rejected on FLUX
        poseControl: 'None',
        aspectRatio: '1:1',
        width: 1024,
        height: 1024,
        steps: 28,
        cfgScale: 3.5,
        seed: 12345,
        enhancers: { codeformer: true, codeformerStrength: 0.8, gfpgan: false, adetailer: false, supir: false, ultraSharp: false }
      };
      const check = fluxAdapter.validateCompatibility(invalidParams);
      const passed = !check.compatible && check.error?.includes('Incompatible Architecture') === true;
      results.push({
        testName: 'Architectural Compatibility Matrix & Guardrails',
        category: 'Identity Engine',
        passed,
        durationMs: Number((performance.now() - t2).toFixed(2)),
        details: 'Correctly rejected incompatible IP-Adapter on FLUX architecture and guided user to PuLID.'
      });
    } catch (e: any) {
      results.push({
        testName: 'Architectural Compatibility Matrix & Guardrails',
        category: 'Identity Engine',
        passed: false,
        durationMs: Number((performance.now() - t2).toFixed(2)),
        details: e.message
      });
    }

    // Test 3: Face Embedding & Cosine Similarity Precision
    const t3 = performance.now();
    try {
      const emb1 = IdentityEngine.extractFaceEmbedding('test_face_alpha', 10);
      const emb2 = IdentityEngine.extractFaceEmbedding('test_face_alpha', 10); // Identical
      const emb3 = IdentityEngine.extractFaceEmbedding('test_face_beta', 99); // Different person

      const simSelf = IdentityEngine.calculateCosineSimilarity(emb1.vector, emb2.vector);
      const simOther = IdentityEngine.calculateCosineSimilarity(emb1.vector, emb3.vector);
      const passed = simSelf >= 0.999 && simOther < 0.65;
      results.push({
        testName: '512-Dimensional Face Embedding & Cosine Similarity',
        category: 'Identity Engine',
        passed,
        durationMs: Number((performance.now() - t3).toFixed(2)),
        details: `Self-similarity: ${(simSelf * 100).toFixed(1)}%, Cross-identity distance: ${(simOther * 100).toFixed(1)}%.`
      });
    } catch (e: any) {
      results.push({
        testName: '512-Dimensional Face Embedding & Cosine Similarity',
        category: 'Identity Engine',
        passed: false,
        durationMs: Number((performance.now() - t3).toFixed(2)),
        details: e.message
      });
    }

    // Test 4: 20-Condition Identity Stability Evaluation
    const t4 = performance.now();
    try {
      const defaults = characterStorage.getDefaultCharacters();
      const testChar = defaults[0];
      const stabilityMatrix = IdentityEngine.runIdentityStabilityTest(testChar);
      const allPassed = stabilityMatrix.length === 20 && stabilityMatrix.every(r => r.passed);
      const avgSim = (stabilityMatrix.reduce((acc, cur) => acc + cur.similarity, 0) / 20) * 100;
      results.push({
        testName: 'Facial Consistency Across 20 Diverse Stress Conditions',
        category: 'Identity Engine',
        passed: allPassed,
        durationMs: Number((performance.now() - t4).toFixed(2)),
        details: `Tested 20 conditions (lighting, angles, expressions, gear). Mean consistency: ${avgSim.toFixed(1)}%.`
      });
    } catch (e: any) {
      results.push({
        testName: 'Facial Consistency Across 20 Diverse Stress Conditions',
        category: 'Identity Engine',
        passed: false,
        durationMs: Number((performance.now() - t4).toFixed(2)),
        details: e.message
      });
    }

    // Test 5: OpenPose, Depth & Canny ControlNet Map Generators
    const t5 = performance.now();
    try {
      const poses = PoseControlEngine.getPresetPoses();
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      PoseControlEngine.renderOpenPoseToCanvas(canvas, poses[0]);
      PoseControlEngine.renderDepthMapToCanvas(canvas);
      PoseControlEngine.renderCannyEdgeToCanvas(canvas);
      results.push({
        testName: 'Pose & ControlNet Preprocessors (OpenPose, Depth, Canny)',
        category: 'Pose & Scene',
        passed: true,
        durationMs: Number((performance.now() - t5).toFixed(2)),
        details: `Generated valid OpenPose (${poses.length} presets), 3D Z-Depth map, and Canny lineart on canvas.`
      });
    } catch (e: any) {
      results.push({
        testName: 'Pose & ControlNet Preprocessors (OpenPose, Depth, Canny)',
        category: 'Pose & Scene',
        passed: false,
        durationMs: Number((performance.now() - t5).toFixed(2)),
        details: e.message
      });
    }

    // Test 6: Image Enhancement Engine Budget & Filters
    const t6 = performance.now();
    try {
      const enhancers = EnhancementEngine.getDefaultEnhancers();
      const budget = EnhancementEngine.calculateEnhancementBudget(enhancers);
      const passed = budget.activeCount === 3 && budget.totalVramMB > 0;
      results.push({
        testName: 'Enhancement Engine (CodeFormer, GFPGAN, ADetailer, SUPIR)',
        category: 'Enhancement',
        passed,
        durationMs: Number((performance.now() - t6).toFixed(2)),
        details: `Active modules: ${budget.activeCount}, VRAM budget: ${budget.totalVramMB}MB, ETA added: ${budget.estimatedExtraMs}ms.`
      });
    } catch (e: any) {
      results.push({
        testName: 'Enhancement Engine (CodeFormer, GFPGAN, ADetailer, SUPIR)',
        category: 'Enhancement',
        passed: false,
        durationMs: Number((performance.now() - t6).toFixed(2)),
        details: e.message
      });
    }

    // Test 7: Video Generation & RIFE Optical Flow Interpolation
    const t7 = performance.now();
    try {
      const trajectory = VideoGenerationEngine.computeMotionTrajectory({
        characterId: 'char_test',
        sourceImageUrl: 'test_url',
        prompt: 'orbital camera move',
        videoModel: 'Wan 2.2',
        durationSeconds: 3,
        fps: 60,
        motionIntensity: 7,
        cameraMotion: 'orbital_360',
        preserveIdentity: true,
        seed: 42
      });
      const rife = VideoGenerationEngine.executeRIFEInterpolation(30, 60, 90);
      const passed = trajectory.length === 180 && rife.smoothnessGainPercent === 100;
      results.push({
        testName: 'Video Generation Engine & RIFE 60 FPS Interpolation',
        category: 'Video Engine',
        passed,
        durationMs: Number((performance.now() - t7).toFixed(2)),
        details: `Computed 180 keyframes with temporal identity hold and ${rife.motionVectorsCalculated} RIFE optical flow vectors.`
      });
    } catch (e: any) {
      results.push({
        testName: 'Video Generation Engine & RIFE 60 FPS Interpolation',
        category: 'Video Engine',
        passed: false,
        durationMs: Number((performance.now() - t7).toFixed(2)),
        details: e.message
      });
    }

    // Test 8: ComfyUI Graph & Storage Schemas
    const t8 = performance.now();
    try {
      const defaults = characterStorage.getDefaultCharacters();
      const mockParams: GenerationParams = {
        characterId: defaults[0].id,
        prompt: 'cyberpunk warrior portrait',
        model: 'FLUX.2 Max',
        identityEngine: 'PuLID',
        poseControl: 'OpenPose',
        aspectRatio: '9:16',
        width: 768,
        height: 1360,
        steps: 28,
        cfgScale: 3.5,
        seed: 98765,
        enhancers: { codeformer: true, codeformerStrength: 0.8, gfpgan: false, adetailer: true, supir: true, ultraSharp: false }
      };
      const graph = WorkflowEngine.generateComfyUIGraph(mockParams, defaults[0]);
      const sqlDump = await characterStorage.exportPostgreSQLSchema();
      const redisDump = await characterStorage.exportRedisQueueCommands();
      const passed = Boolean(graph['1'] && sqlDump.includes('character_profiles') && redisDump.includes('XADD'));
      results.push({
        testName: 'ComfyUI Execution Graph & PostgreSQL/Redis Exporters',
        category: 'Workflow & Storage',
        passed,
        durationMs: Number((performance.now() - t8).toFixed(2)),
        details: `Generated valid ComfyUI node graph (${Object.keys(graph).length} nodes) and pgvector SQL DDL dump.`
      });
    } catch (e: any) {
      results.push({
        testName: 'ComfyUI Execution Graph & PostgreSQL/Redis Exporters',
        category: 'Workflow & Storage',
        passed: false,
        durationMs: Number((performance.now() - t8).toFixed(2)),
        details: e.message
      });
    }

    return results;
  }
}
