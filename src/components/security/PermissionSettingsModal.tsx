/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import {
  permissionManager,
  PERMISSION_DEFINITIONS,
  PermissionType,
  PermissionState
} from '../../services/security/permissionManager';
import { projectManager } from '../../services/projects/projectManager';
import { ShieldCheck, ShieldAlert, Shield, Lock, Unlock, Check, X, AlertTriangle, Sparkles } from 'lucide-react';
import { soundSynth } from '../../services/audio/synth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PermissionSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { language, addLog } = useStudio();
  const activeProject = projectManager.getActiveProject();

  const [permissions, setPermissions] = useState<Record<PermissionType, PermissionState>>(() =>
    permissionManager.getPermissionsForProject(activeProject.id)
  );

  if (!isOpen) return null;

  const handleToggle = (permKey: PermissionType, newState: PermissionState) => {
    permissionManager.setPermission(activeProject.id, permKey, newState);
    setPermissions(permissionManager.getPermissionsForProject(activeProject.id));
    soundSynth.playCoin();
    addLog(`سطح دسترسی ${permKey} به حالت ${newState} تغییر یافت.`, 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-2xl bg-[#171922] border border-[#34394c] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 bg-[#13151c] border-b border-[#282d3e] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>مدیریت مجوزها و سطح دسترسی ایزوله (Sandbox Permissions)</span>
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                تنظیم مجوزها برای پروژه: <strong className="text-cyan-300">{activeProject.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#20232f] hover:bg-[#2a2f40] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>

        {/* Security Banner */}
        <div className="p-3 bg-indigo-950/30 border-b border-indigo-800/40 px-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-indigo-300">
            <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>محیط اجرای کدهای جاوااسکریپت، پایتون و لوا کاملاً ایزوله و محافظت‌شده است.</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-bold">
            Sandboxed
          </span>
        </div>

        {/* Permissions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {PERMISSION_DEFINITIONS.map(def => {
            const currentState = permissions[def.key] || 'granted';

            return (
              <div
                key={def.key}
                className="p-3.5 rounded-xl bg-[#12141c] border border-[#272b3b] flex items-center justify-between gap-3 transition-colors hover:border-[#383e54]"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      {language === 'fa' ? def.titleFa : def.titleEn}
                    </span>
                    <span className="text-[10px] px-2 py-0.2 rounded bg-[#202330] text-gray-400 font-mono">
                      {def.key}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    {language === 'fa' ? def.descFa : def.descEn}
                  </p>
                </div>

                {/* State Segmented Toggle Buttons */}
                <div className="flex items-center gap-1 bg-[#1a1d28] p-1 rounded-xl border border-[#2d3246] shrink-0">
                  <button
                    onClick={() => handleToggle(def.key, 'granted')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      currentState === 'granted'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    title="مجاز"
                  >
                    <Check className="w-3 h-3" />
                    <span>مجاز</span>
                  </button>

                  <button
                    onClick={() => handleToggle(def.key, 'prompt')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      currentState === 'prompt'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    title="پرسش"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>پرسش</span>
                  </button>

                  <button
                    onClick={() => handleToggle(def.key, 'denied')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      currentState === 'denied'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    title="ممنوع"
                  >
                    <X className="w-3 h-3" />
                    <span>مسدود</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#13151c] border-t border-[#282d3e] flex items-center justify-between px-4">
          <span className="text-[11px] text-gray-400">
            تغییرات به صورت خودکار در حافظه ذخیره می‌شوند.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer transition-all shadow-md shadow-cyan-600/20"
          >
            تایید و بستن
          </button>
        </div>
      </div>
    </div>
  );
};
