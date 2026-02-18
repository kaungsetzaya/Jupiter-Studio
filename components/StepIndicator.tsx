
import React from 'react';
import { AppStep, Language } from '../types';
import { UI_STRINGS } from '../constants/translations';
import { motion } from 'framer-motion';

interface StepIndicatorProps {
  currentStep: AppStep;
  language: Language;
}

const steps = [
  { id: AppStep.UPLOAD },
  { id: AppStep.EDITOR },
  { id: AppStep.VOICE_CONFIG },
  { id: AppStep.RESULT },
];

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, language }) => {
  const t = UI_STRINGS[language];
  
  const getStepIndex = (step: AppStep) => {
    if (step === AppStep.ANALYZING) return 0;
    if (step === AppStep.GENERATING) return 2;
    return steps.findIndex(s => s.id === step);
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="w-full max-w-4xl mx-auto mb-8 md:mb-16">
      <div className="relative flex justify-between items-center px-2 md:px-4">
        {/* Progress Track */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-0.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden mx-8 md:mx-12">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
            className="h-full bg-brand-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
          />
        </div>

        {steps.map((step, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2 md:gap-4">
              <motion.div 
                animate={{ 
                  scale: isCurrent ? 1.3 : 1,
                  backgroundColor: isActive ? '#f97316' : '#1a1a2e',
                  borderColor: isActive ? '#f97316' : 'rgba(255,255,255,0.05)'
                }}
                className={`w-3 h-3 md:w-4 md:h-4 rounded-full border-2 shadow-lg transition-all duration-500`}
              />
              <span className={`hidden sm:block text-[9px] md:text-[12px] font-black uppercase tracking-[0.15em] text-center whitespace-nowrap transition-all ${isActive ? 'text-slate-900 dark:text-white' : 'text-gray-600'}`}>
                {t.steps[step.id as AppStep]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;
