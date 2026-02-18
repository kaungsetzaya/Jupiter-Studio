
import React, { useState } from 'react';
import { Language } from '../types';
import { UI_STRINGS } from '../constants/translations';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadSectionProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  statusMessage?: string;
  language: Language;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onFileSelect, isProcessing, statusMessage, language }) => {
  const [dragActive, setDragActive] = useState(false);
  const t = UI_STRINGS[language];

  return (
    <div className="w-full max-w-[1400px] mx-auto mt-2 md:mt-6 px-2 md:px-6">
      <div 
        className={`relative border-2 border-dashed rounded-[2rem] p-6 md:p-12 transition-all duration-300 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 group cursor-pointer
          ${dragActive 
            ? 'border-brand-500 bg-brand-500/5 shadow-2xl scale-[1.01]' 
            : 'border-slate-300 dark:border-white/10 bg-white dark:bg-dark-900/60 hover:border-brand-500/50 hover:bg-white/80 dark:hover:bg-dark-800 shadow-lg'}
        `}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); if(e.dataTransfer.files[0]) onFileSelect(e.dataTransfer.files[0]); }}
      >
        <input 
          type="file" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
          accept="video/*,audio/*"
          onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
          disabled={isProcessing}
        />
        
        <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center text-white shadow-lg relative shrink-0 group-hover:scale-110 transition-transform duration-300">
           {isProcessing && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="absolute inset-0 border-4 border-white/30 border-t-white rounded-full" />}
           {!isProcessing && (
             <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
             </svg>
           )}
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col justify-center text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-3 md:gap-4">
             <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white italic tracking-tight break-words max-w-full">
                {isProcessing ? t.common.analyzing : t.common.uploadTitle}
             </h3>
             
             {!isProcessing && (
               <>
                 <div className="hidden md:block w-1 h-1 rounded-full bg-slate-300 dark:bg-gray-600 mt-3"></div>
                 <p className="text-[10px] md:text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest break-words max-w-full italic">
                    {t.common.uploadDesc}
                 </p>
               </>
             )}
          </div>
          
          <AnimatePresence>
            {isProcessing && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 flex items-center gap-3">
                   <div className="h-2 w-48 bg-slate-200 dark:bg-dark-950 rounded-full overflow-hidden shadow-inner">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="h-full bg-gradient-to-r from-brand-400 to-brand-600 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                     />
                   </div>
                   <p className="text-[10px] text-brand-600 dark:text-brand-500 font-bold uppercase tracking-widest whitespace-nowrap">{statusMessage || "Processing..."}</p>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default UploadSection;
