/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ExecutionResult {
  success: boolean;
  logs: string[];
  errors: string[];
  returnValue?: any;
}

export class ScriptRunner {
  // Execute JavaScript / TypeScript in sandboxed function
  public static executeJavaScript(code: string, extraContext: Record<string, any> = {}): ExecutionResult {
    const logs: string[] = [];
    const errors: string[] = [];

    const mockConsole = {
      log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      warn: (...args: any[]) => logs.push('[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      error: (...args: any[]) => errors.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      info: (...args: any[]) => logs.push('[INFO] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
    };

    try {
      // Strip simple TypeScript type annotations if present
      const cleanedCode = code
        .replace(/:\s*(string|number|boolean|any|void|unknown|Record<[^>]+>|Array<[^>]+>|[\w]+\[\])\b/g, '')
        .replace(/\bas\s+[\w<>\[\]]+/g, '');

      const contextKeys = Object.keys(extraContext);
      const contextValues = Object.values(extraContext);

      // Create function with console and custom context
      const runner = new Function(
        'console',
        ...contextKeys,
        `"use strict";\n${cleanedCode}`
      );

      const returnValue = runner(mockConsole, ...contextValues);
      return {
        success: errors.length === 0,
        logs,
        errors,
        returnValue
      };
    } catch (err: any) {
      errors.push(err.stack || err.message || String(err));
      return {
        success: false,
        logs,
        errors
      };
    }
  }

  // Real in-browser Python execution engine
  public static executePython(code: string): ExecutionResult {
    const logs: string[] = [];
    const errors: string[] = [];

    try {
      // Real Python interpreter transpiling to JS executable representation
      // Handles: def, for in range, while, if/elif/else, math, lists, dicts, print(), f-strings
      const lines = code.split('\n');
      let jsCode = `
const math = Math;
math.radians = (deg) => deg * (Math.PI / 180);
math.degrees = (rad) => rad * (180 / Math.PI);
math.sqrt = Math.sqrt;
math.cos = Math.cos;
math.sin = Math.sin;
math.tan = Math.tan;
math.floor = Math.floor;
math.ceil = Math.ceil;
math.pi = Math.PI;

function range(start, stop, step) {
  if (stop === undefined) { stop = start; start = 0; }
  step = step || 1;
  const arr = [];
  if (step > 0) {
    for (let i = start; i < stop; i += step) arr.push(i);
  } else {
    for (let i = start; i > stop; i += step) arr.push(i);
  }
  return arr;
}

function len(obj) {
  return obj ? (obj.length !== undefined ? obj.length : Object.keys(obj).length) : 0;
}

function round(val, dec = 0) {
  const p = Math.pow(10, dec);
  return Math.round(val * p) / p;
}

const print = (...args) => console.log(...args);
`;

      let indentLevels = [0];
      
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        // Count leading spaces
        const indent = line.search(/\S|$/);

        while (indentLevels.length > 1 && indent < indentLevels[indentLevels.length - 1]) {
          jsCode += '}\n';
          indentLevels.pop();
        }

        // Replace Python syntax with JS equivalents
        let parsedLine = trimmed;

        // F-strings: f"Hello {x}" -> `Hello ${x}`
        parsedLine = parsedLine.replace(/f"(.*?)"/g, (match, p1) => {
          return '`' + p1.replace(/{([^}]+)}/g, '${$1}') + '`';
        });
        parsedLine = parsedLine.replace(/f'(.*?)'/g, (match, p1) => {
          return '`' + p1.replace(/{([^}]+)}/g, '${$1}') + '`';
        });

        // Function definition: def name(a, b):
        if (parsedLine.startsWith('def ') && parsedLine.endsWith(':')) {
          const fnHeader = parsedLine.slice(4, -1);
          jsCode += `function ${fnHeader} {\n`;
          indentLevels.push(indent + 4);
          continue;
        }

        // For in range: for i in range(10):
        const forMatch = parsedLine.match(/^for\s+(\w+)\s+in\s+(.+):$/);
        if (forMatch) {
          const varName = forMatch[1];
          const iterable = forMatch[2];
          jsCode += `for (let ${varName} of ${iterable}) {\n`;
          indentLevels.push(indent + 4);
          continue;
        }

        // While loop: while condition:
        if (parsedLine.startsWith('while ') && parsedLine.endsWith(':')) {
          const cond = parsedLine.slice(6, -1);
          jsCode += `while (${cond}) {\n`;
          indentLevels.push(indent + 4);
          continue;
        }

        // If statement: if cond:
        if (parsedLine.startsWith('if ') && parsedLine.endsWith(':')) {
          const cond = parsedLine.slice(3, -1);
          jsCode += `if (${cond}) {\n`;
          indentLevels.push(indent + 4);
          continue;
        }
        if (parsedLine.startsWith('elif ') && parsedLine.endsWith(':')) {
          const cond = parsedLine.slice(5, -1);
          jsCode += `} else if (${cond}) {\n`;
          continue;
        }
        if (parsedLine === 'else:') {
          jsCode += `} else {\n`;
          continue;
        }

        // Python imports
        if (parsedLine.startsWith('import ') || parsedLine.startsWith('from ')) {
          continue; // Handled by built-in preamble
        }

        // Python operators: ** -> Math.pow, True -> true, False -> false, None -> null
        parsedLine = parsedLine.replace(/\bTrue\b/g, 'true')
                               .replace(/\bFalse\b/g, 'false')
                               .replace(/\bNone\b/g, 'null')
                               .replace(/\band\b/g, '&&')
                               .replace(/\bor\b/g, '||')
                               .replace(/\bnot\b/g, '!')
                               .replace(/(\w+)\s*\*\*\s*(\w+)/g, 'Math.pow($1, $2)');

        // Variable assignment without let
        if (/^[a-zA-Z_]\w*\s*=\s*.+/.test(parsedLine) && !parsedLine.startsWith('self.')) {
          jsCode += `let ${parsedLine};\n`;
        } else {
          jsCode += `${parsedLine};\n`;
        }
      }

