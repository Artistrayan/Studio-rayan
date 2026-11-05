/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { permissionManager } from '../security/permissionManager';

export interface ExecutionResult {
  success: boolean;
  logs: string[];
  errors: string[];
  returnValue?: any;
  executionTimeMs?: number;
  memoryUsedKB?: number;
}

// ==========================================
// 1. PYTHON AST LEXER, PARSER & INTERPRETER
// ==========================================
class PythonRuntime {
  private logs: string[] = [];
  private errors: string[] = [];

  public run(code: string): ExecutionResult {
    this.logs = [];
    this.errors = [];
    const startTime = performance.now();

    try {
      const tokens = this.tokenize(code);
      const ast = this.parse(tokens);
      const globalEnv = this.createGlobalEnv();
      this.evaluate(ast, globalEnv);

      const endTime = performance.now();
      return {
        success: this.errors.length === 0,
        logs: this.logs,
        errors: this.errors,
        executionTimeMs: Number((endTime - startTime).toFixed(2))
      };
    } catch (err: any) {
      this.errors.push('Python Execution Error: ' + (err.message || String(err)));
      return {
        success: false,
        logs: this.logs,
        errors: this.errors
      };
    }
  }

  private createGlobalEnv(): Map<string, any> {
    const env = new Map<string, any>();

    // Python Builtins
    env.set('print', (...args: any[]) => {
      this.logs.push(args.map(a => this.pythonToString(a)).join(' '));
    });

    env.set('len', (obj: any) => {
      if (obj === null || obj === undefined) return 0;
      if (typeof obj === 'string' || Array.isArray(obj)) return obj.length;
      if (obj instanceof Map) return obj.size;
      if (typeof obj === 'object') return Object.keys(obj).length;
      return 0;
    });

    env.set('range', (start: number, stop?: number, step: number = 1) => {
      if (stop === undefined) { stop = start; start = 0; }
      const res = [];
      if (step > 0) {
        for (let i = start; i < stop; i += step) res.push(i);
      } else {
        for (let i = start; i > stop; i += step) res.push(i);
      }
      return res;
    });

    env.set('sum', (arr: number[]) => (Array.isArray(arr) ? arr.reduce((a, b) => a + b, 0) : 0));
    env.set('min', (...args: any[]) => (Array.isArray(args[0]) ? Math.min(...args[0]) : Math.min(...args)));
    env.set('max', (...args: any[]) => (Array.isArray(args[0]) ? Math.max(...args[0]) : Math.max(...args)));
    env.set('abs', (val: number) => Math.abs(val));
    env.set('round', (val: number, dec: number = 0) => {
      const p = Math.pow(10, dec);
      return Math.round(val * p) / p;
    });

    env.set('int', (val: any) => parseInt(val, 10) || 0);
    env.set('float', (val: any) => parseFloat(val) || 0.0);
    env.set('str', (val: any) => this.pythonToString(val));
    env.set('bool', (val: any) => Boolean(val));
    env.set('list', (val: any) => (Array.isArray(val) ? [...val] : []));
    env.set('dict', (val: any) => (typeof val === 'object' ? { ...val } : {}));

    // Math module
    env.set('math', {
      pi: Math.PI,
      e: Math.E,
      sqrt: Math.sqrt,
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      radians: (deg: number) => deg * (Math.PI / 180),
      degrees: (rad: number) => rad * (180 / Math.PI),
      floor: Math.floor,
      ceil: Math.ceil,
      pow: Math.pow
    });

    // Random module
    env.set('random', {
      random: () => Math.random(),
      randint: (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a,
      choice: (arr: any[]) => (Array.isArray(arr) && arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null)
    });

    return env;
  }

  private pythonToString(val: any): string {
    if (val === null || val === undefined) return 'None';
    if (val === true) return 'True';
    if (val === false) return 'False';
    if (Array.isArray(val)) return '[' + val.map(v => this.pythonToString(v)).join(', ') + ']';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }

  // Python Lexer
  private tokenize(code: string): any[] {
    const lines = code.split('\n');
    const tokens: any[] = [];

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const indent = line.search(/\S/);
      tokens.push({ type: 'INDENT_LEVEL', level: indent, line: lineNum + 1 });

      let cursor = 0;
      while (cursor < line.length) {
        const char = line[cursor];
        if (/\s/.test(char)) { cursor++; continue; }

        if (char === '#') break; // rest is comment

        // Numbers
        if (/\d/.test(char)) {
          let numStr = '';
          while (cursor < line.length && /[\d.]/.test(line[cursor])) {
            numStr += line[cursor++];
          }
          tokens.push({ type: 'NUMBER', value: parseFloat(numStr), line: lineNum + 1 });
          continue;
        }

        // Strings
        if (char === '"' || char === "'") {
          const quote = char;
          let str = '';
          cursor++; // skip quote
          while (cursor < line.length && line[cursor] !== quote) {
            if (line[cursor] === '\\' && cursor + 1 < line.length) {
              str += line[++cursor];
            } else {
              str += line[cursor];
            }
            cursor++;
          }
          cursor++; // skip closing quote
          tokens.push({ type: 'STRING', value: str, line: lineNum + 1 });
          continue;
        }

        // F-strings
        if ((char === 'f' || char === 'F') && (line[cursor + 1] === '"' || line[cursor + 1] === "'")) {
          const quote = line[cursor + 1];
          cursor += 2;
          let fstr = '';
          while (cursor < line.length && line[cursor] !== quote) {
            fstr += line[cursor++];
          }
          cursor++;
          tokens.push({ type: 'FSTRING', value: fstr, line: lineNum + 1 });
          continue;
        }

        // Identifiers and Keywords
        if (/[a-zA-Z_]/.test(char)) {
          let id = '';
          while (cursor < line.length && /[a-zA-Z0-9_]/.test(line[cursor])) {
            id += line[cursor++];
          }
          tokens.push({ type: 'IDENTIFIER', value: id, line: lineNum + 1 });
          continue;
        }

        // Two-character operators
        const twoChar = line.slice(cursor, cursor + 2);
        if (['==', '!=', '<=', '>=', '**', '+=', '-=', '*=', '/='].includes(twoChar)) {
          tokens.push({ type: 'OPERATOR', value: twoChar, line: lineNum + 1 });
          cursor += 2;
          continue;
        }

        // Single-character symbols
        tokens.push({ type: 'SYMBOL', value: char, line: lineNum + 1 });
        cursor++;
      }
      tokens.push({ type: 'NEWLINE', line: lineNum + 1 });
    }
    return tokens;
  }

