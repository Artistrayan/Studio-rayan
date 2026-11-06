/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PoseControlNetType, CameraMotion } from './types';

export interface PoseJoint {
  name: string;
  x: number;
  y: number;
  confidence: number;
}

export interface SkeletonPose {
  name: string;
  category: 'action' | 'portrait' | 'cinematic' | 'idle';
  joints: PoseJoint[];
  connections: [number, number, string][]; // [fromIdx, toIdx, colorHex]
}

export class PoseControlEngine {
  /**
   * Generates OpenPose joint hierarchy presets (18 points OpenPose standard)
   */
  public static getPresetPoses(): SkeletonPose[] {
    return [
      {
        name: 'Action Combat Ready',
        category: 'action',
        joints: [
          { name: 'nose', x: 0.50, y: 0.18, confidence: 1.0 },
          { name: 'neck', x: 0.50, y: 0.28, confidence: 1.0 },
          { name: 'r_shoulder', x: 0.38, y: 0.28, confidence: 1.0 },
          { name: 'r_elbow', x: 0.30, y: 0.42, confidence: 0.95 },
          { name: 'r_wrist', x: 0.36, y: 0.56, confidence: 0.9 },
          { name: 'l_shoulder', x: 0.62, y: 0.28, confidence: 1.0 },
          { name: 'l_elbow', x: 0.70, y: 0.40, confidence: 0.95 },
          { name: 'l_wrist', x: 0.64, y: 0.52, confidence: 0.9 },
          { name: 'r_hip', x: 0.42, y: 0.58, confidence: 1.0 },
          { name: 'r_knee', x: 0.38, y: 0.75, confidence: 0.95 },
          { name: 'r_ankle', x: 0.36, y: 0.92, confidence: 0.9 },
          { name: 'l_hip', x: 0.58, y: 0.58, confidence: 1.0 },
          { name: 'l_knee', x: 0.64, y: 0.76, confidence: 0.95 },
          { name: 'l_ankle', x: 0.68, y: 0.93, confidence: 0.9 },
          { name: 'r_eye', x: 0.47, y: 0.16, confidence: 1.0 },
          { name: 'l_eye', x: 0.53, y: 0.16, confidence: 1.0 },
          { name: 'r_ear', x: 0.43, y: 0.18, confidence: 0.9 },
          { name: 'l_ear', x: 0.57, y: 0.18, confidence: 0.9 }
        ],
        connections: [
          [0, 1, '#ff0055'], [1, 2, '#ffaa00'], [2, 3, '#ffff00'], [3, 4, '#55ff00'],
          [1, 5, '#00ffaa'], [5, 6, '#00aaff'], [6, 7, '#0000ff'],
          [1, 8, '#aa00ff'], [8, 9, '#ff00aa'], [9, 10, '#ff5500'],
          [1, 11, '#5500ff'], [11, 12, '#00ffff'], [12, 13, '#00ff55'],
          [0, 14, '#ff0000'], [14, 16, '#ff0055'], [0, 15, '#ff0000'], [15, 17, '#ff0055']
        ]
      },
      {
        name: 'Heroic 85mm Portrait',
        category: 'portrait',
        joints: [
          { name: 'nose', x: 0.50, y: 0.30, confidence: 1.0 },
          { name: 'neck', x: 0.50, y: 0.48, confidence: 1.0 },
          { name: 'r_shoulder', x: 0.32, y: 0.52, confidence: 1.0 },
          { name: 'r_elbow', x: 0.24, y: 0.78, confidence: 0.9 },
          { name: 'r_wrist', x: 0.32, y: 0.95, confidence: 0.8 },
          { name: 'l_shoulder', x: 0.68, y: 0.52, confidence: 1.0 },
          { name: 'l_elbow', x: 0.76, y: 0.78, confidence: 0.9 },
          { name: 'l_wrist', x: 0.68, y: 0.95, confidence: 0.8 },
          { name: 'r_hip', x: 0.40, y: 0.98, confidence: 0.7 },
          { name: 'r_knee', x: 0.38, y: 1.10, confidence: 0.5 },
          { name: 'r_ankle', x: 0.36, y: 1.25, confidence: 0.4 },
          { name: 'l_hip', x: 0.60, y: 0.98, confidence: 0.7 },
          { name: 'l_knee', x: 0.62, y: 1.10, confidence: 0.5 },
          { name: 'l_ankle', x: 0.64, y: 1.25, confidence: 0.4 },
          { name: 'r_eye', x: 0.45, y: 0.27, confidence: 1.0 },
          { name: 'l_eye', x: 0.55, y: 0.27, confidence: 1.0 },
          { name: 'r_ear', x: 0.40, y: 0.30, confidence: 0.95 },
          { name: 'l_ear', x: 0.60, y: 0.30, confidence: 0.95 }
        ],
        connections: [
          [0, 1, '#ff0055'], [1, 2, '#ffaa00'], [2, 3, '#ffff00'], [3, 4, '#55ff00'],
          [1, 5, '#00ffaa'], [5, 6, '#00aaff'], [6, 7, '#0000ff'],
          [1, 8, '#aa00ff'], [1, 11, '#5500ff'],
          [0, 14, '#ff0000'], [14, 16, '#ff0055'], [0, 15, '#ff0000'], [15, 17, '#ff0055']
        ]
      },
      {
        name: 'Cinematic Low Angle Walk',
        category: 'cinematic',
        joints: [
          { name: 'nose', x: 0.52, y: 0.15, confidence: 1.0 },
          { name: 'neck', x: 0.52, y: 0.25, confidence: 1.0 },
          { name: 'r_shoulder', x: 0.42, y: 0.27, confidence: 1.0 },
          { name: 'r_elbow', x: 0.36, y: 0.42, confidence: 0.9 },
          { name: 'r_wrist', x: 0.40, y: 0.54, confidence: 0.85 },
          { name: 'l_shoulder', x: 0.62, y: 0.26, confidence: 1.0 },
          { name: 'l_elbow', x: 0.68, y: 0.39, confidence: 0.9 },
          { name: 'l_wrist', x: 0.72, y: 0.52, confidence: 0.85 },
          { name: 'r_hip', x: 0.46, y: 0.54, confidence: 1.0 },
          { name: 'r_knee', x: 0.44, y: 0.72, confidence: 0.95 },
          { name: 'r_ankle', x: 0.48, y: 0.90, confidence: 0.9 },
          { name: 'l_hip', x: 0.58, y: 0.53, confidence: 1.0 },
          { name: 'l_knee', x: 0.62, y: 0.71, confidence: 0.95 },
          { name: 'l_ankle', x: 0.66, y: 0.88, confidence: 0.9 },
          { name: 'r_eye', x: 0.49, y: 0.13, confidence: 1.0 },
          { name: 'l_eye', x: 0.55, y: 0.13, confidence: 1.0 },
          { name: 'r_ear', x: 0.45, y: 0.15, confidence: 0.9 },
          { name: 'l_ear', x: 0.58, y: 0.15, confidence: 0.9 }
        ],
        connections: [
          [0, 1, '#ff0055'], [1, 2, '#ffaa00'], [2, 3, '#ffff00'], [3, 4, '#55ff00'],
          [1, 5, '#00ffaa'], [5, 6, '#00aaff'], [6, 7, '#0000ff'],
          [1, 8, '#aa00ff'], [8, 9, '#ff00aa'], [9, 10, '#ff5500'],
          [1, 11, '#5500ff'], [11, 12, '#00ffff'], [12, 13, '#00ff55'],
          [0, 14, '#ff0000'], [14, 16, '#ff0055'], [0, 15, '#ff0000'], [15, 17, '#ff0055']
        ]
      }
    ];
  }

