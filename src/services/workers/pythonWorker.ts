/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { loadPyodide } from "pyodide";

let runtime: Awaited<ReturnType<typeof loadPyodide>> | null = null;

self.onmessage = async (event) => {
  const { id, code } = event.data;

  try {
    runtime ??= await loadPyodide();

    const output: string[] = [];

    runtime.setStdout({
      batched: (text) => output.push(text)
    });

    runtime.setStderr({
      batched: (text) => output.push(text)
    });

    await runtime.runPythonAsync(code);

    self.postMessage({
      id,
      success: true,
      logs: output,
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
