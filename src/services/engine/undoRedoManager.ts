/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UndoStateSnapshot {
  id: string;
  timestamp: number;
  description: string;
  category: 'vfs' | '3d_scene' | 'tilemap' | 'settings';
  data: any;
}

class UndoRedoManagerService {
  private undoStack: UndoStateSnapshot[] = [];
  private redoStack: UndoStateSnapshot[] = [];
  private maxStackSize: number = 50;
  private listeners: Set<() => void> = new Set();

  public pushState(description: string, category: UndoStateSnapshot['category'], data: any) {
    const snapshot: UndoStateSnapshot = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      description,
      category,
      data: JSON.parse(JSON.stringify(data))
    };

    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    // Clear redo stack on new action
    this.redoStack = [];
    this.notifyListeners();
  }

  public undo(): UndoStateSnapshot | null {
    if (this.undoStack.length === 0) return null;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    this.notifyListeners();
    return this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1] : null;
  }

  public redo(): UndoStateSnapshot | null {
    if (this.redoStack.length === 0) return null;
    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    this.notifyListeners();
    return next;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getUndoHistory(): UndoStateSnapshot[] {
    return [...this.undoStack];
  }

  public getRedoHistory(): UndoStateSnapshot[] {
    return [...this.redoStack];
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }
}

export const undoRedoManager = new UndoRedoManagerService();
