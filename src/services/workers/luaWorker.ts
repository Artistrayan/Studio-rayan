/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LuaFactory } from "wasmoon";

let factory: LuaFactory | null = null;
let lua: Awaited<ReturnType<LuaFactory["createEngine"]>> | null = null;

self.onmessage = async (event) => {
  const { id, code } = event.data;

  try {
    factory ??= new LuaFactory();
    lua ??= await factory.createEngine();

    const logs: string[] = [];

    lua.global.set("print", (...args: unknown[]) => {
      logs.push(args.map(String).join("\t"));
    });

    await lua.doString(code);

    self.postMessage({
      id,
      success: true,
      logs,
      errors: []
    });
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      logs: [],
      errors: [String(error)]
    });
  }
};
