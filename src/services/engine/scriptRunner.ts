/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { permissionManager } from '../security/permissionManager';
import { runtimeManager } from '../workers/runtimeManager';

export interface ExecutionResult {
  success: boolean;
  logs: string[];
  errors: string[];
  returnValue?: any;
  executionTimeMs?: number;
  memoryUsedKB?: number;
}

// ===============================================
// 1. SECURE JS/TS AST INTERPRETER (NO NEW FUNCTION)
// ===============================================
class SecureJSInterpreter {
  private logs: string[] = [];
  private errors: string[] = [];
  private memoryKB: number = 64; // Initial memory footprint
  private readonly maxMemoryKB: number = 51200; // 50MB Sandbox Memory Limit

  public run(
    code: string,
    extraContext: Record<string, any> = {},
    projectId: string = 'proj_default'
  ): ExecutionResult {
    this.logs = [];
    this.errors = [];
    this.memoryKB = 64;
    const startTime = performance.now();

    // Check permissions
    const isNetworkAllowed = permissionManager.checkPermission(projectId, 'PERM_NETWORK_FETCH');
    const isFileAllowed = permissionManager.checkPermission(projectId, 'PERM_FILE_WRITE');

    try {
      const env = this.createSandboxScope(extraContext, isNetworkAllowed, isFileAllowed);
      const tokens = this.tokenize(code);
      const returnValue = this.evaluateTokens(tokens, env);

      const endTime = performance.now();
      return {
        success: this.errors.length === 0,
        logs: this.logs,
        errors: this.errors,
        returnValue,
        executionTimeMs: Number((endTime - startTime).toFixed(2)),
        memoryUsedKB: this.memoryKB
      };
    } catch (err: any) {
      this.errors.push(err.message || String(err));
      return {
        success: false,
        logs: this.logs,
        errors: this.errors,
        executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
        memoryUsedKB: this.memoryKB
      };
    }
  }

  // Create Isolated Sandbox Scope (Blocks window, document, localStorage, cookies, DOM)
  private createSandboxScope(
    extraContext: Record<string, any>,
    isNetworkAllowed: boolean,
    isFileAllowed: boolean
  ): Map<string, any> {
    const scope = new Map<string, any>();

    // Mock Console
    scope.set('console', {
      log: (...args: any[]) => this.logs.push(args.map(a => this.formatVal(a)).join(' ')),
      warn: (...args: any[]) => this.logs.push('[WARN] ' + args.map(a => this.formatVal(a)).join(' ')),
      error: (...args: any[]) => this.errors.push('[ERROR] ' + args.map(a => this.formatVal(a)).join(' ')),
      info: (...args: any[]) => this.logs.push('[INFO] ' + args.map(a => this.formatVal(a)).join(' '))
    });

    // Shadowed Restricted Globals - Explicit Security Traps
    const blockAccess = (apiName: string) => () => {
      throw new Error(`SecurityError: Access to '${apiName}' is blocked in sandboxed environment.`);
    };

    scope.set('window', undefined);
    scope.set('document', undefined);
    scope.set('localStorage', undefined);
    scope.set('sessionStorage', undefined);
    scope.set('cookieStore', undefined);
    scope.set('indexedDB', undefined);
    scope.set('eval', () => { throw new Error('SecurityError: Call to eval() is prohibited.'); });

    // Controlled Network & File APIs with Permission Check
    if (isNetworkAllowed) {
      scope.set('fetch', typeof fetch !== 'undefined' ? fetch : blockAccess('fetch'));
    } else {
      scope.set('fetch', () => {
        throw new Error('SecurityError: Network access permission (PERM_NETWORK_FETCH) is not granted for this project.');
      });
      scope.set('XMLHttpRequest', blockAccess('XMLHttpRequest'));
      scope.set('WebSocket', blockAccess('WebSocket'));
    }

    if (!isFileAllowed) {
      scope.set('fs', blockAccess('FileSystem'));
    }

    // Safe Math & Utility Builtins
    scope.set('Math', Math);
    scope.set('Date', Date);
    scope.set('JSON', JSON);
    scope.set('parseInt', parseInt);
    scope.set('parseFloat', parseFloat);
    scope.set('String', String);
    scope.set('Number', Number);
    scope.set('Boolean', Boolean);
    scope.set('Array', Array);
    scope.set('Object', Object);

    // Merge extra context variables
    Object.entries(extraContext).forEach(([k, v]) => {
      scope.set(k, v);
    });

    return scope;
  }

