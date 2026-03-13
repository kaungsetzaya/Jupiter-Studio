
import React, { useState } from 'react';
import { SubtitleSegment, Language } from '../types';
import { UI_STRINGS } from '../constants/translations';
import { motion } from 'framer-motion';

interface EditorSectionProps {
  segments: SubtitleSegment[];
  setSegments: React.Dispatch<React.SetStateAction<SubtitleSegment[]>>;
  onNext: () => void;
  language: Language;
}

const EditorSection: React.FC<EditorSectionProps> = ({ segments, setSegments, onNext, language }) => {
  const t = UI_STRINGS[language];
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyAll = () => {
    const allText = segments.map(s => s.translatedText).join('\n');
    navigator.clipboard.writeText(allText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6 md:space-y-10 px-2 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/5 p-6 md:p-10 rounded-[2.5rem] sticky top-20 z-30 shadow-2xl backdrop-blur-3xl transition-all gap-6">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white italic tracking-tight">{language === Language.MM ? "စာတန်းထိုး ပြင်ဆင်ရန်" : "Timeline Editor"}</h2>
          <p className="text-[12px] text-slate-400 dark:text-gray-500 font-black uppercase tracking-[0.15em]">{language === Language.MM ? "စာသားများကို လိုအပ်သလို ပြင်ဆင်နိုင်ပါသည်" : "Fine-tune your localization"}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyAll}
            className="px-6 py-4 bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white text-[12px] font-black uppercase rounded-2xl transition-all flex items-center gap-2 tracking-wider shadow-sm"
          >
             {isCopied ? (
                <>
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  {language === Language.MM ? "ကူးယူပြီး" : "Copied"}
                </>
             ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                  {language === Language.MM ? "အားလုံးကူးယူ" : "Copy All"}
                </>
             )}
          </button>

          <button 
            onClick={onNext} 
            className="px-10 py-4 bg-brand-500 hover:bg-brand-400 text-white text-[13px] font-black uppercase rounded-2xl shadow-xl shadow-brand-500/20 transition-all flex items-center gap-3 italic tracking-widest"
          >
            {t.common.dubNow}
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {segments.map((seg, idx) => (
          <motion.div 
            key={seg.id} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex flex-col lg:flex-row gap-6 lg:gap-12 bg-white dark:bg-dark-900/60 border border-slate-200 dark:border-white/5 p-6 md:p-12 rounded-[2.5rem] lg:rounded-[3.5rem] items-start hover:border-brand-500/30 transition-all group shadow-xl shadow-black/5"
          >
            <div className="flex flex-row lg:flex-col items-center lg:items-start gap-4 shrink-0 w-full lg:w-32 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-white/5 pb-4 lg:pb-0 lg:pr-8">
               <div className="w-24 bg-brand-500/10 border border-brand-500/20 px-4 py-3 rounded-xl text-brand-600 dark:text-brand-400 text-[14px] font-black font-mono text-center shadow-inner">
                 {seg.startTime.toFixed(2)}s
               </div>
               <p className="text-[10px] text-slate-400 dark:text-gray-600 font-black uppercase tracking-widest">{language === Language.MM ? "စတင်ချိန်" : "Start"}</p>
            </div>

            <div className="flex-1 space-y-6 md:space-y-10 w-full lg:pl-4">
              <div className="space-y-3">
                <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-gray-500 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-gray-700"></div>
                   {language === Language.MM ? "မူရင်းစာသား" : "Source Audio"}
                </span>
                <p className="text-base md:text-lg font-medium text-slate-600 dark:text-gray-400 italic bg-slate-50 dark:bg-white/5 p-5 md:p-8 rounded-2xl border border-slate-200 dark:border-white/5">{seg.originalText}</p>
              </div>

              <div className="space-y-3">
                <span className="text-[11px] font-black uppercase tracking-[0.15em] text-brand-600 dark:text-brand-400 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
                   {language === Language.MM ? "ဘာသာပြန်စာသား" : "Localization"}
                </span>
                <textarea 
                  value={seg.translatedText}
                  onChange={(e) => setSegments(prev => prev.map(s => s.id === seg.id ? { ...s, translatedText: e.target.value } : s))}
                  className="w-full bg-slate-50 dark:bg-dark-950/50 border border-slate-200 dark:border-white/10 text-base md:text-xl font-myanmar text-slate-900 dark:text-white rounded-2xl p-6 md:p-8 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none leading-relaxed shadow-inner"
                  rows={2}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default EditorSection;
