/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface KeyboardShortcut {
  id: string;
  keyCombo: string;
  label: string;
  category: 'General' | 'Editor' | '3D Canvas' | 'Navigation' | 'Build & Run';
  action: () => void;
}

class KeyboardShortcutManagerService {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private isListening: boolean = false;

  constructor() {
    this.registerDefaultShortcuts();
  }

  private registerDefaultShortcuts() {
    // Shortcuts will be bound to callbacks registered at runtime
  }

  public register(shortcut: KeyboardShortcut) {
    this.shortcuts.set(shortcut.id, shortcut);
  }

  public unregister(id: string) {
    this.shortcuts.delete(id);
  }

  public getAllShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  public init() {
    if (this.isListening) return;
    this.isListening = true;

    window.addEventListener('keydown', this.handleKeyDown);
  }

  public destroy() {
    this.isListening = false;
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Ignore key combinations if user is typing inside an input or textarea
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      if (e.key !== 'Escape') return;
    }

    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    const isAlt = e.altKey;

    this.shortcuts.forEach(shortcut => {
      const combo = shortcut.keyCombo.toLowerCase();
      
      let matches = false;
      if (combo === 'ctrl+z' && isCtrl && !isShift && e.key.toLowerCase() === 'z') matches = true;
      if (combo === 'ctrl+y' && isCtrl && e.key.toLowerCase() === 'y') matches = true;
      if (combo === 'ctrl+shift+z' && isCtrl && isShift && e.key.toLowerCase() === 'z') matches = true;
      if (combo === 'ctrl+s' && isCtrl && e.key.toLowerCase() === 's') matches = true;
      if (combo === 'ctrl+enter' && isCtrl && e.key === 'Enter') matches = true;
      if (combo === 'ctrl+/' && isCtrl && e.key === '/') matches = true;
      if (combo === 'f1' && e.key === 'F1') matches = true;
      if (combo === 'f11' && e.key === 'F11') matches = true;
      if (combo === 'alt+1' && isAlt && e.key === '1') matches = true;
      if (combo === 'alt+2' && isAlt && e.key === '2') matches = true;
      if (combo === 'alt+3' && isAlt && e.key === '3') matches = true;
      if (combo === 'alt+4' && isAlt && e.key === '4') matches = true;

      if (matches) {
        e.preventDefault();
        shortcut.action();
      }
    });
  };
}

export const shortcutManager = new KeyboardShortcutManagerService();
