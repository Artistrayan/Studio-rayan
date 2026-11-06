# Implementation Plan - AetherForge Studio Advanced Upgrades

## Overview
This plan addresses the advanced requirements for AetherForge Studio:
1. **WASM-powered Python & Lua Runtimes**: Integrate Pyodide and Wasmoon via Web Workers for real, secure, isolated execution with full library support.
2. **WebGL2 & WebGPU Shader Pipeline**: Full hardware shader compilation and precise line-by-line error reporting.
3. **IndexedDB Multi-Asset Storage**: Robust persistent storage for large projects, 3D models (GLB, glTF, OBJ, FBX), textures, and assets without localStorage bottlenecks.
4. **Enhanced File Import & Sanitization**: Support for complex 3D assets, audio/video streams, and secure sanitization.
5. **Real ForgeShell Terminal & Native Packaging**: Real command execution, package installation simulation, and production build chains.

## Proposed Changes

### 1. WASM Python & Lua Web Workers
- Create `/src/services/workers/pythonWorker.ts` and `/src/services/workers/luaWorker.ts` to execute Python (Pyodide sandbox) and Lua (Wasmoon / Lua WASM) in background worker threads with timeout and memory limits.
- Update `ScriptRunner` to delegate python and lua execution to these workers asynchronously.

### 2. WebGL2 & WebGPU Shader Compiler
- Update `GLSLValidator` in `scriptRunner.ts` to support WebGL2 context compilation and WebGPU WGSL validation headers with exact line number error extraction.

### 3. IndexedDB Asset & Project Storage
- Enhance `IndexedDBAdapter` to support storing binary 3D models (GLB/GLTF/OBJ/FBX), audio buffers, and large project bundles with transaction safety.

### 4. File Import & Asset Validation
- Enhance `FileSanitizer` to parse and validate 3D model structures, audio headers, and image blobs securely before VFS injection.

## Verification Plan
- Run `compile_applet` and `lint_applet` (`tsc --noEmit`).
- Execute `EngineTestRunner` suite to verify all runtime workers and storage adapters.
- Run `npm run build` to confirm production bundle success.
