/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { VFSFile } from '../../types';

export class ProjectPackager {
  // Generate standalone Single-File HTML5 game that runs offline anywhere
  public static generateSingleFileHTML(files: VFSFile[], projectName: string = 'AetherForge_Game'): string {
    const mainJs = files.find(f => f.name.endsWith('.js') || f.name.endsWith('.ts'))?.content || '';
    const styleCss = files.find(f => f.name.endsWith('.css'))?.content || '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${projectName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #0f172a; font-family: sans-serif; display: flex; align-items: center; justify-content: center; }
    #canvas-container { position: relative; width: 100%; max-width: 800px; aspect-ratio: 16/9; box-shadow: 0 20px 40px rgba(0,0,0,0.6); border-radius: 8px; overflow: hidden; }
    canvas { width: 100%; height: 100%; display: block; background: #0b0f19; }
    ${styleCss}
  </style>
</head>
<body>
  <div id="canvas-container">
    <canvas id="game-canvas" width="800" height="450"></canvas>
  </div>
  <script>
    (function() {
      ${mainJs}
    })();
  </script>
</body>
</html>`;
  }

  // Generate Web ZIP bundle with PWA Service Worker & Manifest
  public static async generateWebZip(files: VFSFile[], projectName: string): Promise<Blob> {
    const zip = new JSZip();
    const htmlContent = this.generateSingleFileHTML(files, projectName);

    zip.file('index.html', htmlContent);

    // Manifest
    const manifest = {
      name: projectName,
      short_name: projectName,
      start_url: './index.html',
      display: 'standalone',
      background_color: '#0f172a',
      theme_color: '#38bdf8',
      icons: [
        {
          src: 'icon-192.png',
          sizes: '192x192',
          type: 'image/png'
        }
      ]
    };
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    // Service Worker for full offline capabilities
    const swContent = `
const CACHE_NAME = '${projectName}-v1';
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
`;
    zip.file('sw.js', swContent);

    // Include source code folder
    const srcFolder = zip.folder('src');
    if (srcFolder) {
      files.forEach(f => srcFolder.file(f.name, f.content));
    }

    return await zip.generateAsync({ type: 'blob' });
  }

  // Generate Android APK Capacitor Project Zip
  public static async generateAndroidZip(files: VFSFile[], projectName: string): Promise<Blob> {
    const zip = new JSZip();
    const pkgName = 'com.aetherforge.' + projectName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // capacitor.config.json
    const capConfig = {
      appId: pkgName,
      appName: projectName,
      webDir: 'www',
      bundledWebRuntime: false
    };
    zip.file('capacitor.config.json', JSON.stringify(capConfig, null, 2));

    // AndroidManifest.xml
    const androidManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${pkgName}">
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="${projectName}"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">
        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="${projectName}"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;
    zip.file('android/app/src/main/AndroidManifest.xml', androidManifest);

    // WWW folder
    const wwwFolder = zip.folder('www');
    if (wwwFolder) {
      wwwFolder.file('index.html', this.generateSingleFileHTML(files, projectName));
    }

    return await zip.generateAsync({ type: 'blob' });
  }

  // Generate iOS Xcode Capacitor Project Zip
  public static async generateIOSZip(files: VFSFile[], projectName: string): Promise<Blob> {
    const zip = new JSZip();
    const pkgName = 'com.aetherforge.' + projectName.toLowerCase().replace(/[^a-z0-9]/g, '');

    const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>${projectName}</string>
    <key>CFBundleIdentifier</key>
    <string>${pkgName}</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>UIRequiresFullScreen</key>
    <true/>
</dict>
</plist>`;
    zip.file('ios/App/App/Info.plist', infoPlist);

    const wwwFolder = zip.folder('www');
    if (wwwFolder) {
      wwwFolder.file('index.html', this.generateSingleFileHTML(files, projectName));
    }

    return await zip.generateAsync({ type: 'blob' });
  }

  // Generate Desktop Electron Bundle Zip
  public static async generateElectronZip(files: VFSFile[], projectName: string): Promise<Blob> {
    const zip = new JSZip();

    const packageJson = {
      name: projectName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      version: '1.0.0',
      main: 'main.js',
      scripts: {
        start: 'electron .'
      },
      devDependencies: {
        electron: '^30.0.0'
      }
    };
    zip.file('package.json', JSON.stringify(packageJson, null, 2));

    const mainJs = `const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
`;
    zip.file('main.js', mainJs);
    zip.file('index.html', this.generateSingleFileHTML(files, projectName));

    return await zip.generateAsync({ type: 'blob' });
  }

  // Generate lightweight Rust-based Tauri Desktop package (.tar.gz / .zip)
  public static async generateTauriZip(files: VFSFile[], projectName: string): Promise<Blob> {
    const zip = new JSZip();
    const pkgName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const tauriConf = {
      build: {
        beforeDevCommand: '',
        beforeBuildCommand: '',
        devPath: '../dist',
        distDir: '../dist'
      },
      package: {
        productName: projectName,
        version: '1.0.0'
      },
      tauri: {
        bundle: {
          active: true,
          targets: 'all',
          identifier: `com.aetherforge.${pkgName}`,
          icon: ['icons/32x32.png', 'icons/128x128.png']
        },
        windows: [
          {
            title: projectName,
            width: 1200,
            height: 800,
            resizable: true,
            fullscreen: false
          }
        ]
      }
    };
    zip.file('src-tauri/tauri.conf.json', JSON.stringify(tauriConf, null, 2));

    const cargoToml = `[package]
name = "${pkgName}"
version = "1.0.0"
description = "AetherForge Standalone Desktop App"
authors = ["AetherForge Studio"]
edition = "2021"

[build-dependencies]
tauri-build = { version = "1.5", features = [] }

[dependencies]
tauri = { version = "1.5", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
`;
    zip.file('src-tauri/Cargo.toml', cargoToml);

    const mainRs = `// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
`;
    zip.file('src-tauri/src/main.rs', mainRs);
    zip.file('dist/index.html', this.generateSingleFileHTML(files, projectName));

    return await zip.generateAsync({ type: 'blob' });
  }

  // Generate API Keys and Secrets
  public static generateApiKey(scope: string = 'read_write'): { key: string; secret: string; jwt: string } {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'af_live_';
    for (let i = 0; i < 28; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));

    let secret = 'sec_';
    for (let i = 0; i < 40; i++) secret += chars.charAt(Math.floor(Math.random() * chars.length));

    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      iss: 'aetherforge.studio',
      sub: key,
      scope,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (3600 * 24 * 365)
    }));
    const signature = btoa('verified_signature_' + Math.random().toString(36).substring(2, 10));
    const jwt = `${header}.${payload}.${signature}`;

    return { key, secret, jwt };
  }

  // Trigger browser file download directly
  public static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
