/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TelemetryErrorRecord {
  id: string;
  timestamp: string;
  severity: 'fatal' | 'error' | 'warning' | 'info';
  sourceModule: string;
  message: string;
  stackTrace?: string;
  deviceInfo: {
    userAgent: string;
    screenWidth: number;
    screenHeight: number;
    webglVersion: string;
  };
}

class ErrorTelemetryService {
  private records: TelemetryErrorRecord[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initGlobalHandlers();
  }

  private initGlobalHandlers() {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.recordError('error', 'WindowRuntime', event.message, event.error?.stack);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.recordError('error', 'PromiseRejection', String(event.reason), event.reason?.stack);
    });
  }

  public recordError(
    severity: TelemetryErrorRecord['severity'],
    sourceModule: string,
    message: string,
    stackTrace?: string
  ) {
    const record: TelemetryErrorRecord = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      severity,
      sourceModule,
      message,
      stackTrace,
      deviceInfo: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'NodeJS',
        screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
        screenHeight: typeof window !== 'undefined' ? window.innerHeight : 1080,
        webglVersion: 'WebGL 2.0 (OpenGL ES 3.0)'
      }
    };

    this.records.unshift(record);
    if (this.records.length > 200) {
      this.records.pop();
    }
    this.notify();
  }

  public getTelemetryRecords(): TelemetryErrorRecord[] {
    return [...this.records];
  }

  public clearTelemetry() {
    this.records = [];
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const errorTelemetry = new ErrorTelemetryService();
