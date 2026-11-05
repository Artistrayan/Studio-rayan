/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CompatibilityCheckResult {
  feature: string;
  supported: boolean;
  notes: string;
}

export class BrowserCompatibilityChecker {
  public static runCheck(): {
    overallPassed: boolean;
    scorePercent: number;
    results: CompatibilityCheckResult[];
  } {
    const isBrowser = typeof window !== 'undefined';

    const results: CompatibilityCheckResult[] = [
      {
        feature: 'WebGL 2.0 3D Acceleration',
        supported: isBrowser && !!window.WebGL2RenderingContext,
        notes: 'Required for PBR shaders, particle systems, and shadows.'
      },
      {
        feature: 'Web Audio API Synth',
        supported: isBrowser && !!(window.AudioContext || (window as any).webkitAudioContext),
        notes: 'Required for real-time sound synthesis and procedural SFX.'
      },
      {
        feature: 'IndexedDB Offline VFS Storage',
        supported: isBrowser && !!window.indexedDB,
        notes: 'Required for storing projects up to 500MB+ locally.'
      },
      {
        feature: 'Web Workers Multithreading',
        supported: isBrowser && !!window.Worker,
        notes: 'Used for background physics computations and Python/Lua AST parsing.'
      },
      {
        feature: 'WebAssembly (WASM)',
        supported: isBrowser && typeof WebAssembly === 'object',
        notes: 'Used for high-speed matrix math operations.'
      },
      {
        feature: 'Web Crypto API (HMAC-SHA256)',
        supported: isBrowser && !!window.crypto?.subtle,
        notes: 'Used for cryptographically secure JWT signatures.'
      },
      {
        feature: 'OffscreenCanvas Parallel Rendering',
        supported: isBrowser && typeof OffscreenCanvas !== 'undefined',
        notes: 'Allows 3D canvas rendering in worker threads.'
      }
    ];

    const supportedCount = results.filter(r => r.supported).length;
    const scorePercent = Math.round((supportedCount / results.length) * 100);

    return {
      overallPassed: scorePercent >= 70,
      scorePercent,
      results
    };
  }
}
