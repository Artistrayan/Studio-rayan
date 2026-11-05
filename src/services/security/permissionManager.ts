/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PermissionType =
  | 'PERM_FILE_READ'
  | 'PERM_FILE_WRITE'
  | 'PERM_NETWORK_FETCH'
  | 'PERM_LOCAL_STORAGE'
  | 'PERM_AUDIO_PLAY'
  | 'PERM_HARDWARE_FULLSCREEN'
  | 'PERM_EXECUTE_UNSAFE';

export type PermissionState = 'granted' | 'prompt' | 'denied';

export interface PermissionDefinition {
  key: PermissionType;
  titleFa: string;
  titleEn: string;
  descFa: string;
  descEn: string;
  defaultState: PermissionState;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    key: 'PERM_FILE_READ',
    titleFa: 'خواندن فایل‌های سیستم مجازی (VFS)',
    titleEn: 'Read Virtual Filesystem',
    descFa: 'دسترسی به خواندن اسکریپت‌ها، سورس کدها و فایل‌های پروژه.',
    descEn: 'Access to read project scripts, source code, and assets.',
    defaultState: 'granted'
  },
  {
    key: 'PERM_FILE_WRITE',
    titleFa: 'ویرایش و نوشتن فایل‌های سیستم (VFS)',
    titleEn: 'Write Virtual Filesystem',
    descFa: 'قابلیت ایجاد، اصلاح و حذف فایل‌های سورس پروژه.',
    descEn: 'Ability to create, modify, and delete project files.',
    defaultState: 'granted'
  },
  {
    key: 'PERM_NETWORK_FETCH',
    titleFa: 'درخواست‌های شبکه و ارتباط خارجی (API)',
    titleEn: 'Outbound Network & API Calls',
    descFa: 'اجازه برقراری ارتباط‌های HTTP/WebSocket با سرورهای خارجی.',
    descEn: 'Permission to initiate outbound HTTP or WebSocket connections.',
    defaultState: 'prompt'
  },
  {
    key: 'PERM_LOCAL_STORAGE',
    titleFa: 'ذخیره‌سازی دیتای محلی (LocalStorage / DB)',
    titleEn: 'Local Data Persistence',
    descFa: 'اجازه ذخیره داده‌ها و تنظیمات پروژه روی حافظه مرورگر.',
    descEn: 'Permission to persist data and database entries in browser storage.',
    defaultState: 'granted'
  },
  {
    key: 'PERM_AUDIO_PLAY',
    titleFa: 'پخش و سنتز صدا (Web Audio API)',
    titleEn: 'Audio Playback & Synthesizer',
    descFa: 'دسترسی به تولید افکت‌های صوتی و موزیک‌های چیپ‌تون.',
    descEn: 'Access to sound synthesis and chiptune audio generation.',
    defaultState: 'granted'
  },
  {
    key: 'PERM_HARDWARE_FULLSCREEN',
    titleFa: 'حالت تمام‌صفحه و سخت‌افزار',
    titleEn: 'Fullscreen & Display Control',
    descFa: 'اجازه سوئیچ به نمای تمام‌صفحه و کنترل‌های ابعاد.',
    descEn: 'Permission to trigger fullscreen mode and screen frame controls.',
    defaultState: 'granted'
  },
  {
    key: 'PERM_EXECUTE_UNSAFE',
    titleFa: 'اجرای کدهای خارج از سندبکس',
    titleEn: 'Unsandboxed Script Execution',
    descFa: 'اجرای کدهایی که قصد دسترسی مستقیم به DOM یا مرورگر دارند.',
    descEn: 'Execution of scripts that request unmanaged browser/DOM access.',
    defaultState: 'denied'
  }
];

const STORAGE_PERMISSIONS_KEY = 'aetherforge_permissions_config';

export class PermissionManager {
  private permissions: Map<string, Record<PermissionType, PermissionState>> = new Map();

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_PERMISSIONS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          Object.keys(parsed).forEach(projId => {
            this.permissions.set(projId, parsed[projId]);
          });
        }
      }
    } catch (e) {
      console.warn('Failed to parse permissions storage', e);
    }
  }

  public getPermissionsForProject(projectId: string): Record<PermissionType, PermissionState> {
    if (!this.permissions.has(projectId)) {
      const defaultMap: Record<PermissionType, PermissionState> = {
        PERM_FILE_READ: 'granted',
        PERM_FILE_WRITE: 'granted',
        PERM_NETWORK_FETCH: 'prompt',
        PERM_LOCAL_STORAGE: 'granted',
        PERM_AUDIO_PLAY: 'granted',
        PERM_HARDWARE_FULLSCREEN: 'granted',
        PERM_EXECUTE_UNSAFE: 'denied'
      };
      this.permissions.set(projectId, defaultMap);
      this.saveToStorage();
    }
    return { ...this.permissions.get(projectId)! };
  }

  public setPermission(projectId: string, perm: PermissionType, state: PermissionState) {
    const current = this.getPermissionsForProject(projectId);
    current[perm] = state;
    this.permissions.set(projectId, current);
    this.saveToStorage();
  }

  public checkPermission(projectId: string, perm: PermissionType): boolean {
    const perms = this.getPermissionsForProject(projectId);
    const state = perms[perm];
    if (state === 'granted') return true;
    if (state === 'denied') return false;
    // If prompt, default to true for interactive dev unless denied
    return true;
  }

  private saveToStorage() {
    try {
      const obj: Record<string, Record<PermissionType, PermissionState>> = {};
      this.permissions.forEach((val, key) => {
        obj[key] = val;
      });
      localStorage.setItem(STORAGE_PERMISSIONS_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('Failed to save permissions to storage', e);
    }
  }
}

export const permissionManager = new PermissionManager();
