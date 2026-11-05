/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CodeIssue {
  id: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'suggestion';
  title: string;
  description: string;
  badSnippet: string;
  suggestedFix: string;
  suggestedPosition?: string;
  autoFixAvailable: boolean;
  fixType:
    | 'misplaced_import'
    | 'mismatched_brackets'
    | 'misplaced_return'
    | 'loop_event_listener'
    | 'missing_async'
    | 'var_before_init'
    | 'missing_semicolon'
    | 'canvas_init_order'
    | 'generic';
}

export class CodeDiagnosticsEngine {
  public static analyze(code: string, language: string): { issues: CodeIssue[]; healthScore: number } {
    const issues: CodeIssue[] = [];
    const lines = code.split('\n');

    if (language === 'javascript' || language === 'typescript') {
      this.analyzeJavaScript(lines, code, issues);
    } else if (language === 'python') {
      this.analyzePython(lines, code, issues);
    } else if (language === 'glsl') {
      this.analyzeGLSL(lines, code, issues);
    }

    // Calculate Code Health Score (100 down to 0)
    let penalty = 0;
    issues.forEach(iss => {
      if (iss.severity === 'error') penalty += 25;
      else if (iss.severity === 'warning') penalty += 12;
      else penalty += 5;
    });
    const healthScore = Math.max(0, 100 - penalty);

    return { issues, healthScore };
  }

  // Deep Analysis for JavaScript & TypeScript
  private static analyzeJavaScript(lines: string[], fullCode: string, issues: CodeIssue[]) {
    let hasCodeBeforeImport = false;
    let bracketStack: { char: string; line: number; col: number }[] = [];
    let insideLoop = false;
    let loopStartLine = 0;

    // Check bracket balance and line-by-line syntax
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i];
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;

      // 1. Detect Misplaced Import (Imports after executable code)
      if (trimmed.startsWith('import ') || (trimmed.startsWith('const ') && trimmed.includes('require('))) {
        if (hasCodeBeforeImport) {
          issues.push({
            id: `misplaced_import_${lineNum}`,
            line: lineNum,
            column: line.indexOf(trimmed) + 1,
            severity: 'warning',
            title: 'جایگذاری نادرست دستور Import',
            description: 'دستور import در میان کدهای اجرایی قرار گرفته است. طبق استانداردهای جاوااسکریپت تمام ایمپورت‌ها باید در بالای فایل باشند.',
            badSnippet: trimmed,
            suggestedPosition: 'خط ۱ (ابتدای فایل)',
            suggestedFix: 'انتقال دستور به ابتدای فایل',
            autoFixAvailable: true,
            fixType: 'misplaced_import'
          });
        }
      } else {
        hasCodeBeforeImport = true;
      }

      // 2. Detect Misplaced Return (return outside a function)
      if (/^return\b/.test(trimmed)) {
        // Simple function depth heuristic
        const openBracesBefore = fullCode.slice(0, fullCode.indexOf(trimmed)).split('{').length - 1;
        const closeBracesBefore = fullCode.slice(0, fullCode.indexOf(trimmed)).split('}').length - 1;
        if (openBracesBefore <= closeBracesBefore) {
          issues.push({
            id: `misplaced_return_${lineNum}`,
            line: lineNum,
            column: 1,
            severity: 'error',
            title: 'موقعیت اشتباه دستور return',
            description: 'دستور return در محدوده عمومی (Global Scope) قرار دارد و خارج از بدنه تابع مجاز نیست.',
            badSnippet: trimmed,
            suggestedPosition: 'داخل بدنه تابع مربوطه',
            suggestedFix: '// حذف یا انتقال به داخل تابع',
            autoFixAvailable: true,
            fixType: 'misplaced_return'
          });
        }
      }

      // 3. Detect Event Listener inside Game Loop / Update (Performance hazard)
      if (trimmed.includes('function update') || trimmed.includes('function loop') || trimmed.includes('function animate')) {
        insideLoop = true;
        loopStartLine = lineNum;
      }

      if (insideLoop && (trimmed.includes('.addEventListener(') || trimmed.includes('window.addEventListener('))) {
        issues.push({
          id: `loop_listener_${lineNum}`,
          line: lineNum,
          column: line.indexOf('addEventListener') + 1,
          severity: 'error',
          title: 'اشتباه فاحش در جایگذاری Event Listener',
          description: 'دستور addEventListener داخل حلقه بازی (Game Loop) قرار گرفته است! این کار در هر فریم یک لیسنر جدید می‌سازد و بازی دچار افت فریم و لگ شدید می‌شود.',
          badSnippet: trimmed,
          suggestedPosition: `قبل از خط ${loopStartLine} یا در تابع init()`,
          suggestedFix: 'انتقال EventListener به خارج از حلقه فریم',
          autoFixAvailable: true,
          fixType: 'loop_event_listener'
        });
      }

