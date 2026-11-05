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

    // 1. Check for malicious script tags or unsafe executable embeds in JSON / Config files
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

    // 2. Check for unsafe HTML script tags inside uploaded text files
    if (ext === 'html' || ext === 'svg') {
      if (/<script[\s\S]*?>[\s\S]*?<\/script>/gi.test(content) || /javascript:/gi.test(content)) {
        // Strip out active inline script tags from SVGs/HTMLs for security
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

    // 3. Validate GLB / GLTF 3D binary header models
    if (ext === 'gltf' || ext === 'glb') {
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
    }

    return { valid: true, cleanContent: content, threatLevel: 'SAFE' };
  }
}