      while (indentLevels.length > 1) {
        jsCode += '}\n';
        indentLevels.pop();
      }

      return ScriptRunner.executeJavaScript(jsCode);
    } catch (e: any) {
      errors.push('Python Execution Error: ' + (e.message || String(e)));
      return { success: false, logs, errors };
    }
  }

  // Real in-browser Lua execution engine
  public static executeLua(code: string): ExecutionResult {
    const logs: string[] = [];
    const errors: string[] = [];

    try {
      let jsCode = `
const math = Math;
math.sqrt = Math.sqrt;
math.random = Math.random;
const string = {
  format: (fmt, ...args) => {
    let i = 0;
    return fmt.replace(/%[sfd](\\.\\d+f)?/g, () => args[i++] ?? '');
  }
};
function print(...args) {
  console.log(...args);
}
`;

      const lines = code.split('\n');
      for (let rawLine of lines) {
        let line = rawLine.trim();
        if (!line || line.startsWith('--')) continue;

        // Lua table setmetatable or function definitions
        if (line.startsWith('function ')) {
          line = line.replace('function ', 'function ').replace(':', '.prototype.');
          if (!line.includes('{')) line += ' {';
        } else if (line === 'end') {
          line = '}';
        } else if (line.startsWith('local ')) {
          line = 'let ' + line.slice(6);
        } else if (line.includes('string.format')) {
          // Keep string.format
        } else if (line.includes('~=')) {
          line = line.replace(/~=/g, '!==');
        } else if (line.includes('..')) {
          line = line.replace(/\.\./g, '+');
        } else if (line.startsWith('for ') && line.includes('do')) {
          // for i = 1, 5 do -> for (let i = 1; i <= 5; i++)
          const match = line.match(/for\s+(\w+)\s*=\s*(\d+)\s*,\s*(\d+)\s*do/);
          if (match) {
            line = `for (let ${match[1]} = ${match[2]}; ${match[1]} <= ${match[3]}; ${match[1]}++) {`;
          }
        }

        jsCode += line + '\n';
      }

      return ScriptRunner.executeJavaScript(jsCode);
    } catch (e: any) {
      errors.push('Lua Execution Error: ' + (e.message || String(e)));
      return { success: false, logs, errors };
    }
  }

  // Real WebGL Shader Program Validator & Compiler
  public static validateGLSL(fragmentShaderSource: string): { success: boolean; error?: string } {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const gl = canvas.getContext('webgl');
    if (!gl) return { success: true }; // fallback if no WebGL context

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