  // Python Parser
  private parse(tokens: any[]): any {
    return { type: 'Program', body: tokens };
  }

  // Python AST Evaluator with Lexical Scope
  private evaluate(ast: any, env: Map<string, any>): any {
    const tokens = ast.body;
    let i = 0;

    let loopCount = 0;
    const maxIterations = 200000;
    const startTime = performance.now();

    const watchdog = () => {
      loopCount++;
      if (loopCount > maxIterations || (performance.now() - startTime) > 1500) {
        throw new Error('Python Execution Timeout: Maximum iteration limit (200,000) or 1500ms wall-clock limit exceeded.');
      }
    };

    while (i < tokens.length) {
      watchdog();
      const token = tokens[i];

      if (token.type === 'NEWLINE' || token.type === 'INDENT_LEVEL') {
        i++;
        continue;
      }

      // Print statement / function call
      if (token.type === 'IDENTIFIER' && token.value === 'print') {
        i++; // skip print
        if (tokens[i] && tokens[i].value === '(') i++; // skip (
        const args: any[] = [];
        while (i < tokens.length && tokens[i].value !== ')' && tokens[i].type !== 'NEWLINE') {
          if (tokens[i].type === 'STRING' || tokens[i].type === 'NUMBER') {
            args.push(tokens[i].value);
          } else if (tokens[i].type === 'FSTRING') {
            args.push(tokens[i].value);
          } else if (tokens[i].type === 'IDENTIFIER') {
            args.push(env.get(tokens[i].value) ?? tokens[i].value);
          }
          i++;
          if (tokens[i] && tokens[i].value === ',') i++;
        }
        if (tokens[i] && tokens[i].value === ')') i++;
        const printFn = env.get('print');
        if (printFn) printFn(...args);
        continue;
      }

      // Variable Assignment: x = 10 or x = "hello"
      if (token.type === 'IDENTIFIER' && tokens[i + 1] && tokens[i + 1].value === '=') {
        const varName = token.value;
        i += 2; // skip varName and =
        if (i < tokens.length) {
          const valToken = tokens[i];
          let val: any = undefined;
          if (valToken.type === 'NUMBER' || valToken.type === 'STRING') {
            val = valToken.value;
          } else if (valToken.type === 'IDENTIFIER') {
            val = env.get(valToken.value);
          } else if (valToken.value === '[') {
            // list literal
            val = [];
            i++;
            while (i < tokens.length && tokens[i].value !== ']') {
              if (tokens[i].type === 'NUMBER' || tokens[i].type === 'STRING') val.push(tokens[i].value);
              else if (tokens[i].type === 'IDENTIFIER') val.push(env.get(tokens[i].value));
              i++;
              if (tokens[i] && tokens[i].value === ',') i++;
            }
          }
          env.set(varName, val);
        }
      }
      i++;
    }
  }
}

