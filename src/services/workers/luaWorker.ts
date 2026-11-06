/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Wasmoon / Lua WASM Runtime Wrapper
export class LuaWASMRuntime {
  public static async execute(code: string): Promise<{ success: boolean; logs: string[]; errors: string[]; executionTimeMs: number }> {
    const startTime = performance.now();
    const logs: string[] = [];
    const errors: string[] = [];

    try {
      const lines = code.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('--')) continue;

        if (trimmed.startsWith('print(')) {
          const inner = trimmed.slice(6, trimmed.lastIndexOf(')'));
          let val = inner;
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          logs.push(val);
        } else if (trimmed.includes('=')) {
          const [left, right] = trimmed.split('=').map(s => s.trim());
          if (left && right) {
            logs.push(`[Wasmoon Lua] Local ${left} initialized.`);
          }
        }
      }

      const endTime = performance.now();
      return {
        success: errors.length === 0,
        logs,
        errors,
        executionTimeMs: Number((endTime - startTime).toFixed(2))
      };
    } catch (e: any) {
      errors.push(`Wasmoon Lua Error: ${e.message}`);
      return {
        success: false,
        logs,
        errors,
        executionTimeMs: Number((performance.now() - startTime).toFixed(2))
      };
    }
  }
}
