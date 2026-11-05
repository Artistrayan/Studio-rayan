/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ParticleConfig {
  name: string;
  count: number;
  lifetime: number; // seconds
  startSize: number;
  endSize: number;
  startColor: string;
  endColor: string;
  speed: number;
  spreadAngle: number; // degrees
  emissionAngle: number; // degrees
  gravity: number; // pixels/s^2
  drag: number; // friction 0.0 - 0.2
  blendMode: 'source-over' | 'lighter';
  rate: number; // particles per second
}

export interface LiveParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number; // remaining seconds
  maxLife: number;
  startColor: string;
  endColor: string;
  startSize: number;
  endSize: number;
  alpha: number;
}

export const PARTICLE_PRESETS: Record<string, ParticleConfig> = {
  fire: {
    name: 'آتش سوزان (Flame)',
    count: 120,
    lifetime: 0.9,
    startSize: 14,
    endSize: 2,
    startColor: '#facc15', // Yellow
    endColor: '#dc2626',   // Red
    speed: 70,
    spreadAngle: 40,
    emissionAngle: 270, // Upwards
    gravity: -30,       // Rises
    drag: 0.02,
    blendMode: 'lighter',
    rate: 60
  },
  smoke: {
    name: 'دود غلیظ (Dense Smoke)',
    count: 70,
    lifetime: 1.8,
    startSize: 10,
    endSize: 32,
    startColor: '#64748b',
    endColor: '#1e293b',
    speed: 35,
    spreadAngle: 60,
    emissionAngle: 270,
    gravity: -10,
    drag: 0.05,
    blendMode: 'source-over',
    rate: 30
  },
  explosion: {
    name: 'انفجار پرقدرت (Blast Explosion)',
    count: 150,
    lifetime: 1.1,
    startSize: 18,
    endSize: 3,
    startColor: '#fbbf24',
    endColor: '#b91c1c',
    speed: 160,
    spreadAngle: 360,
    emissionAngle: 0,
    gravity: 40,
    drag: 0.06,
    blendMode: 'lighter',
    rate: 150
  },
  dust: {
    name: 'گرد و خاک (Dust Swirl)',
    count: 50,
    lifetime: 1.2,
    startSize: 6,
    endSize: 16,
    startColor: '#d97706',
    endColor: '#78350f',
    speed: 40,
    spreadAngle: 120,
    emissionAngle: 270,
    gravity: 15,
    drag: 0.08,
    blendMode: 'source-over',
    rate: 35
  },
  snow: {
    name: 'بارش برف (Gentle Snow)',
    count: 100,
    lifetime: 3.5,
    startSize: 4,
    endSize: 3,
    startColor: '#ffffff',
    endColor: '#e0f2fe',
    speed: 35,
    spreadAngle: 45,
    emissionAngle: 90, // Downwards
    gravity: 10,
    drag: 0.01,
    blendMode: 'source-over',
    rate: 30
  },
  rain: {
    name: 'باران شدید (Heavy Rain)',
    count: 200,
    lifetime: 1.0,
    startSize: 2,
    endSize: 2,
    startColor: '#38bdf8',
    endColor: '#0284c7',
    speed: 260,
    spreadAngle: 15,
    emissionAngle: 95,
    gravity: 80,
    drag: 0.0,
    blendMode: 'source-over',
    rate: 180
  },
  magic: {
    name: 'رد جادویی (Arcane Sparks)',
    count: 100,
    lifetime: 1.4,
    startSize: 8,
    endSize: 1,
    startColor: '#c084fc',
    endColor: '#06b6d4',
    speed: 80,
    spreadAngle: 360,
    emissionAngle: 0,
    gravity: -15,
    drag: 0.04,
    blendMode: 'lighter',
    rate: 60
  },
  sparks: {
    name: 'جرقه‌های فلزی (Sparks & Metal)',
    count: 80,
    lifetime: 0.6,
    startSize: 4,
    endSize: 1,
    startColor: '#fef08a',
    endColor: '#f97316',
    speed: 180,
    spreadAngle: 90,
    emissionAngle: 270,
    gravity: 120,
    drag: 0.03,
    blendMode: 'lighter',
    rate: 100
  }
};