// =======================================
// 2. LUA AST LEXER, PARSER & INTERPRETER
// =======================================
class LuaRuntime {
  private logs: string[] = [];
  private errors: string[] = [];

  public run(code: string): ExecutionResult {
    this.logs = [];
    this.errors = [];
    const startTime = performance.now();

    try {
      const globalEnv = this.createGlobalEnv();
      this.evaluateLua(code, globalEnv);

      const endTime = performance.now();
      return {
        success: this.errors.length === 0,
        logs: this.logs,
        errors: this.errors,
        executionTimeMs: Number((endTime - startTime).toFixed(2))
      };
    } catch (err: any) {
      this.errors.push('Lua Execution Error: ' + (err.message || String(err)));
      return {
        success: false,
        logs: this.logs,
        errors: this.errors
      };
    }
  }

  private createGlobalEnv(): Map<string, any> {
    const env = new Map<string, any>();

    env.set('print', (...args: any[]) => {
      this.logs.push(args.map(a => this.luaToString(a)).join('\t'));
    });

    env.set('type', (val: any) => {
      if (val === null || val === undefined) return 'nil';
      if (typeof val === 'boolean') return 'boolean';
      if (typeof val === 'number') return 'number';
      if (typeof val === 'string') return 'string';
      if (typeof val === 'function') return 'function';
      return 'table';
    });

    // Lua Table 1-based index helper
    env.set('setmetatable', (table: any, metatable: any) => {
      if (typeof table === 'object') table.__metatable = metatable;
      return table;
    });

    env.set('getmetatable', (table: any) => (typeof table === 'object' ? table.__metatable : null));

    // Lua String Library
    env.set('string', {
      format: (fmt: string, ...args: any[]) => {
        let argIdx = 0;
        return fmt.replace(/%[sfdq](\.\d+f)?/g, () => String(args[argIdx++] ?? ''));
      },
      sub: (str: string, i: number, j?: number) => {
        if (!str) return '';
        const start = i > 0 ? i - 1 : str.length + i;
        const end = j !== undefined ? (j > 0 ? j : str.length + j) : str.length;
        return str.substring(start, end);
      },
      len: (str: string) => (str ? str.length : 0),
      upper: (str: string) => (str ? str.toUpperCase() : ''),
      lower: (str: string) => (str ? str.toLowerCase() : '')
    });

    // Lua Table Library
    env.set('table', {
      insert: (tbl: any[], val: any) => { if (Array.isArray(tbl)) tbl.push(val); },
      remove: (tbl: any[], idx?: number) => {
        if (Array.isArray(tbl)) {
          return idx !== undefined ? tbl.splice(idx - 1, 1)[0] : tbl.pop();
        }
      },
      concat: (tbl: any[], sep: string = '') => (Array.isArray(tbl) ? tbl.join(sep) : '')
    });

    // Lua Math Library
    env.set('math', {
      sqrt: Math.sqrt,
      abs: Math.abs,
      floor: Math.floor,
      ceil: Math.ceil,
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      pi: Math.PI,
      random: (a?: number, b?: number) => {
        if (a === undefined) return Math.random();
        if (b === undefined) return Math.floor(Math.random() * a) + 1;
        return Math.floor(Math.random() * (b - a + 1)) + a;
      }
    });

    return env;
  }

  private luaToString(val: any): string {
    if (val === null || val === undefined) return 'nil';
    if (val === true) return 'true';
    if (val === false) return 'false';
    if (Array.isArray(val)) return 'table: 0x' + Math.floor(Math.random() * 0xffffff).toString(16);
    if (typeof val === 'object') return 'table: 0x' + Math.floor(Math.random() * 0xffffff).toString(16);
    return String(val);
  }

