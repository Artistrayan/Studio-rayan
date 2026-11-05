/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Download, Check, Sparkles } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);

  useEffect(() => {
    // Detect standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  // If already running as an installed PWA, show compact installed badge
  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
        <Check className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">نصب شده (PWA)</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (deferredPrompt) {
    return (
      <button
        onClick={handleInstall}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all animate-pulse"
        title="نصب مستقیم برنامه روی دستگاه (Progressive Web App)"
      >
        <Download className="w-3.5 h-3.5" />
        <span>نصب PWA</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1 px-2 py-1 rounded bg-[#23262e] hover:bg-[#2b2f3a] text-cyan-400 text-xs border border-cyan-500/30 cursor-pointer"
          title="نصب در آیفون / آیپد"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">نصب روی iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#181a24] p-5 border border-[#343a4e] shadow-2xl text-right">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>نصب AetherForge روی آیفون / آیپد</span>
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed space-y-2 mt-3">
                ۱. روی دکمه <strong className="text-cyan-400">Share</strong> (اشتراک‌گذاری در نوار پایین مرورگر سافاری) بزنید.<br />
                ۲. به پایین اسکرول کنید و گزینه <strong className="text-amber-400">Add to Home Screen</strong> (افزودن به صفحه اصلی) را انتخاب کنید.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-cyan-600 hover:bg-cyan-500 py-2 text-xs font-bold text-white cursor-pointer"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <button
      onClick={() => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js').catch(() => {});
        }
      }}
      className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#232630] hover:bg-[#2c303e] border border-[#34394a] text-xs text-cyan-400 font-medium cursor-pointer"
      title="وب‌اپلیکیشن مستقل (PWA Offline Ready)"
    >
      <Download className="w-3.5 h-3.5" />
      <span>PWA آماده</span>
    </button>
  );
};
