/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RuntimeLanguage = "python" | "lua";

export class RuntimeManager {
  private workers = new Map<RuntimeLanguage, Worker>();

  private getWorker(language: RuntimeLanguage): Worker {
    let worker = this.workers.get(language);

    if (!worker) {
      worker = language === "python"
        ? new Worker(
            new URL("./pythonWorker.ts", import.meta.url),
            { type: "module" }
          )
        : new Worker(
            new URL("./luaWorker.ts", import.meta.url),
            { type: "module" }
          );

      this.workers.set(language, worker);
    }

    return worker;
  }

  execute(language: RuntimeLanguage, code: string): Promise<unknown> {
    const worker = this.getWorker(language);
    const id = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        this.workers.delete(language);
        reject(new Error("Execution timeout"));
      }, 10000);

      worker.onmessage = (event) => {
        if (event.data.id !== id) return;
        clearTimeout(timeout);
        resolve(event.data);
      };

      worker.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };

      worker.postMessage({ id, code });
    });
  }

  stop(language: RuntimeLanguage): void {
    this.workers.get(language)?.terminate();
    this.workers.delete(language);
  }
}
