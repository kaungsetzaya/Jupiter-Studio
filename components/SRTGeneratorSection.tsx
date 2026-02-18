
import React, { useState, useRef } from 'react';
import { transcribeToSRT, fileToGenerativePart, TranscribeResult } from '../services/geminiService';
import { parseSRT } from '../utils/srtParser';
import { ParsedSubtitle, Language } from '../types';
import { UI_STRINGS } from '../constants/translations';
import { motion, AnimatePresence } from 'framer-motion';

const SRTGeneratorSection: React.FC<{ language: Language }> = ({ language }) => {
  const t = UI_STRINGS[language];
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribeResult, setTranscribeResult] = useState<TranscribeResult | null>(null);
  const [mergedSegments, setMergedSegments] = useState<ParsedSubtitle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState('');
  const [selectedRatio, setSelectedRatio] = useState<'16:9' | '9:16'>('16:9');
  
  // Transcription Settings
  const [sourceLang, setSourceLang] = useState<'Auto' | 'English' | 'Myanmar'>('Auto');
  const [translateEnabled, setTranslateEnabled] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setTranscribeResult(null);
    setMergedSegments([]);
    setIsProcessing(true);
    setStatus(language === Language.MM ? 'စကားပြောများကို နားထောင်နေသည်...' : 'Listening to Dialogue...');

    try {
      setStatus(language === Language.MM ? 'စာသားများကို ဖမ်းယူနေသည်...' : 'Capturing Word Patterns...');
      const generativePart = await fileToGenerativePart(selectedFile);
      const mimeType = selectedFile.type || generativePart.mimeType || 'video/mp4';
      
      let targetLang = null;
      if (translateEnabled) {
         if (sourceLang === 'English') targetLang = 'Myanmar';
         else if (sourceLang === 'Myanmar') targetLang = 'English';
         else targetLang = 'Myanmar'; // Default target if Auto
      }

      setStatus(language === Language.MM ? `${selectedRatio} ပုံစံဖြင့် စာသားရေးသားနေသည်...` : `Precision Writing for ${selectedRatio} Format...`);
      const result = await transcribeToSRT(generativePart.data, mimeType, selectedRatio, sourceLang, targetLang);
      
      setTranscribeResult(result);
      
      // Parse Original and Translated and Merge them for UI display
      const originalParsed = parseSRT(result.original);
      let merged = [...originalParsed];
      
      if (result.translated) {
        const translatedParsed = parseSRT(result.translated);
        // Zip them together
        merged = originalParsed.map((seg, idx) => ({
          ...seg,
          translatedText: translatedParsed[idx]?.text || ''
        }));
      }
      
      setMergedSegments(merged);
      setStatus('');
    } catch (err: any) {
      setError(err.message || "Failed to generate script.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadSRT = (content: string, isTranslated = false) => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const suffix = isTranslated ? '_Translated' : '_Original';
    a.href = url;
    a.download = file ? `${file.name.split('.')[0]}${suffix}.srt` : `transcript${suffix}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pb-20">
      <AnimatePresence mode="wait">
        {!transcribeResult && !isProcessing ? (
          <motion.div 
            key="upload-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Step-by-Step Settings Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
               
               {/* 1. Layout Ratio */}
               <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 p-6 rounded-[2.5rem] shadow-xl backdrop-blur-md transition-colors">
                  <div className="flex items-center gap-3 mb-6">
                     <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-black text-sm">1</div>
                     <h3 className="text-[13px] font-black uppercase text-slate-800 dark:text-gray-300 tracking-widest">{t.srtGen.formatSetting}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <button 
                       onClick={() => setSelectedRatio('16:9')}
                       className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${selectedRatio === '16:9' ? 'bg-brand-500 border-brand-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-dark-950 border-transparent text-slate-500 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white'}`}
                     >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect width="20" height="12" x="2" y="6" rx="2" strokeWidth={2.5} /></svg>
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">{t.srtGen.landscape}</span>
                     </button>
                     <button 
                       onClick={() => setSelectedRatio('9:16')}
                       className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${selectedRatio === '9:16' ? 'bg-brand-500 border-brand-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-dark-950 border-transparent text-slate-500 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white'}`}
                     >
                        <svg className="w-6 h-6 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect width="20" height="12" x="2" y="6" rx="2" strokeWidth={2.5} /></svg>
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">{t.srtGen.portrait}</span>
                     </button>
                  </div>
               </div>

               {/* 2. Spoken Language */}
               <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 p-6 rounded-[2.5rem] shadow-xl backdrop-blur-md transition-colors">
                  <div className="flex items-center gap-3 mb-6">
                     <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-black text-sm">2</div>
                     <h3 className="text-[13px] font-black uppercase text-slate-800 dark:text-gray-300 tracking-widest">{t.srtGen.spokenLang}</h3>
                  </div>
                  <div className="flex flex-col gap-2">
                     {['Auto', 'English', 'Myanmar'].map((lang) => (
                        <button 
                          key={lang}
                          onClick={() => setSourceLang(lang as any)}
                          className={`w-full py-3 text-[12px] font-black uppercase rounded-2xl transition-all border ${sourceLang === lang ? 'bg-brand-500 border-brand-500 text-white shadow-md' : 'bg-slate-50 dark:bg-dark-950 border-transparent text-slate-500 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                           {lang === 'Auto' ? t.srtGen.autoDetect : lang === 'Myanmar' ? t.srtGen.myanmar : t.srtGen.english}
                        </button>
                     ))}
                  </div>
               </div>

               {/* 3. Translation Toggle */}
               <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 p-6 rounded-[2.5rem] shadow-xl backdrop-blur-md transition-colors">
                  <div className="flex items-center gap-3 mb-6">
                     <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-black text-sm">3</div>
                     <h3 className="text-[13px] font-black uppercase text-slate-800 dark:text-gray-300 tracking-widest">{t.srtGen.translateToggle}</h3>
                  </div>
                  <div className="flex flex-col gap-3">
                     <button 
                        onClick={() => setTranslateEnabled(false)}
                        className={`w-full py-4 rounded-2xl border transition-all flex items-center justify-center gap-3 ${!translateEnabled ? 'bg-brand-500 border-brand-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-dark-950 border-transparent text-slate-500 dark:text-gray-500'}`}
                     >
                        <span className="text-[11px] font-black uppercase tracking-tight whitespace-nowrap">{t.srtGen.transOnly}</span>
                     </button>
                     <button 
                        onClick={() => setTranslateEnabled(true)}
                        className={`w-full py-4 rounded-2xl border transition-all flex items-center justify-center gap-3 ${translateEnabled ? 'bg-brand-500 border-brand-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-dark-950 border-transparent text-slate-500 dark:text-gray-500'}`}
                     >
                        <span className="text-[11px] font-black uppercase tracking-tight whitespace-nowrap">{t.srtGen.transAndTranslate}</span>
                     </button>
                  </div>
               </div>
            </div>

            <motion.div 
              className={`relative border-2 border-dashed rounded-[2rem] p-8 transition-all duration-300 flex flex-row items-center justify-center gap-6 group cursor-pointer
                ${dragActive ? 'border-brand-500 bg-brand-500/5 scale-[1.01]' : 'border-slate-300 dark:border-white/10 bg-white dark:bg-dark-900/40 hover:border-brand-500/50 shadow-sm'}
              `}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
            >
              <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-xl relative shrink-0 group-hover:scale-110 transition-transform">
                 <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                 </svg>
              </div>
              <div className="flex-1 flex items-center gap-4 flex-wrap">
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight whitespace-nowrap">{t.srtGen.uploadTitle}</h3>
                <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300 dark:bg-gray-600"></div>
                <p className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">{t.srtGen.uploadDesc}</p>
              </div>
              <input type="file" ref={fileInputRef} className="absolute inset-0 opacity-0 cursor-pointer z-50" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} accept="video/*,audio/*" />
            </motion.div>
          </motion.div>
        ) : isProcessing ? (
          <motion.div 
            key="loading-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[500px] gap-10"
          >
             <div className="relative">
                <div className="w-28 h-28 border-4 border-brand-500/20 rounded-full" />
                <div className="w-28 h-28 border-4 border-brand-500 border-t-transparent rounded-full animate-spin absolute inset-0 shadow-[0_0_25px_rgba(249,115,22,0.4)]" />
             </div>
             <div className="text-center">
                <motion.h3 animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-5xl font-black text-slate-900 dark:text-white mb-3 italic tracking-tighter uppercase">{status}</motion.h3>
             </div>
          </motion.div>
        ) : (
          <motion.div 
            key="results-container"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left side: Segment Cards (Extra Bold Side-by-Side Text) */}
            <div className="lg:col-span-7 space-y-6 max-h-[850px] overflow-y-auto pr-6 custom-scrollbar">
               {mergedSegments.map((seg, idx) => (
                 <motion.div 
                   key={idx}
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: idx * 0.05 }}
                   className="bg-white dark:bg-dark-900/60 border border-slate-200 dark:border-white/10 rounded-[3rem] p-10 flex flex-col gap-8 hover:border-brand-500/30 transition-all group shadow-xl backdrop-blur-xl"
                 >
                    <div className="flex justify-between items-center">
                       <div className="flex gap-3">
                          <span className="text-[13px] font-black text-brand-600 dark:text-brand-400 font-mono tracking-tighter bg-brand-500/10 px-5 py-2.5 rounded-xl border border-brand-500/10">
                            {seg.start.toFixed(2)}s
                          </span>
                          <span className="text-[13px] font-black text-slate-500 dark:text-gray-500 font-mono tracking-tighter bg-slate-100 dark:bg-dark-950 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                            {seg.end.toFixed(2)}s
                          </span>
                       </div>
                       <div className="text-[11px] font-black text-slate-300 dark:text-gray-700 uppercase tracking-widest italic">CHUNKS #{seg.id}</div>
                    </div>

                    <div className="grid grid-cols-1 gap-10">
                       {/* Original Text */}
                       <div className="space-y-4">
                          <div className="flex items-center gap-2.5">
                             <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                             <span className="text-[12px] font-black uppercase tracking-[0.15em] text-slate-400">{t.srtGen.originalText}</span>
                          </div>
                          <p className="text-[16px] font-medium text-slate-600 dark:text-gray-400 italic selection:bg-brand-500/20 leading-relaxed">
                            {seg.text}
                          </p>
                       </div>

                       {/* Translated Text - EXTRA BOLD (font-black) */}
                       {seg.translatedText && (
                         <div className="space-y-4 pt-8 border-t border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-2.5">
                               <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                               <span className="text-[12px] font-black uppercase tracking-[0.15em] text-brand-500">{t.srtGen.translatedText}</span>
                            </div>
                            <p className="text-3xl font-black text-slate-900 dark:text-gray-100 leading-relaxed font-myanmar selection:bg-brand-500/30">
                              {seg.translatedText}
                            </p>
                         </div>
                       )}
                    </div>
                 </motion.div>
               ))}
            </div>

            {/* Right side: Studio Export & Metadata */}
            <div className="lg:col-span-5 space-y-8">
              <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden backdrop-blur-2xl transition-colors">
                <div className="absolute top-0 right-0 w-40 h-40 bg-brand-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                
                <h3 className="text-4xl font-black text-slate-900 dark:text-white mb-12 italic tracking-tight transition-colors">{language === Language.MM ? "စတူဒီယို ထုတ်ယူမှု" : "Studio Export"}</h3>
                
                <div className="space-y-6 mb-12">
                   <div className="bg-slate-50 dark:bg-dark-950/50 p-10 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-inner transition-colors">
                      <div className="flex justify-between items-center mb-6">
                         <span className="text-[12px] font-black uppercase tracking-widest text-slate-500 dark:text-gray-500">{t.srtGen.sourceMedia}</span>
                         <span className="text-base font-black text-slate-900 dark:text-white truncate max-w-[200px]">{file?.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-[12px] font-black uppercase tracking-widest text-slate-500 dark:text-gray-500">{t.srtGen.segments}</span>
                         <span className="text-base font-black text-brand-600 dark:text-brand-400 bg-brand-500/10 px-5 py-2 rounded-xl">{mergedSegments.length} Chunks</span>
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   {/* Main SRT Download */}
                   <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => transcribeResult && downloadSRT(transcribeResult.original, false)}
                    className="w-full py-7 bg-brand-500 hover:bg-brand-400 text-white rounded-[2rem] font-black text-[15px] shadow-xl shadow-brand-500/20 transition-all flex items-center justify-center gap-4 italic uppercase tracking-widest"
                   >
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {translateEnabled ? t.srtGen.downloadOriginal : ".SRT DOWNLOAD"}
                   </motion.button>

                   {/* Translated SRT Download - Unified Pro Look (No Google Logo) */}
                   {translateEnabled && transcribeResult?.translated && (
                     <motion.button 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => transcribeResult && transcribeResult.translated && downloadSRT(transcribeResult.translated, true)}
                      className="w-full py-7 bg-slate-900 dark:bg-white text-white dark:text-black border border-slate-300 dark:border-white/10 rounded-[2rem] font-black text-[15px] shadow-2xl transition-all flex items-center justify-center gap-4 italic uppercase tracking-widest"
                     >
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {t.srtGen.downloadTranslated}
                     </motion.button>
                   )}
                </div>

                <button 
                  onClick={() => { setTranscribeResult(null); setFile(null); setMergedSegments([]); }}
                  className="w-full mt-12 text-[13px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-gray-700 hover:text-slate-900 dark:hover:text-white transition-all text-center"
                >
                  [ {t.common.newProject} ]
                </button>
              </div>

              <div className="bg-brand-500/5 border border-brand-500/10 rounded-[3rem] p-10 backdrop-blur-md transition-colors">
                 <div className="flex items-center gap-5 mb-6">
                    <div className="w-12 h-12 bg-brand-500/20 rounded-2xl flex items-center justify-center text-brand-500 dark:text-brand-400">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="font-black text-[15px] text-brand-600 dark:text-brand-400 uppercase tracking-widest">{t.srtGen.writingLogic}</h4>
                 </div>
                 <p className="text-sm text-slate-600 dark:text-gray-400 leading-relaxed font-medium transition-colors italic">
                   {t.srtGen.writingLogicDesc}
                 </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-10 p-12 bg-red-900/20 border border-red-500/30 rounded-[3.5rem] text-center max-w-2xl mx-auto shadow-2xl backdrop-blur-xl transition-colors"
        >
          <p className="text-red-400 font-bold text-lg mb-8">{error}</p>
          <button onClick={() => setError(null)} className="text-[13px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white transition-colors">{language === Language.MM ? "ပိတ်မည်" : "Dismiss"}</button>
        </motion.div>
      )}
    </div>
  );
};

export default SRTGeneratorSection;
