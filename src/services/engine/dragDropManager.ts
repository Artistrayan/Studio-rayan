/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DraggedAssetPayload {
  type: '3d_mesh' | 'texture' | 'sound' | 'script' | 'tile';
  id: string;
  name: string;
  primitiveType?: string;
  dataUrl?: string;
}

class DragDropManagerService {
  private activePayload: DraggedAssetPayload | null = null;

  public setPayload(payload: DraggedAssetPayload) {
    this.activePayload = payload;
  }

  public getPayload(): DraggedAssetPayload | null {
    return this.activePayload;
  }

  public clearPayload() {
    this.activePayload = null;
  }
}

export const dragDropManager = new DragDropManagerService();