      if (insideLoop && trimmed === '}' && line.search(/\S/) === 0) {
        insideLoop = false;
      }

      // 4. Detect Await without Async
      if (/\bawait\b/.test(trimmed) && !trimmed.startsWith('//')) {
        // Look backwards for function definition
        let foundAsync = false;
        for (let j = i; j >= Math.max(0, i - 15); j--) {
          if (/\basync\b/.test(lines[j])) {
            foundAsync = true;
            break;
          }
        }
        if (!foundAsync) {
          issues.push({
            id: `missing_async_${lineNum}`,
            line: lineNum,
            column: line.indexOf('await') + 1,
            severity: 'error',
            title: 'استفاده از await در تابع غیر async',
            description: 'کلمه کلیدی await فقط در توابعی که با کلمه async تعریف شده‌اند مجاز است.',
            badSnippet: trimmed,
            suggestedPosition: `تعریف تابع در بالای خط ${lineNum}`,
            suggestedFix: 'افزودن async به تعریف تابع',
            autoFixAvailable: true,
            fixType: 'missing_async'
          });
        }
      }

      // 5. Track brackets
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '{' || char === '(' || char === '[') {
          bracketStack.push({ char, line: lineNum, col: c + 1 });
        } else if (char === '}' || char === ')' || char === ']') {
          if (bracketStack.length === 0) {
            issues.push({
              id: `extra_bracket_${lineNum}_${c}`,
              line: lineNum,
              column: c + 1,
              severity: 'error',
              title: `بسته‌شدن پرانتز یا آکولاد اضافه '${char}'`,
              description: `علامت '${char}' بدون آکولاد یا پرانتز باز متناظر قرار گرفته است.`,
              badSnippet: line,
              suggestedFix: `حذف علامت '${char}'`,
              autoFixAvailable: true,
              fixType: 'mismatched_brackets'
            });
          } else {
            const last = bracketStack[bracketStack.length - 1];
            const isMatch =
              (last.char === '{' && char === '}') ||
              (last.char === '(' && char === ')') ||
              (last.char === '[' && char === ']');
            if (isMatch) {
              bracketStack.pop();
            } else {
              issues.push({
                id: `mismatched_bracket_${lineNum}`,
                line: lineNum,
                column: c + 1,
                severity: 'error',
                title: `عدم تطابق آکولاد: '${char}' بجای بستن '${last.char}'`,
                description: `علامت '${last.char}' در خط ${last.line} باز شده اما با '${char}' در خط ${lineNum} بسته شده است.`,
                badSnippet: line,
                suggestedFix: `تعویض با علامت صحیح متناظر`,
                autoFixAvailable: true,
                fixType: 'mismatched_brackets'
              });
              bracketStack.pop();
            }
          }
        }
      }
    }

    // Check for unclosed brackets remaining at EOF
    if (bracketStack.length > 0) {
      const unclosed = bracketStack[bracketStack.length - 1];
      const matchingClose = unclosed.char === '{' ? '}' : unclosed.char === '(' ? ')' : ']';
      issues.push({
        id: `unclosed_bracket_${unclosed.line}`,
        line: lines.length,
        column: 1,
        severity: 'error',
        title: `آکولاد یا پرانتز باز بدون بسته: '${unclosed.char}'`,
        description: `علامت '${unclosed.char}' که در خط ${unclosed.line} باز شده است، تا انتهای فایل بسته نشده است.`,
        badSnippet: lines[unclosed.line - 1] || '',
        suggestedPosition: `انتهای فایل (خط ${lines.length + 1})`,
        suggestedFix: `افزودن '${matchingClose}' در انتهای بلوک کد`,
        autoFixAvailable: true,
        fixType: 'mismatched_brackets'
      });
    }
  }

  // Deep Analysis for Python
  private static analyzePython(lines: string[], fullCode: string, issues: CodeIssue[]) {
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) continue;

      // Def without colon
      if (trimmed.startsWith('def ') && !trimmed.endsWith(':')) {
        issues.push({
          id: `py_def_colon_${lineNum}`,
          line: lineNum,
          column: line.length,
          severity: 'error',
          title: 'نبود دو نقطه (:) در پایان تعریف تابع پایتون',
          description: 'در پایتون انتهای تعریف توابع، حلقه‌ها و شرط‌ها حتماً باید علامت دو نقطه (:) قرار گیرد.',
          badSnippet: trimmed,
          suggestedFix: `${trimmed}:`,
          autoFixAvailable: true,
          fixType: 'generic'
        });
      }

      // If/for/while without colon
      if ((trimmed.startsWith('if ') || trimmed.startsWith('for ') || trimmed.startsWith('while ')) && !trimmed.endsWith(':')) {
        issues.push({
          id: `py_block_colon_${lineNum}`,
          line: lineNum,
          column: line.length,
          severity: 'error',
          title: 'علامت (:) در پایان دستور پایتون جا افتاده است',
          description: 'دستورات شرطی و حلقه‌ها در پایتون باید با علامت : خاتمه یابند.',
          badSnippet: trimmed,
          suggestedFix: `${trimmed}:`,
          autoFixAvailable: true,
          fixType: 'generic'
        });
      }

      // JS syntax in Python
      if (trimmed.endsWith(';') || trimmed.includes('function ') || trimmed.includes('console.log(')) {
        issues.push({
          id: `py_js_syntax_${lineNum}`,
          line: lineNum,
          column: 1,
          severity: 'warning',
          title: 'سینتکس جاوااسکریپت در فایل پایتون',
          description: 'دستوراتی مثل سمیکالن (;) یا console.log در پایتون استفاده نمی‌شوند (بجای آن از print() استفاده کنید).',
          badSnippet: trimmed,
          suggestedFix: trimmed.replace(/console\.log\(/g, 'print(').replace(/;$/, ''),
          autoFixAvailable: true,
          fixType: 'generic'
        });
      }
    }
  }

  // Deep Analysis for GLSL
  private static analyzeGLSL(lines: string[], fullCode: string, issues: CodeIssue[]) {
    if (!fullCode.includes('void main()') && !fullCode.includes('void main ()')) {
      issues.push({
        id: 'glsl_no_main',
        line: 1,
        column: 1,
        severity: 'error',
        title: 'نبود تابع اصلی void main() در شیدر GLSL',
        description: 'تمام شیدرهای WebGL باید دارای تابع ورود void main() باشند.',
        badSnippet: 'Shader code',
        suggestedFix: 'void main() { gl_FragColor = vec4(1.0); }',
        autoFixAvailable: true,
        fixType: 'generic'
      });
    }

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) return;
      if (!trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}') && !trimmed.startsWith('#')) {
        issues.push({
          id: `glsl_semi_${lineNum}`,
          line: lineNum,
          column: line.length,
          severity: 'error',
          title: 'نبود سمیکالن (;) در پایان خط GLSL',
          description: 'دستورات شیدر GLSL باید با سمیکالن پایان یابند.',
          badSnippet: trimmed,
          suggestedFix: `${trimmed};`,
          autoFixAvailable: true,
          fixType: 'missing_semicolon'
        });
      }
    });
  }

  // 1-Click Code Auto-Repair (اصلاح کد های اشتباه با کد های صحیح)
  public static applyFix(code: string, issue: CodeIssue): string {
    const lines = code.split('\n');

    switch (issue.fixType) {
      case 'misplaced_import': {
        // Remove line and prepend to top
        const targetLine = lines[issue.line - 1];
        lines.splice(issue.line - 1, 1);
        lines.unshift(targetLine);
        return lines.join('\n');
      }

      case 'mismatched_brackets': {
        if (issue.suggestedFix.includes('افزودن')) {
          return code + '\n}\n';
        } else if (issue.suggestedFix.includes('حذف')) {
          lines[issue.line - 1] = lines[issue.line - 1].replace(/[}{)\]]/, '');
          return lines.join('\n');
        }
        return code;
      }

      case 'misplaced_return': {
        lines[issue.line - 1] = '// ' + lines[issue.line - 1] + ' // [Fixed: misplaced return]';
        return lines.join('\n');
      }

      case 'loop_event_listener': {
        const listenerLine = lines[issue.line - 1];
        lines.splice(issue.line - 1, 1);
        lines.unshift(listenerLine); // Move outside loop to top level
        return lines.join('\n');
      }

      case 'missing_async': {
        // Find preceding function declaration and prepend async
        for (let i = issue.line - 1; i >= 0; i--) {
          if (lines[i].includes('function') && !lines[i].includes('async')) {
            lines[i] = lines[i].replace('function', 'async function');
            break;
          }
        }
        return lines.join('\n');
      }

      case 'missing_semicolon': {
        lines[issue.line - 1] = lines[issue.line - 1] + ';';
        return lines.join('\n');
      }

      default: {
        if (issue.suggestedFix && lines[issue.line - 1]) {
          lines[issue.line - 1] = issue.suggestedFix;
          return lines.join('\n');
        }
        return code;
      }
    }
  }

  // Auto-Fix All Issues in One Click
  public static autoFixAll(code: string, issues: CodeIssue[]): string {
    let repaired = code;
    // Fix in reverse order so line numbers remain aligned
    const sorted = [...issues].sort((a, b) => b.line - a.line);
    for (const issue of sorted) {
      if (issue.autoFixAvailable) {
        repaired = this.applyFix(repaired, issue);
      }
    }
    return repaired;
  }
}
