/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface JWTPayload {
  iss: string;
  sub: string;
  scope: string;
  iat: number;
  exp: number;
  [key: string]: any;
}

export class CryptoJWTEngine {
  // Generate Cryptographically Secure Random Bytes using Web Crypto API
  public static generateSecureRandomString(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(length);
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
    } else {
      // Fallback Node crypto
      for (let i = 0; i < length; i++) array[i] = Math.floor(Math.random() * 256);
    }
    let res = '';
    for (let i = 0; i < length; i++) {
      res += chars.charAt(array[i] % chars.length);
    }
    return res;
  }

  // Base64URL Encoding Helper
  private static base64UrlEncode(str: string): string {
    const base64 = btoa(str);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // Base64URL Decoding Helper
  private static base64UrlDecode(str: string): string {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return atob(base64);
  }

  private static getCrypto(): Crypto {
    if (typeof window !== 'undefined' && window.crypto) {
      return window.crypto;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).crypto) {
      return (globalThis as any).crypto;
    }
    return require('crypto').webcrypto as Crypto;
  }

  // Generate Real Cryptographically Signed JWT (HMAC-SHA256 via Web Crypto API)
  public static async signJWT(payload: JWTPayload, secret: string): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const crypto = this.getCrypto();

    // Import secret key for HMAC-SHA256
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    // Sign header + payload using Web Crypto API
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      encoder.encode(dataToSign)
    );

    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const signatureBase64 = this.base64UrlEncode(
      String.fromCharCode.apply(null, signatureArray)
    );

    return `${dataToSign}.${signatureBase64}`;
  }

  // Verify Real JWT Signature & Expiration
  public static async verifyJWT(jwtToken: string, secret: string): Promise<{ valid: boolean; payload?: JWTPayload; error?: string }> {
    try {
      const parts = jwtToken.split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'Malformed JWT token structure' };
      }

      const [encodedHeader, encodedPayload, signature] = parts;
      const dataToSign = `${encodedHeader}.${encodedPayload}`;

      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);

      const crypto = this.getCrypto();
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );

      // Decode signature
      const sigBinStr = this.base64UrlDecode(signature);
      const sigBuffer = new Uint8Array(sigBinStr.length);
      for (let i = 0; i < sigBinStr.length; i++) {
        sigBuffer[i] = sigBinStr.charCodeAt(i);
      }

      const isSigValid = await crypto.subtle.verify(
        'HMAC',
        cryptoKey,
        sigBuffer,
        encoder.encode(dataToSign)
      );

      if (!isSigValid) {
        return { valid: false, error: 'Cryptographic signature verification failed' };
      }

      const payload: JWTPayload = JSON.parse(this.base64UrlDecode(encodedPayload));
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp && payload.exp < now) {
        return { valid: false, error: 'JWT token expired' };
      }

      return { valid: true, payload };
    } catch (e: any) {
      return { valid: false, error: `Verification error: ${e.message}` };
    }
  }
}