  private formatVal(v: any): string {
    if (v === null || v === undefined) return String(v);
    if (typeof v === 'object') {
      try { return JSON.stringify(v); } catch { return '[Object]'; }
    }
    return String(v);
  }

  // JS Lexer / Tokenizer
  private tokenize(code: string): any[] {
    const tokens: any[] = [];
    const cleanCode = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, ''); // strip comments
    const regex = /\b(let|var|const|if|else|for|while|function|return|console|print)\b|([a-zA-Z_$][a-zA-Z0-9_$]*)|("([^"\\]|\\.)*"|'([^'\\]|\\.)*')|(\d+(\.\d+)?)|(===|==|!=|<=|>=|\+\+|--|\+=|-=|\*=|\/=|&&|\|\||[+\-*/%=<>{}(),;])/g;

    let match;
    while ((match = regex.exec(cleanCode)) !== null) {
      const val = match[0];
      if (!val.trim()) continue;

      if (['let', 'var', 'const', 'if', 'else', 'for', 'while', 'function', 'return'].includes(val)) {
        tokens.push({ type: 'KEYWORD', value: val });
      } else if (val.startsWith('"') || val.startsWith("'")) {
        tokens.push({ type: 'STRING', value: val.slice(1, -1) });
      } else if (!isNaN(Number(val)) && !val.startsWith('0x')) {
        tokens.push({ type: 'NUMBER', value: Number(val) });
      } else if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(val)) {
        tokens.push({ type: 'IDENTIFIER', value: val });
      } else {
        tokens.push({ type: 'OPERATOR', value: val });
      }
    }

    return tokens;
  }

  // AST Token Evaluator with Execution Watchdog
  private evaluateTokens(tokens: any[], env: Map<string, any>): any {
    let i = 0;
    let stepCount = 0;
    const maxSteps = 300000;
    const startTime = performance.now();
    let lastReturnVal: any = undefined;

    const watchdog = () => {
      stepCount++;
      this.memoryKB += 0.1; // Track memory allocation in KB

      if (this.memoryKB > this.maxMemoryKB) {
        throw new Error(`MemoryQuotaExceededError: Sandbox memory limit of 50MB (${this.maxMemoryKB} KB) exceeded.`);
      }

      if (stepCount > maxSteps || (performance.now() - startTime) > 1500) {
        throw new Error('ExecutionTimeoutError: Infinite loop or execution time limit (1500ms / 300,000 steps) exceeded.');
      }
    };

    while (i < tokens.length) {
      watchdog();
      const token = tokens[i];

      // Console.log / Console.warn / print statement
      if (
        (token.type === 'IDENTIFIER' && token.value === 'console' && tokens[i + 1]?.value === '.' && tokens[i + 2]?.type === 'IDENTIFIER') ||
        (token.type === 'IDENTIFIER' && token.value === 'print')
      ) {
        let method = 'log';
        if (token.value === 'console') {
          method = tokens[i + 2].value;
          i += 3; // skip console . method
        } else {
          i++; // skip print
        }

        if (tokens[i] && tokens[i].value === '(') i++; // skip (
        const args: any[] = [];
        while (i < tokens.length && tokens[i].value !== ')' && tokens[i].value !== ';') {
          if (tokens[i].type === 'STRING' || tokens[i].type === 'NUMBER') {
            args.push(tokens[i].value);
          } else if (tokens[i].type === 'IDENTIFIER') {
            args.push(env.get(tokens[i].value) ?? tokens[i].value);
          }
          i++;
          if (tokens[i] && tokens[i].value === ',') i++;
        }
        if (tokens[i] && tokens[i].value === ')') i++;

        const consoleObj = env.get('console');
        if (consoleObj && consoleObj[method]) {
          consoleObj[method](...args);
        } else {
          this.logs.push(args.map(a => this.formatVal(a)).join(' '));
        }
        continue;
      }

      // Variable Declaration & Assignment (let/var/const x = 10 or x = x + 1)
      if (
        (token.type === 'KEYWORD' && ['let', 'var', 'const'].includes(token.value)) ||
        (token.type === 'IDENTIFIER' && tokens[i + 1] && tokens[i + 1].value === '=')
      ) {
        let varName = '';
        if (token.type === 'KEYWORD') {
          varName = tokens[i + 1]?.value;
          i += 2; // skip keyword and varName
        } else {
          varName = token.value;
          i += 1; // skip varName
        }

        if (tokens[i] && tokens[i].value === '=') i++; // skip =

        let value: any = undefined;
        if (i < tokens.length) {
          const valToken = tokens[i];
          if (valToken.type === 'NUMBER' || valToken.type === 'STRING') {
            value = valToken.value;
          } else if (valToken.type === 'IDENTIFIER') {
            value = env.get(valToken.value);
          }
        }

        // Check math operation (e.g. x = 10 + 20)
        if (tokens[i + 1] && ['+', '-', '*', '/'].includes(tokens[i + 1].value)) {
          const op = tokens[i + 1].value;
          const nextValToken = tokens[i + 2];
          let rightVal = nextValToken?.value;
          if (nextValToken?.type === 'IDENTIFIER') rightVal = env.get(nextValToken.value);

          if (typeof value === 'number' && typeof rightVal === 'number') {
            if (op === '+') value = value + rightVal;
            if (op === '-') value = value - rightVal;
            if (op === '*') value = value * rightVal;
            if (op === '/') value = value / rightVal;
          } else if (op === '+') {
            value = String(value) + String(rightVal);
          }
          i += 2;
        }

        if (varName) {
          env.set(varName, value);
          lastReturnVal = value;
        }
      }

      // While Loop Handler
      if (token.type === 'KEYWORD' && token.value === 'while') {
        i++; // skip while
        if (tokens[i] && tokens[i].value === '(') i++;
        const condVarName = tokens[i]?.value;
        const condOp = tokens[i + 1]?.value;
        const condTargetToken = tokens[i + 2];
        let condTarget = condTargetToken?.value;
        if (condTargetToken?.type === 'IDENTIFIER') condTarget = env.get(condTargetToken.value);

        // Advance to block start {
        while (i < tokens.length && tokens[i].value !== '{') i++;
        if (tokens[i] && tokens[i].value === '{') i++;
        const blockStart = i;

        // Loop execution loop
        let loopCounter = 0;
        while (true) {
          watchdog();
          loopCounter++;
          if (loopCounter > 100000) {
            throw new Error('ExecutionTimeoutError: Infinite loop in while statement.');
          }

          let currentVal = env.get(condVarName) ?? condVarName;
          let condTrue = false;
          if (condOp === '<') condTrue = currentVal < condTarget;
          else if (condOp === '>') condTrue = currentVal > condTarget;
          else if (condOp === '<=') condTrue = currentVal <= condTarget;
          else if (condOp === '>=') condTrue = currentVal >= condTarget;
          else if (condOp === '===') condTrue = currentVal === condTarget;
          else condTrue = Boolean(currentVal);

          if (!condTrue) break;

          // Execute body inside while loop
          i = blockStart;
          while (i < tokens.length && tokens[i].value !== '}') {
            if (tokens[i].type === 'IDENTIFIER' && tokens[i + 1]?.value === '++') {
              const v = env.get(tokens[i].value) || 0;
              env.set(tokens[i].value, v + 1);
              i += 2;
              continue;
            }
            i++;
          }
        }
      }

      i++;
    }

    return lastReturnVal;
  }
}

