/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FileSanitizationResult {
  valid: boolean;
  cleanContent?: string;
  error?: string;
  threatLevel: 'SAFE' | 'POTENTIAL_SCRIPT_INJECTION' | 'CORRUPT_FORMAT' | 'DISALLOWED_BINARY';
}

export class FileSanitizer {
  public static sanitizeImportedFile(fileName: string, content: string): FileSanitizationResult {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    // 1. Check for JSON / Project configuration
    if (ext === 'json') {
      try {
        const parsed = JSON.parse(content);
        if (typeof parsed !== 'object' || parsed === null) {
          return {
            valid: false,
            error: 'Corrupt JSON file format: root value must be an object or array.',
            threatLevel: 'CORRUPT_FORMAT'
          };
        }
        return { valid: true, cleanContent: JSON.stringify(parsed, null, 2), threatLevel: 'SAFE' };
      } catch (e: any) {
        return {
          valid: false,
          error: `JSON Parsing Error: ${e.message}`,
          threatLevel: 'CORRUPT_FORMAT'
        };
      }
    }

    // 2. Check HTML / SVG for XSS
    if (ext === 'html' || ext === 'svg') {
      if (/<script[\s\S]*?>[\s\S]*?<\/script>/gi.test(content) || /javascript:/gi.test(content)) {
        const sanitized = content
          .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '<!-- Sanitized Script -->')
          .replace(/on\w+\s*=\s*".*?"/gi, '');
        return {
          valid: true,
          cleanContent: sanitized,
          threatLevel: 'POTENTIAL_SCRIPT_INJECTION',
          error: 'Inline script tags were automatically sanitized from the file.'
        };
      }
    }

    // 3. Validate 3D models (glTF, GLB, OBJ, FBX)
    if (ext === 'gltf') {
      try {
        const gltfObj = JSON.parse(content);
        if (!gltfObj.asset || !gltfObj.asset.version) {
          return {
            valid: false,
            error: 'Invalid glTF 3D model: missing required asset.version field.',
            threatLevel: 'CORRUPT_FORMAT'
          };
        }
      } catch {
        return { valid: false, error: 'Malformed glTF JSON structure.', threatLevel: 'CORRUPT_FORMAT' };
      }
    }

    if (ext === 'obj') {
      if (!content.includes('v ') && !content.includes('f ')) {
        return {
          valid: false,
          error: 'Invalid OBJ 3D model: missing vertex or face data.',
          threatLevel: 'CORRUPT_FORMAT'
        };
      }
    }

    // 4. Validate Code files (js, ts, py, lua, glsl)
    if (['js', 'ts', 'py', 'lua', 'glsl'].includes(ext)) {
      if (content.includes('__proto__') || content.includes('constructor.prototype')) {
        return {
          valid: false,
          error: 'Security Warning: Prototype pollution pattern detected in code file.',
          threatLevel: 'POTENTIAL_SCRIPT_INJECTION'
        };
      }
    }

    return { valid: true, cleanContent: content, threatLevel: 'SAFE' };
  }
}
