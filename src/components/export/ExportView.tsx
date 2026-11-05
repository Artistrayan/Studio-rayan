/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useStudio } from '../../context/StudioContext';
import { ProjectPackager } from '../../services/export/packager';
import { soundSynth } from '../../services/audio/synth';
import {
  Download,
  Globe,
  Smartphone,
  Apple,
  Monitor,
  Key,
  Copy,
  Check,
  PackageCheck,
  ShieldCheck,
  Cpu
} from 'lucide-react';

export const ExportView: React.FC = () => {
  const { files, addLog } = useStudio();
  const [projectName, setProjectName] = useState<string>('AetherForge_Game');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [apiKeys, setApiKeys] = useState<{ key: string; secret: string; jwt: string }>({
    key: 'af_live_loading...',
    secret: 'sec_loading...',
    jwt: 'jwt_loading...'
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    ProjectPackager.generateApiKey().then(setApiKeys);
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    soundSynth.playCoin();
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Export Single HTML5 File
  const handleExportSingleHTML = () => {
    soundSynth.playLaser();
    const html = ProjectPackager.generateSingleFileHTML(files, projectName);
    const blob = new Blob([html], { type: 'text/html' });
    ProjectPackager.downloadBlob(blob, `${projectName}.html`);
    soundSynth.playPowerup();
    addLog(`Exported standalone ${projectName}.html`, 'info');
  };

  // Export Web PWA Zip
  const handleExportWebZip = async () => {
    setIsExporting(true);
    soundSynth.playLaser();
    try {
      const blob = await ProjectPackager.generateWebZip(files, projectName);
      ProjectPackager.downloadBlob(blob, `${projectName}_Web_PWA.zip`);
      soundSynth.playPowerup();
      addLog(`Exported ${projectName}_Web_PWA.zip`, 'info');
    } catch (e: any) {
      addLog(`Export failed: ${e.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Export Android Capacitor Zip
  const handleExportAndroid = async () => {
    setIsExporting(true);
    soundSynth.playLaser();
    try {
      const blob = await ProjectPackager.generateAndroidZip(files, projectName);
      ProjectPackager.downloadBlob(blob, `${projectName}_Android_Capacitor.zip`);
      soundSynth.playPowerup();
      addLog(`Exported Android project package: ${projectName}_Android_Capacitor.zip`, 'info');
    } catch (e: any) {
      addLog(`Export failed: ${e.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Export iOS Xcode Zip
  const handleExportIOS = async () => {
    setIsExporting(true);
    soundSynth.playLaser();
    try {
      const blob = await ProjectPackager.generateIOSZip(files, projectName);
      ProjectPackager.downloadBlob(blob, `${projectName}_iOS_Xcode.zip`);
      soundSynth.playPowerup();
      addLog(`Exported iOS package: ${projectName}_iOS_Xcode.zip`, 'info');
    } catch (e: any) {
      addLog(`Export failed: ${e.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Export Desktop Electron Zip
  const handleExportDesktop = async () => {
    setIsExporting(true);
    soundSynth.playLaser();
    try {
      const blob = await ProjectPackager.generateElectronZip(files, projectName);
      ProjectPackager.downloadBlob(blob, `${projectName}_Desktop_Electron.zip`);
      soundSynth.playPowerup();
      addLog(`Exported Desktop Electron bundle: ${projectName}_Desktop_Electron.zip`, 'info');
    } catch (e: any) {
      addLog(`Export failed: ${e.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Re-generate API Keys & Signed JWT
  const handleRegenerateKeys = async () => {
    soundSynth.playCoin();
    const keys = await ProjectPackager.generateApiKey();
    setApiKeys(keys);
    addLog('Generated new cryptographically signed API key pair & HMAC-SHA256 JWT token.', 'info');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#14161b] relative overflow-y-auto h-full p-4 select-none">
      <div className="max-w-4xl mx-auto w-full space-y-6 text-xs">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-[#252834] gap-2">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-cyan-400" />
              <span>Build, Package & Export Suite</span>
            </h2>
            <p className="text-gray-400 text-xs">
              Generate native distributions for Web, Android, iOS, and Desktop with zero external build dependencies.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">Project:</span>
            <input
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              className="px-2.5 py-1 bg-[#101217] border border-[#2c3142] rounded text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Target Platforms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Web Standalone HTML5 */}
          <div className="bg-[#181a24] p-4 rounded-xl border border-[#2b2f40] flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center gap-2.5 text-cyan-400 font-semibold text-sm mb-2">
                <Globe className="w-5 h-5" />
                <span>Standalone Single-File Web HTML5</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed mb-4">
                Packages the entire game canvas, logic, and audio into an offline executable single HTML file. Can be run locally by double-clicking without a web server.
              </p>
            </div>
            <button
              onClick={handleExportSingleHTML}
              className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-cyan-600/20"
            >
              <Download className="w-4 h-4" />
              <span>Download Standalone .HTML</span>
            </button>
          </div>

          {/* Web PWA Bundle */}
          <div className="bg-[#181a24] p-4 rounded-xl border border-[#2b2f40] flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center gap-2.5 text-emerald-400 font-semibold text-sm mb-2">
                <Globe className="w-5 h-5" />
                <span>Progressive Web App (PWA) Zip</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed mb-4">
                Complete PWA package with Service Worker (`sw.js`), Web App Manifest (`manifest.json`), installable on mobile and desktop devices.
              </p>
            </div>
            <button
              onClick={handleExportWebZip}
              disabled={isExporting}
              className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <Download className="w-4 h-4" />
              <span>Download PWA .ZIP Bundle</span>
            </button>
          </div>

          {/* Android APK Package */}
          <div className="bg-[#181a24] p-4 rounded-xl border border-[#2b2f40] flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center gap-2.5 text-lime-400 font-semibold text-sm mb-2">
                <Smartphone className="w-5 h-5" />
                <span>Android APK Capacitor Project</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed mb-4">
                Native Android project skeleton with `AndroidManifest.xml`, `capacitor.config.json`, and bundled game assets ready for Android Studio or Gradle build.
              </p>
            </div>
            <button
              onClick={handleExportAndroid}
              disabled={isExporting}
              className="w-full py-2 rounded-lg bg-lime-600 hover:bg-lime-500 text-white font-medium flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-lime-600/20"
            >
              <Download className="w-4 h-4" />
              <span>Download Android Package</span>
            </button>
          </div>

          {/* Desktop Electron Bundle */}
          <div className="bg-[#181a24] p-4 rounded-xl border border-[#2b2f40] flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center gap-2.5 text-indigo-400 font-semibold text-sm mb-2">
                <Monitor className="w-5 h-5" />
                <span>Desktop (Windows / Mac / Linux) Electron</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed mb-4">
                Cross-platform desktop application project with `main.js`, `package.json`, and window configuration ready for `npm start` or Electron packager.
              </p>
            </div>
            <button
              onClick={handleExportDesktop}
              disabled={isExporting}
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
            >
              <Download className="w-4 h-4" />
              <span>Download Electron Desktop App</span>
            </button>
          </div>
        </div>

        {/* API Key & Security Credentials Generator */}
        <div className="bg-[#181a24] p-4 rounded-xl border border-[#2b2f40] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <Key className="w-4 h-4" />
              <span>Project API Keys & Secrets Manager</span>
            </div>
            <button
              onClick={handleRegenerateKeys}
              className="px-2.5 py-1 rounded bg-[#252834] hover:bg-[#303546] text-gray-300 cursor-pointer"
            >
              Regenerate Keys
            </button>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {/* Live Key */}
            <div className="flex flex-col gap-1">
              <span className="text-gray-400 text-[11px]">CLIENT API KEY (PUBLIC)</span>
              <div className="flex items-center gap-2 bg-[#101217] p-2 rounded border border-[#262a38]">
                <span className="flex-1 text-cyan-400 truncate">{apiKeys.key}</span>
                <button
                  onClick={() => copyToClipboard(apiKeys.key, 'key')}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  {copiedKey === 'key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Secret */}
            <div className="flex flex-col gap-1">
              <span className="text-gray-400 text-[11px]">HMAC SECRET (PRIVATE)</span>
              <div className="flex items-center gap-2 bg-[#101217] p-2 rounded border border-[#262a38]">
                <span className="flex-1 text-amber-400 truncate">{apiKeys.secret}</span>
                <button
                  onClick={() => copyToClipboard(apiKeys.secret, 'secret')}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  {copiedKey === 'secret' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
