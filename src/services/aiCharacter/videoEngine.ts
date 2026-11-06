/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VideoModelType, VideoGenerationParams, CameraMotion } from './types';

export interface VideoKeyframe {
  frameIndex: number;
  timestampSec: number;
  faceSimilarity: number;
  cameraTransform: {
    x: number;
    y: number;
    zoom: number;
    rotationDeg: number;
  };
}

export class VideoGenerationEngine {
  /**
   * Generates motion trajectory path based on duration, FPS, and camera mode
   */
  public static computeMotionTrajectory(params: VideoGenerationParams): VideoKeyframe[] {
    const totalFrames = Math.round(params.durationSeconds * params.fps);
    const keyframes: VideoKeyframe[] = [];

    for (let f = 0; f < totalFrames; f++) {
      const progress = f / (totalFrames - 1 || 1);
      const timeSec = f / params.fps;
      const intensity = params.motionIntensity / 10;

      let x = 0;
      let y = 0;
      let zoom = 1.0;
      let rotationDeg = 0;

      switch (params.cameraMotion) {
        case 'pan_left':
          x = -0.15 * progress * intensity;
          break;
        case 'pan_right':
          x = 0.15 * progress * intensity;
          break;
        case 'tilt_up':
          y = -0.12 * progress * intensity;
          break;
        case 'tilt_down':
          y = 0.12 * progress * intensity;
          break;
        case 'zoom_in':
          zoom = 1.0 + 0.25 * progress * intensity;
          break;
        case 'zoom_out':
          zoom = 1.0 - 0.15 * progress * intensity;
          break;
        case 'orbital_360':
          x = Math.sin(progress * Math.PI * 2) * 0.10 * intensity;
          y = Math.cos(progress * Math.PI * 2) * 0.04 * intensity;
          rotationDeg = Math.sin(progress * Math.PI * 2) * 3.5 * intensity;
          break;
        case 'static':
        default:
          // Subtle breathing / organic micro-movement
          x = Math.sin(timeSec * 1.5) * 0.008 * intensity;
          y = Math.cos(timeSec * 1.2) * 0.006 * intensity;
          break;
      }

      // Facial consistency across frames with temporal attenuation
      const temporalIdentityDrift = Math.sin(f * 0.1) * 0.015;
      const faceSimilarity = Number((0.97 - temporalIdentityDrift).toFixed(3));

      keyframes.push({
        frameIndex: f,
        timestampSec: Number(timeSec.toFixed(2)),
        faceSimilarity,
        cameraTransform: {
          x: Number(x.toFixed(4)),
          y: Number(y.toFixed(4)),
          zoom: Number(zoom.toFixed(4)),
          rotationDeg: Number(rotationDeg.toFixed(2))
        }
      });
    }

    return keyframes;
  }

  /**
   * RIFE (Real-Time Intermediate Flow Estimation) interpolation pipeline simulator
   */
  public static executeRIFEInterpolation(
    sourceFps: number,
    targetFps: number,
    frameCount: number
  ): {
    interpolatedCount: number;
    motionVectorsCalculated: number;
    smoothnessGainPercent: number;
    logs: string[];
  } {
    const factor = targetFps / sourceFps;
    const interpolatedCount = Math.round(frameCount * factor);
    const motionVectorsCalculated = (interpolatedCount - frameCount) * 2;
    const smoothnessGainPercent = Math.min(100, Math.round((factor - 1) * 100));

    return {
      interpolatedCount,
      motionVectorsCalculated,
      smoothnessGainPercent,
      logs: [
        `[RIFE Engine] Initializing bidirectional optical flow pipeline (${sourceFps} FPS -> ${targetFps} FPS)...`,
        `[RIFE Engine] Computing IFNet warp matrices across ${frameCount} keyframes...`,
        `[RIFE Engine] Generated ${interpolatedCount - frameCount} sub-pixel intermediate frames with zero ghosting.`,
        `[RIFE Engine] Output temporal resolution locked at rock-solid ${targetFps} FPS.`
      ]
    };
  }
}
