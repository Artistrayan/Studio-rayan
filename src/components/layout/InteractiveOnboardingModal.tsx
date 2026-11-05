/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, Check, X, Compass } from 'lucide-react';
import { ONBOARDING_TOUR_STEPS } from '../../services/engine/tourGuide';
import { useStudio } from '../../context/StudioContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const InteractiveOnboardingModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { setWorkspace, language } = useStudio();
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  if (!isOpen) return null;

  const step = ONBOARDING_TOUR_STEPS[currentStepIndex];
  const total = ONBOARDING_TOUR_STEPS.length;
  const isPersian = language === 'fa';

  const handleNext = () => {
    if (currentStepIndex < total - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      setWorkspace(ONBOARDING_TOUR_STEPS[nextIndex].targetWorkspace as any);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      setWorkspace(ONBOARDING_TOUR_STEPS[prevIndex].targetWorkspace as any);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#181a24] border border-[#2b2f40] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-xs text-gray-200">
        {/* Top Progress */}
        <div className="h-1 bg-[#101217] w-full">
          <div
            className="h-full bg-cyan-500 transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / total) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 font-semibold text-[11px] border border-cyan-500/20">
              {step.badge} ({currentStepIndex + 1} / {total})
            </span>
            <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-cyan-400" />
              <span>{isPersian ? step.titleFa : step.title}</span>
            </h3>
            <p className="text-gray-300 text-xs leading-relaxed">
              {isPersian ? step.descriptionFa : step.description}
            </p>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#252834]">
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
                currentStepIndex === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-[#252834] cursor-pointer'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              onClick={handleNext}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-600/20"
            >
              <span>{currentStepIndex === total - 1 ? 'Finish Tour' : 'Next Step'}</span>
              {currentStepIndex === total - 1 ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
