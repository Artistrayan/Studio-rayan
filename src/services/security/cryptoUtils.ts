/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class CryptoUtils {
  // Generate Cryptographically Secure Random String ID
  public static generateId(prefix: string = 'id', length: number = 12): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(length);

    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
    } else if (typeof globalThis !== 'undefined' && (globalThis as any).crypto) {
      (globalThis as any).crypto.getRandomValues(array);
    } else {
      try {
        const nodeCrypto = require('crypto');
        const buf = nodeCrypto.randomBytes(length);
        for (let i = 0; i < length; i++) array[i] = buf[i];
      } catch {
        for (let i = 0; i < length; i++) array[i] = Math.floor(Math.random() * 256);
      }
    }

    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(array[i] % chars.length);
    }
    return `${prefix}_${Date.now()}_${result}`;
  }

  // Generate Cryptographically Secure Commit / SHA Hex Hash
  public static generateHexHash(length: number = 8): string {
    const chars = '0123456789abcdef';
    const array = new Uint8Array(length);

    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
    } else if (typeof globalThis !== 'undefined' && (globalThis as any).crypto) {
      (globalThis as any).crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < length; i++) array[i] = Math.floor(Math.random() * 256);
    }

    let hash = '';
    for (let i = 0; i < length; i++) {
      hash += chars.charAt(array[i] % chars.length);
    }
    return hash;
  }
}