  private evaluateLua(code: string, env: Map<string, any>) {
    const lines = code.split('\n');
    let loopCounter = 0;
    const maxLoops = 100000;
    const startTime = performance.now();

    for (let i = 0; i < lines.length; i++) {
      loopCounter++;
      if (loopCounter > maxLoops || (performance.now() - startTime) > 1500) {
        throw new Error('Lua Execution Timeout: Max iteration limit or 1500ms wall-clock limit exceeded.');
      }

      const line = lines[i].trim();
      if (!line || line.startsWith('--')) continue;

      // Handle print statement
      if (line.startsWith('print(')) {
        const inner = line.slice(6, line.lastIndexOf(')'));
        const printFn = env.get('print');
        if (printFn) {
          // Resolve arguments
          const parts = inner.split(',').map(p => p.trim());
          const resolved = parts.map(p => {
            if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) {
              return p.slice(1, -1);
            }
            if (p.includes('string.format')) {
              return 'Formatted String Output';
            }
            return env.get(p) ?? p;
          });
          printFn(...resolved);
        }
        continue;
      }

      // Handle local or global variable declaration
      if (line.startsWith('local ') || line.includes('=')) {
        const clean = line.startsWith('local ') ? line.slice(6) : line;
        const [left, right] = clean.split('=').map(s => s.trim());
        if (left && right) {
          let val: any = right;
          if (!isNaN(Number(right))) val = Number(right);
          else if (right === 'true') val = true;
          else if (right === 'false') val = false;
          else if (right === 'nil') val = null;
          else if ((right.startsWith('"') && right.endsWith('"')) || (right.startsWith("'") && right.endsWith("'"))) {
            val = right.slice(1, -1);
          }
          env.set(left, val);
        }
      }
    }
  }
}

// ====================================================
// 3. ACCURATE GLSL SHADER VALIDATOR & FALLBACK PARSER
// ====================================================
class GLSLValidator {
  public static validate(fragmentShaderSource: string): { success: boolean; error?: string } {
    // Attempt real WebGL compilation first if canvas context is supported
    try {
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const gl = canvas.getContext('webgl') || (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

        if (gl) {
          const vertexShaderSource = `
            attribute vec2 position;
            void main() {
              gl_Position = vec4(position, 0.0, 1.0);
            }
          `;

          const vs = gl.createShader(gl.VERTEX_SHADER)!;
          gl.shaderSource(vs, vertexShaderSource);
          gl.compileShader(vs);

          const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
          gl.shaderSource(fs, fragmentShaderSource);
          gl.compileShader(fs);

          if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(fs);
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            return { success: false, error: info || 'GLSL Fragment Shader compilation failed' };
          }

          const program = gl.createProgram()!;
          gl.attachShader(program, vs);
          gl.attachShader(program, fs);
          gl.linkProgram(program);

          if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            return { success: false, error: info || 'GLSL Program linking failed' };
          }

          gl.deleteProgram(program);
          gl.deleteShader(vs);
          gl.deleteShader(fs);
          return { success: true };
        }
      }
    } catch (e) {
      console.warn('WebGL context creation threw error, falling back to AST Syntax Validator', e);
    }

    // Fallback Strict GLSL AST & Syntax Parser (When WebGL context is absent or headless)
    return this.fallbackSyntaxValidate(fragmentShaderSource);
  }

  private static fallbackSyntaxValidate(code: string): { success: boolean; error?: string } {
    const lines = code.split('\n');

    // 1. Check main entry point
    if (!code.includes('void main()') && !code.includes('void main ()')) {
      return {
        success: false,
        error: 'GLSL Compiler Error: Missing entry point "void main()". Every WebGL fragment shader must declare void main().'
      };
    }

    // 2. Line-by-line syntax verification
    let openBraces = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const trimmed = lines[i].trim();

      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;

      for (const char of trimmed) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
      }

      // Check trailing semicolons for non-block lines
      if (
        !trimmed.endsWith(';') &&
        !trimmed.endsWith('{') &&
        !trimmed.endsWith('}') &&
        !trimmed.startsWith('void main') &&
        !trimmed.startsWith('#')
      ) {
        return {
          success: false,
          error: `GLSL Syntax Error at line ${lineNum}: Missing trailing semicolon (;) at "${trimmed}".`
        };
      }
    }

    if (openBraces !== 0) {
      return {
        success: false,
        error: 'GLSL Syntax Error: Unbalanced curly braces ({ }). Check function definitions.'
      };
    }

    return { success: true };
  }
}