  /**
   * Renders the OpenPose skeleton onto an HTML Canvas element
   */
  public static renderOpenPoseToCanvas(canvas: HTMLCanvasElement, pose: SkeletonPose): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Black background as expected by ControlNet OpenPose preprocessor
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    // Draw limb connection lines
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (const [fromIdx, toIdx, color] of pose.connections) {
      const p1 = pose.joints[fromIdx];
      const p2 = pose.joints[toIdx];
      if (!p1 || !p2 || p1.confidence < 0.2 || p2.confidence < 0.2) continue;

      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
      ctx.stroke();
    }

    // Draw joint circles
    for (const joint of pose.joints) {
      if (joint.confidence < 0.2) continue;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(joint.x * w, joint.y * h, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Renders a Depth ControlNet map on canvas
   */
  public static renderDepthMapToCanvas(canvas: HTMLCanvasElement, nearDist: number = 0.2, farDist: number = 0.9): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Linear radial z-buffer gradient (White = near, Black = distant)
    const gradient = ctx.createRadialGradient(w * 0.5, h * 0.45, w * 0.05, w * 0.5, h * 0.5, w * 0.7);
    gradient.addColorStop(0, '#ffffff'); // Forehead/nose nearest
    gradient.addColorStop(0.35, '#c0c0c0'); // Chest & shoulders mid
    gradient.addColorStop(0.7, '#484848'); // Background wall
    gradient.addColorStop(1, '#050505'); // Infinite depth

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Character silhouette overlay in depth space
    ctx.fillStyle = '#e5e5e5';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.35, w * 0.18, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Torso depth
    ctx.fillStyle = '#9e9e9e';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.75, w * 0.35, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Renders a Canny Edge ControlNet map on canvas
   */
  public static renderCannyEdgeToCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    // Face contour edge line
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.35, w * 0.16, h * 0.20, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Jawline
    ctx.beginPath();
    ctx.moveTo(w * 0.35, h * 0.34);
    ctx.quadraticCurveTo(w * 0.5, h * 0.54, w * 0.65, h * 0.34);
    ctx.stroke();

    // Eyes
    ctx.beginPath();
    ctx.arc(w * 0.43, h * 0.32, w * 0.03, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w * 0.57, h * 0.32, w * 0.03, 0, Math.PI);
    ctx.stroke();

    // Nose
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.32);
    ctx.lineTo(w * 0.49, h * 0.39);
    ctx.lineTo(w * 0.52, h * 0.39);
    ctx.stroke();

    // Lips
    ctx.beginPath();
    ctx.moveTo(w * 0.45, h * 0.44);
    ctx.quadraticCurveTo(w * 0.5, h * 0.42, w * 0.55, h * 0.44);
    ctx.quadraticCurveTo(w * 0.5, h * 0.46, w * 0.45, h * 0.44);
    ctx.stroke();

    // Collar / Outfit edges
    ctx.beginPath();
    ctx.moveTo(w * 0.30, h * 0.56);
    ctx.lineTo(w * 0.50, h * 0.68);
    ctx.lineTo(w * 0.70, h * 0.56);
    ctx.stroke();
  }
}