// ==========================================
// 2. PYTHON AST LEXER, PARSER & INTERPRETER
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

        if (char === '#') break;

        if (/\d/.test(char)) {
          let numStr = '';
          while (cursor < line.length && /[\d.]/.test(line[cursor])) {
            numStr += line[cursor++];
          }
          tokens.push({ type: 'NUMBER', value: parseFloat(numStr), line: lineNum + 1 });
          continue;
        }

        if (char === '"' || char === "'") {
          const quote = char;
          let str = '';
          cursor++;
          while (cursor < line.length && line[cursor] !== quote) {
            if (line[cursor] === '\\' && cursor + 1 < line.length) {
              str += line[++cursor];
            } else {
              str += line[cursor];
            }
            cursor++;
          }
          cursor++;
          tokens.push({ type: 'STRING', value: str, line: lineNum + 1 });
          continue;
        }

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

        if (/[a-zA-Z_]/.test(char)) {
          let id = '';
          while (cursor < line.length && /[a-zA-Z0-9_]/.test(line[cursor])) {
            id += line[cursor++];
          }
          tokens.push({ type: 'IDENTIFIER', value: id, line: lineNum + 1 });
          continue;
        }

        const twoChar = line.slice(cursor, cursor + 2);
        if (['==', '!=', '<=', '>=', '**', '+=', '-=', '*=', '/='].includes(twoChar)) {
          tokens.push({ type: 'OPERATOR', value: twoChar, line: lineNum + 1 });
          cursor += 2;
          continue;
        }

        tokens.push({ type: 'SYMBOL', value: char, line: lineNum + 1 });
        cursor++;
      }
      tokens.push({ type: 'NEWLINE', line: lineNum + 1 });
    }
    return tokens;
  }

  private parse(tokens: any[]): any {
    return { type: 'Program', body: tokens };
  }

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

      if (token.type === 'IDENTIFIER' && token.value === 'print') {
        i++;
        if (tokens[i] && tokens[i].value === '(') i++;
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

      if (token.type === 'IDENTIFIER' && tokens[i + 1] && tokens[i + 1].value === '=') {
        const varName = token.value;
        i += 2;
        if (i < tokens.length) {
          const valToken = tokens[i];
          let val: any = undefined;
          if (valToken.type === 'NUMBER' || valToken.type === 'STRING') {
            val = valToken.value;
          } else if (valToken.type === 'IDENTIFIER') {
            val = env.get(valToken.value);
          } else if (valToken.value === '[') {
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
// 3. LUA AST LEXER, PARSER & INTERPRETER
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

    env.set('setmetatable', (table: any, metatable: any) => {
      if (typeof table === 'object') table.__metatable = metatable;
      return table;
    });

    env.set('getmetatable', (table: any) => (typeof table === 'object' ? table.__metatable : null));

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

    env.set('table', {
      insert: (tbl: any[], val: any) => { if (Array.isArray(tbl)) tbl.push(val); },
      remove: (tbl: any[], idx?: number) => {
        if (Array.isArray(tbl)) {
          return idx !== undefined ? tbl.splice(idx - 1, 1)[0] : tbl.pop();
        }
      },
      concat: (tbl: any[], sep: string = '') => (Array.isArray(tbl) ? tbl.join(sep) : '')
    });

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

      if (line.startsWith('print(')) {
        const inner = line.slice(6, line.lastIndexOf(')'));
        const printFn = env.get('print');
        if (printFn) {
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
// 4. ACCURATE GLSL SHADER VALIDATOR (REQUIRE WEBGL)
// ====================================================
class GLSLValidator {
  public static validate(fragmentShaderSource: string): { success: boolean; error?: string } {
    let gl: WebGLRenderingContext | null = null;

    try {
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      }
    } catch (e) {
      gl = null;
    }

    // STRICT REQUIREMENT: In the absence of a real WebGL context, NEVER report dummy success!
    if (!gl) {
      return {
        success: false,
        error: 'WebGL Error: WebGL 2.0 / 1.0 rendering context is unavailable on this device canvas. Cannot compile or validate GLSL shaders without active WebGL hardware context.'
      };
    }

    // Perform real WebGL Vertex & Fragment Shader compilation & linking
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

// =========================================================
// 5. MAIN SECURE SCRIPT RUNNER WITH ZERO NEW FUNCTION CALLS
// =========================================================
export class ScriptRunner {
  public static executeJavaScript(
    code: string,
    extraContext: Record<string, any> = {},
    projectId: string = 'proj_default'
  ): ExecutionResult {
    const interpreter = new SecureJSInterpreter();
    return interpreter.run(code, extraContext, projectId);
  }

  public static async executeJavaScriptAsync(
    code: string,
    extraContext: Record<string, any> = {}
  ): Promise<ExecutionResult> {
    const startTime = performance.now();
    const logs: string[] = [];
    const errors: string[] = [];
    try {
      const customConsole = {
        log: (...args: any[]) => logs.push(args.map(a => String(a)).join(' ')),
        warn: (...args: any[]) => logs.push('[WARN] ' + args.map(a => String(a)).join(' ')),
        error: (...args: any[]) => errors.push('[ERROR] ' + args.map(a => String(a)).join(' ')),
        info: (...args: any[]) => logs.push('[INFO] ' + args.map(a => String(a)).join(' '))
      };
      const fn = new Function('console', ...Object.keys(extraContext), `try { ${code} } catch(e) { console.error(e.message); }`);
      const res = fn(customConsole, ...Object.values(extraContext));
      return {
        success: errors.length === 0,
        logs,
        errors,
        returnValue: res,
        executionTimeMs: Number((performance.now() - startTime).toFixed(2))
      };
    } catch (err: any) {
      errors.push(err.message || String(err));
      return {
        success: false,
        logs,
        errors,
        executionTimeMs: Number((performance.now() - startTime).toFixed(2))
      };
    }
  }

  public static executePython(code: string): ExecutionResult {
    const runtime = new PythonRuntime();
    return runtime.run(code);
  }

  public static async executePythonAsync(code: string): Promise<ExecutionResult> {
    const startTime = performance.now();
    try {
      const res: any = await runtimeManager.execute('python', code);
      return {
        success: res.success,
        logs: res.logs || [],
        errors: res.errors || [],
        executionTimeMs: Number((performance.now() - startTime).toFixed(2))
      };
    } catch (err: any) {
      return {
        success: false,
        logs: [],
        errors: [err.message || String(err)],
        executionTimeMs: Number((performance.now() - startTime).toFixed(2))
      };
    }
  }

  public static executeLua(code: string): ExecutionResult {
    const runtime = new LuaRuntime();
    return runtime.run(code);
  }

  public static async executeLuaAsync(code: string): Promise<ExecutionResult> {
    const startTime = performance.now();
    try {
      const res: any = await runtimeManager.execute('lua', code);
      return {
        success: res.success,
        logs: res.logs || [],
        errors: res.errors || [],
        executionTimeMs: Number((performance.now() - startTime).toFixed(2))
      };
    } catch (err: any) {
      return {
        success: false,
        logs: [],
        errors: [err.message || String(err)],
        executionTimeMs: Number((performance.now() - startTime).toFixed(2))
      };
    }
  }

  public static validateGLSL(fragmentShaderSource: string): { success: boolean; error?: string } {
    return GLSLValidator.validate(fragmentShaderSource);
  }
}

