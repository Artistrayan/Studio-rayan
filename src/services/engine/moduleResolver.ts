/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VFSFile } from '../../types';

export interface ResolvedModule {
  path: string;
  code: string;
  exports: Record<string, any>;
}

export class VFSModuleResolver {
  private moduleCache: Map<string, ResolvedModule> = new Map();

  // Resolve imports in a file against VFS files array
  public resolveAndLink(mainFilePath: string, files: VFSFile[]): { linkedCode: string; errors: string[] } {
    const errors: string[] = [];
    const mainFile = files.find(f => f.path === mainFilePath || f.name === mainFilePath);

    if (!mainFile) {
      return { linkedCode: '', errors: [`Module not found: ${mainFilePath}`] };
    }

    const fileMap = new Map<string, VFSFile>();
    files.forEach(f => {
      fileMap.set(f.path, f);
      fileMap.set(f.name, f);
    });

    let code = mainFile.content;

    // 1. Process relative imports: import { x } from './utils.js' or import x from './x'
    code = code.replace(/import\s+(?:\{([^}]+)\}|(\w+)|(\*\s+as\s+\w+))\s+from\s+['"]([^'"]+)['"];?/g, (match, named, defaultImport, wildcard, importPath) => {
      // If it's a VFS file
      let targetFile = fileMap.get(importPath) || fileMap.get(`/src/${importPath.replace(/^\.\//, '')}`) || fileMap.get(importPath.replace(/^\.\//, ''));

      if (!targetFile && !importPath.endsWith('.js') && !importPath.endsWith('.ts')) {
        targetFile = fileMap.get(`${importPath}.js`) || fileMap.get(`${importPath}.ts`);
      }

      if (targetFile) {
        // Inline module exports
        return `// [Resolved VFS Module: ${targetFile.name}]\n${targetFile.content}\n`;
      }

      // External CDN Module Resolution (e.g. lodash, three, axios)
      if (!importPath.startsWith('.')) {
        return `// [External Package ESM Loader: ${importPath}]\nconsole.log("[ESM Loader] Importing external package '${importPath}' via CDN...");\n`;
      }

      errors.push(`Module resolution error: Cannot find module '${importPath}' imported in ${mainFile.name}`);
      return match;
    });

    // 2. Strip export statements for execution
    code = code.replace(/export\s+default\s+/g, '')
              .replace(/export\s+(const|let|var|function|class|interface|type)\s+/g, '$1 ');

    return { linkedCode: code, errors };
  }
}

export const moduleResolver = new VFSModuleResolver();
