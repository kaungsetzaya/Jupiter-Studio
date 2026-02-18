
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
    <div className="w-full max-w-4xl mx-auto mt-4 px-4">
      <div 
        className={`relative border-2 border-dashed rounded-[2rem] p-8 transition-all duration-300 flex flex-row items-center justify-center gap-6 group cursor-pointer
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
        
        <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
          <div className="flex flex-row items-center gap-4 flex-wrap">
             <h3 className="text-lg font-black text-slate-900 dark:text-white italic tracking-tight whitespace-nowrap">
                {isProcessing ? t.common.analyzing : t.common.uploadTitle}
             </h3>
             
             {!isProcessing && (
               <>
                 <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300 dark:bg-gray-600"></div>
                 <p className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest truncate">
                    {t.common.uploadDesc}
                 </p>
               </>
             )}
          </div>
          
          <AnimatePresence>
            {isProcessing && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 flex items-center gap-3">
                   <div className="h-1.5 w-32 bg-slate-100 dark:bg-dark-950 rounded-full overflow-hidden">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 15, repeat: Infinity }}
                        className="h-full bg-brand-500" 
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
