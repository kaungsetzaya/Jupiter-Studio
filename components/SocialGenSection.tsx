import React, { useState, useRef } from 'react';
import { generateSocialContent, fileToGenerativePart } from '../services/geminiService';
import { Language, SocialContent } from '../types';
import { UI_STRINGS } from '../constants/translations';
import { motion, AnimatePresence } from 'framer-motion';

const PLATFORMS = [
  { id: 'Facebook', icon: '👥' },
  { id: 'TikTok', icon: '🎵' },
  { id: 'YouTube', icon: '🎬' },
  { id: 'Instagram', icon: '📸' }
];

const SocialGenSection: React.FC<{ language: Language }> = ({ language }) => {
  const t = UI_STRINGS[language];
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<SocialContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState('');
  
  // Settings
  const [selectedPlatform, setSelectedPlatform] = useState('Facebook');
  const [includeTags, setIncludeTags] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setResult(null);
    setIsProcessing(true);
    setStatus(t.social.analyzing);

    try {
      const generativePart = await fileToGenerativePart(selectedFile);
      const content = await generateSocialContent(
        generativePart.data, 
        selectedFile.type || generativePart.mimeType,
        selectedPlatform,
        includeTags,
        language
      );
      setResult(content);
      setStatus('');
    } catch (err: any) {
      setError(err.message || "Analysis failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    const text = `TITLE: ${result.title}\n\nCAPTION: ${result.caption}\n\n${result.hashtags.join(' ')}`;
    navigator.clipboard.writeText(text);
    alert(t.social.copied);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-24 md:pb-12">
      <AnimatePresence mode="wait">
        {!result && !isProcessing ? (
          <motion.div 
            key="setup-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Settings Dashboard - 12 Column Grid for better proportions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 max-w-6xl mx-auto items-stretch">
               
               {/* Platform Selection Box - Spans 5 columns on Desktop */}
               <div className="lg:col-span-5 bg-white dark:bg-dark-800/50 p-5 sm:p-6 lg:p-8 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-xl backdrop-blur-md transition-colors flex flex-col justify-center h-full">
                  <h3 className="text-[10px] md:text-[12px] font-black uppercase text-slate-400 dark:text-gray-500 tracking-[0.2em] text-center mb-4 md:mb-6">{t.social.platform}</h3>
                  <div className="grid grid-cols-2 gap-3">
                     {PLATFORMS.map((p) => (
                       <button 
                         key={p.id}
                         onClick={() => setSelectedPlatform(p.id)}
                         className={`p-3 sm:p-4 lg:p-5 rounded-2xl border transition-all flex flex-col items-center gap-2 ${selectedPlatform === p.id ? 'bg-brand-500 border-brand-500 text-white shadow-lg scale-[1.02]' : 'bg-slate-50 dark:bg-dark-900 border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800'}`}
                       >
                          <span className="text-2xl sm:text-3xl lg:text-4xl">{p.icon}</span>
                          <span className="text-[9px] md:text-[11px] font-black uppercase tracking-widest">{p.id}</span>
                       </button>
                     ))}
                  </div>
               </div>

               {/* Right Column (Hashtags + Upload) - Spans 7 columns on Desktop */}
               <div className="lg:col-span-7 flex flex-col gap-4 h-full">
                  {/* Hashtag Toggle Box */}
                  <div className="bg-white dark:bg-dark-800/50 p-5 sm:p-6 lg:p-8 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-xl backdrop-blur-md flex flex-col justify-center transition-colors">
                      <button 
                        onClick={() => setIncludeTags(!includeTags)}
                        className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group ${includeTags ? 'bg-brand-500/10 border-brand-500/50' : 'bg-slate-50 dark:bg-dark-900 border-transparent'}`}
                      >
                        <div className="flex flex-col items-start text-left">
                            <span className={`text-[11px] md:text-[13px] font-black uppercase tracking-widest ${includeTags ? 'text-brand-500' : 'text-slate-400'}`}>{t.social.includeHashtags}</span>
                            <span className="text-[9px] md:text-[11px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">#viral #trending #story</span>
                        </div>
                        <div className={`w-10 h-6 rounded-full relative transition-all shrink-0 ${includeTags ? 'bg-brand-500' : 'bg-slate-300 dark:bg-gray-700'}`}>
                            <motion.div animate={{ x: includeTags ? 18 : 3 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                        </div>
                      </button>
                  </div>

                  {/* Upload Box - Flexible Height */}
                  <motion.div 
                    className={`relative border-2 border-dashed rounded-[2rem] p-5 sm:p-6 lg:p-8 transition-all duration-300 flex flex-col sm:flex-row items-center justify-center gap-4 group cursor-pointer flex-1 min-h-[160px]
                      ${dragActive ? 'border-brand-500 bg-brand-500/5 scale-[1.01]' : 'border-black/10 dark:border-white/10 bg-white dark:bg-dark-800/20 hover:border-brand-500/50 shadow-sm'}
                    `}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => { e.preventDefault(); setDragActive(false); if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                  >
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center text-brand-400 shadow-xl relative shrink-0 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left">
                      <h3 className="text-base md:text-xl font-black text-slate-900 dark:text-white italic tracking-tight whitespace-nowrap">{t.social.uploadTitle}</h3>
                      <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300 dark:bg-gray-600 my-1"></div>
                      <p className="text-[9px] md:text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">{t.social.uploadDesc}</p>
                    </div>
                    <input type="file" ref={fileInputRef} className="absolute inset-0 opacity-0 cursor-pointer z-50" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} accept="video/*" />
                  </motion.div>
               </div>
            </div>
          </motion.div>
        ) : isProcessing ? (
          <motion.div 
            key="loading-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[400px] md:min-h-[500px] gap-8 md:gap-10"
          >
             <div className="relative">
                <div className="w-20 h-20 md:w-28 md:h-28 border-4 border-brand-500/20 rounded-full" />
                <div className="w-20 h-20 md:w-28 md:h-28 border-4 border-brand-500 border-t-transparent rounded-full animate-spin absolute inset-0 shadow-[0_0_25px_rgba(249,115,22,0.4)]" />
             </div>
             <div className="text-center px-4">
                <motion.h3 animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-3 italic tracking-tighter uppercase transition-colors">{status}</motion.h3>
             </div>
          </motion.div>
        ) : (
          <motion.div 
            key="results-container"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto space-y-6 md:space-y-8"
          >
            <div className="bg-white dark:bg-dark-900 border border-black/5 dark:border-white/5 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 shadow-2xl relative overflow-hidden backdrop-blur-xl transition-colors">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 gap-4">
                  <h3 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white italic tracking-tight transition-colors">{t.social.resultTitle}</h3>
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-dark-950 px-4 md:px-6 py-2 md:py-3 rounded-2xl transition-colors">
                     <span className="text-[10px] md:text-[13px] font-black uppercase text-brand-500 tracking-widest">{selectedPlatform}</span>
                  </div>
               </div>

               <div className="space-y-8 md:space-y-12">
                  <div className="space-y-3 md:space-y-5">
                     <label className="text-[10px] md:text-[13px] font-black uppercase tracking-[0.2em] text-brand-500/70">{t.social.hook}</label>
                     <div className="bg-slate-50 dark:bg-dark-950/50 p-6 md:p-10 rounded-[1.5rem] md:rounded-[2rem] border border-black/5 dark:border-white/5 text-xl md:text-3xl font-black text-slate-900 dark:text-white italic leading-tight transition-colors shadow-inner">
                        "{result?.title}"
                     </div>
                  </div>

                  <div className="space-y-3 md:space-y-5">
                     <label className="text-[10px] md:text-[13px] font-black uppercase tracking-[0.2em] text-slate-400">{t.social.caption}</label>
                     <div className="bg-slate-50 dark:bg-dark-950/50 p-6 md:p-10 rounded-[1.5rem] md:rounded-[2rem] border border-black/5 dark:border-white/5 text-sm md:text-xl font-medium text-slate-700 dark:text-gray-300 leading-relaxed font-myanmar transition-colors shadow-inner">
                        {result?.caption}
                     </div>
                  </div>

                  {includeTags && result?.hashtags && result.hashtags.length > 0 && (
                    <div className="space-y-3 md:space-y-5">
                       <label className="text-[10px] md:text-[13px] font-black uppercase tracking-[0.2em] text-slate-400">{t.social.tags}</label>
                       <div className="flex flex-wrap gap-2 md:gap-3.5">
                          {result.hashtags.map((tag, i) => (
                            <span key={i} className="px-4 md:px-6 py-2 md:py-3 bg-brand-500/10 text-brand-500 rounded-2xl text-[11px] md:text-[14px] font-black lowercase tracking-tighter transition-colors">
                               {tag.startsWith('#') ? tag : `#${tag}`}
                            </span>
                          ))}
                       </div>
                    </div>
                  )}
               </div>

               <div className="mt-10 md:mt-16 flex flex-col sm:flex-row gap-4 md:gap-6">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={copyToClipboard}
                    className="flex-1 py-5 md:py-7 bg-brand-500 hover:bg-brand-400 text-white rounded-[1.5rem] md:rounded-[2rem] font-black text-xs md:text-[15px] uppercase tracking-widest shadow-xl shadow-brand-500/20 transition-all flex items-center justify-center gap-4 italic"
                  >
                     <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                     {t.social.copy}
                  </motion.button>
                  <button 
                    onClick={() => { setResult(null); setFile(null); }}
                    className="px-8 md:px-14 py-5 md:py-7 bg-slate-50 dark:bg-dark-950 border border-black/5 dark:border-white/5 text-slate-400 dark:text-gray-600 rounded-[1.5rem] md:rounded-[2rem] font-black text-xs md:text-[15px] uppercase tracking-widest hover:text-slate-900 dark:hover:text-white transition-all"
                  >
                     {t.common.newProject}
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 md:mt-10 p-6 md:p-12 bg-red-900/20 border border-red-500/30 rounded-[2rem] md:rounded-[3rem] text-center max-w-2xl mx-auto shadow-2xl backdrop-blur-xl"
        >
          <p className="text-red-400 font-bold text-sm md:text-lg mb-6 md:mb-8">{error}</p>
          <button onClick={() => setError(null)} className="text-[11px] md:text-[13px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white transition-colors">{language === Language.MM ? "ပိတ်မည်" : "Dismiss"}</button>
        </motion.div>
      )}
    </div>
  );
};

export default SocialGenSection;