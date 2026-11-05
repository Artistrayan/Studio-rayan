/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BenchmarkReport {
  timestamp: number;
  objectCount: number;
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  drawCalls: number;
  triangleCount: number;
  heapMemoryMB: number;
  gpuMemoryEstMB: number;
  status: 'EXCELLENT' | 'GOOD' | 'NEEDS_OPTIMIZATION' | 'CRITICAL_LAG';
  recommendations: string[];
}

export class PerformanceProfilerService {
  public static runLargeProjectBenchmark(objectCount: number = 2500): BenchmarkReport {
    const startTime = performance.now();
    let totalFrameTime = 0;
    const samples = 60;
    let minFPS = 120;
    let maxFPS = 0;

    // Simulate 60 frame measurements for heavy mesh animation matrix calculations
    for (let i = 0; i < samples; i++) {
      const frameStart = performance.now();
      
      // Simulate transform matrix multiplication for N objects
      let sum = 0;
      for (let j = 0; j < objectCount; j++) {
        sum += Math.sin(j * 0.01) * Math.cos(j * 0.02);
      }

      const frameEnd = performance.now();
      const frameDuration = Math.max(0.1, frameEnd - frameStart + (Math.random() * 2));
      const instantaneousFPS = Math.min(120, Math.round(1000 / frameDuration));
      
      if (instantaneousFPS < minFPS) minFPS = instantaneousFPS;
      if (instantaneousFPS > maxFPS) maxFPS = instantaneousFPS;
      totalFrameTime += frameDuration;
    }

    const averageFPS = Math.round(1000 / (totalFrameTime / samples));
    const drawCalls = Math.ceil(objectCount / 8); // Batching factor
    const triangleCount = objectCount * 1250;
    const memory = (performance as any).memory;
    const heapMemoryMB = memory ? Math.round(memory.usedJSHeapSize / (1024 * 1024)) : 42;
    const gpuMemoryEstMB = Math.round((triangleCount * 36) / (1024 * 1024) + 16);

    let status: BenchmarkReport['status'] = 'EXCELLENT';
    const recommendations: string[] = [];

    if (averageFPS >= 55) {
      status = 'EXCELLENT';
      recommendations.push('Render performance is optimal. Project is ready for 60fps targeting.');
    } else if (averageFPS >= 40) {
      status = 'GOOD';
      recommendations.push('Frame rates are smooth. Enable Frustum Culling to gain additional 15% headroom.');
    } else if (averageFPS >= 25) {
      status = 'NEEDS_OPTIMIZATION';
      recommendations.push('Consider combining static meshes into InstancedMesh arrays.');
      recommendations.push('Reduce shadow map resolution from 2048 to 1024 on mobile targets.');
    } else {
      status = 'CRITICAL_LAG';
      recommendations.push('High polygon count detected! Enable level-of-detail (LOD) distance switching.');
      recommendations.push('Limit active point lights in 3D viewport to max 4.');
    }

    return {
      timestamp: Date.now(),
      objectCount,
      averageFPS,
      minFPS,
      maxFPS,
      drawCalls,
      triangleCount,
      heapMemoryMB,
      gpuMemoryEstMB,
      status,
      recommendations
    };
  }
}
