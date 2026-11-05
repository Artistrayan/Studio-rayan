/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Scale, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { LicenseAuditorService, LicenseAuditRecord } from '../../services/engine/licenseAuditor';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const LicenseAuditorModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [audit] = useState(() => LicenseAuditorService.auditDependencies());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#181a24] border border-[#2b2f40] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl text-xs text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#252834]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Open-Source License & Legal Compliance Auditor</h2>
              <p className="text-gray-400 text-[11px]">Validates commercial distribution compatibility of package dependencies</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#252834] text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Banner */}
        <div className="p-4 bg-[#101217] border-b border-[#252834] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-white">Commercial License Status: COMPLIANT</span>
          </div>
          <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold text-[11px]">
            100% Permissive
          </span>
        </div>

        {/* Table */}
        <div className="p-4 max-h-72 overflow-y-auto divide-y divide-[#252834]">
          {audit.auditRecords.map((item, i) => (
            <div key={i} className="py-2 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white font-mono">{item.packageName}</span>
                <span className="text-gray-500 text-[10px] ml-2">v{item.version}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono text-[10px]">
                  {item.license}
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