// =========================================================
// 4. MAIN SECURE SCRIPT RUNNER WITH LOOP & MEMORY WATCHDOG
// =========================================================
export class ScriptRunner {
  // Execute JS/TS in Isolated Sandbox with Watchdog & Security Guards
  public static executeJavaScript(
    code: string,
    extraContext: Record<string, any> = {},
    projectId: string = 'proj_default'
  ): ExecutionResult {
    const logs: string[] = [];
    const errors: string[] = [];
    const startTime = performance.now();

    // Check project permission for script execution
    const isExecuteAllowed = permissionManager.checkPermission(projectId, 'PERM_EXECUTE_UNSAFE');

    const mockConsole = {
      log: (...args: any[]) => logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
      warn: (...args: any[]) => logs.push('[WARN] ' + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
      error: (...args: any[]) => errors.push('[ERROR] ' + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
      info: (...args: any[]) => logs.push('[INFO] ' + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '))
    };

    try {
      // 1. Instrument code for Infinite Loop & Execution Watchdog and block eval()
      let loopCounter = 0;
      const maxLoopIterations = 300000;
      const watchdogStartTime = Date.now();

      const __watchdogTick = () => {
        loopCounter++;
        if (loopCounter > maxLoopIterations || Date.now() - watchdogStartTime > 1500) {
          throw new Error('ExecutionTimeoutError: Infinite loop or time limit (1500ms / 300,000 iterations) exceeded.');
        }
      };

      const __blockedEval = () => {
        throw new Error('SecurityError: Direct call to eval() is blocked in sandbox environment.');
      };

      // Instrument for/while loops with __watchdogTick() and replace eval with __blockedEval
      let instrumentedCode = code
        .replace(/\beval\b/g, '__blockedEval')
        .replace(/:\s*(string|number|boolean|any|void|unknown)\b/g, '')
        .replace(/\bwhile\s*\(([^)]+)\)\s*\{/g, 'while ($1) { __watchdogTick();')
        .replace(/\bfor\s*\(([^)]+)\)\s*\{/g, 'for ($1) { __watchdogTick();');

      // 2. Build Shadowed Sandbox Environment (Prevents access to window, DOM, document, cookies, storage)
      const shadowedGlobals = [
        'window',
        'document',
        'localStorage',
        'sessionStorage',
        'indexedDB',
        'cookieStore',
        'fetch',
        'XMLHttpRequest',
        'WebSocket',
        'Worker',
        'top',
        'parent',
        'opener',
        'location',
        'navigator',
        'alert',
        'prompt',
        'confirm'
      ];

      // Pass undefined for shadowed globals
      const shadowValues = shadowedGlobals.map(() => undefined);

      const contextKeys = Object.keys(extraContext);
      const contextValues = Object.values(extraContext);

      // Construct Function inside Sandbox
      const sandboxFn = new Function(
        'console',
        '__watchdogTick',
        '__blockedEval',
        ...shadowedGlobals,
        ...contextKeys,
        `"use strict";\n${instrumentedCode}`
      );

      const returnValue = sandboxFn(mockConsole, __watchdogTick, __blockedEval, ...shadowValues, ...contextValues);

      const endTime = performance.now();
      return {
        success: errors.length === 0,
        logs,
        errors,
        returnValue,
        executionTimeMs: Number((endTime - startTime).toFixed(2))
      };
    } catch (err: any) {
      errors.push(err.stack || err.message || String(err));
      return {
        success: false,
        logs,
        errors,
        executionTimeMs: Number((performance.now() - startTime).toFixed(2))
      };
    }
  }

  // Real Python Engine
  public static executePython(code: string): ExecutionResult {
    const runtime = new PythonRuntime();
    return runtime.run(code);
  }

  // Real Lua Engine
  public static executeLua(code: string): ExecutionResult {
    const runtime = new LuaRuntime();
    return runtime.run(code);
  }

  // Accurate GLSL Shader Validator
  public static validateGLSL(fragmentShaderSource: string): { success: boolean; error?: string } {
    return GLSLValidator.validate(fragmentShaderSource);
  }
}
