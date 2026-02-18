
import React, { useState, useRef, useEffect } from 'react';
import { transcribeToSRT, fileToGenerativePart } from '../services/geminiService';
import { parseSRT } from '../utils/srtParser';
import { ParsedSubtitle, Language } from '../types';
import { UI_STRINGS } from '../constants/translations';
import { motion, AnimatePresence } from 'framer-motion';

const SubStudioSection: React.FC<{ language: Language }> = ({ language }) => {
  const t = UI_STRINGS[language];
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [subtitles, setSubtitles] = useState<ParsedSubtitle[]>([]);
  const [activeSub, setActiveSub] = useState<ParsedSubtitle | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Box Settings
  const [isBlurActive, setIsBlurActive] = useState(true);
  const [blurAmount, setBlurAmount] = useState(16);
  const [fontSize, setFontSize] = useState(24);
  
  // Position State (Percentages)
  const [boxState, setBoxState] = useState({ x: 10, y: 75, w: 80, h: 15 });
  
  // Interaction State
  const [dragMode, setDragMode] = useState<'NONE' | 'MOVE' | 'RESIZE'>('NONE');
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startBox, setStartBox] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(selectedFile));
    setError(null);
    setSubtitles([]);
    setIsProcessing(true);

    try {
      const generativePart = await fileToGenerativePart(selectedFile);
      const mimeType = selectedFile.type || generativePart.mimeType || 'video/mp4';
      
      // AUTOMATICALLY TRANSLATE TO MYANMAR
      const srtResult = await transcribeToSRT(generativePart.data, mimeType, '16:9', 'Auto', 'Myanmar');
      
      // Use translated text if available, otherwise original
      const textToUse = srtResult.translated || srtResult.original;
      const parsed = parseSRT(textToUse);
      
      setSubtitles(parsed);
    } catch (err: any) {
      setError(err.message || "Failed to analyze video.");
    } finally {
      setIsProcessing(false);
    }
  };

  const onTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      const active = subtitles.find(s => time >= s.start && time <= s.end);
      setActiveSub(active || null);
    }
  };

  const jumpToTime = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };

  // --- Robust Drag & Resize Logic ---

  const handleMouseDown = (e: React.MouseEvent, mode: 'MOVE' | 'RESIZE') => {
    e.stopPropagation();
    e.preventDefault();
    setDragMode(mode);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartBox({ ...boxState });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragMode === 'NONE' || !containerRef.current) return;
    
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate delta in percentages
    const deltaX = ((e.clientX - startPos.x) / rect.width) * 100;
    const deltaY = ((e.clientY - startPos.y) / rect.height) * 100;

    if (dragMode === 'MOVE') {
      let newX = startBox.x + deltaX;
      let newY = startBox.y + deltaY;

      // Constrain to container
      newX = Math.max(0, Math.min(100 - startBox.w, newX));
      newY = Math.max(0, Math.min(100 - startBox.h, newY));

      setBoxState(prev => ({ ...prev, x: newX, y: newY }));
    } else if (dragMode === 'RESIZE') {
      let newW = startBox.w + deltaX;
      let newH = startBox.h + deltaY;

      // Minimum size constraints (5%)
      newW = Math.max(5, Math.min(100 - startBox.x, newW));
      newH = Math.max(5, Math.min(100 - startBox.y, newH));

      setBoxState(prev => ({ ...prev, w: newW, h: newH }));
    }
  };

  const handleMouseUp = () => {
    setDragMode('NONE');
  };

  useEffect(() => {
    if (activeSub && timelineRef.current) {
      const activeElement = document.getElementById(`sub-${activeSub.id}`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeSub]);

  return (
    <div 
      className="max-w-7xl mx-auto px-4 select-none" 
      onMouseMove={handleMouseMove} 
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {!subtitles.length && !isProcessing ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative border-2 border-dashed rounded-[2rem] p-8 transition-all duration-300 flex flex-row items-center justify-center gap-6 group cursor-pointer
            ${dragActive ? 'border-brand-500 bg-brand-500/5 scale-[1.01]' : 'border-black/10 dark:border-white/10 bg-white dark:bg-dark-900/40 hover:border-brand-500/50 shadow-sm'}
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
            <h3 className="text-xl font-black text-slate-900 dark:text-white italic whitespace-nowrap">{t.subStudio.uploadTitle}</h3>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300 dark:bg-gray-600"></div>
            <p className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">{t.subStudio.uploadDesc}</p>
          </div>
          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-50" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </motion.div>
      ) : isProcessing ? (
        <div className="flex flex-col items-center justify-center min-h-[450px] gap-8">
           <div className="relative">
              <div className="w-24 h-24 border-4 border-brand-500/20 rounded-full" />
              <div className="w-24 h-24 border-4 border-brand-500 border-t-transparent rounded-full animate-spin absolute inset-0 shadow-[0_0_20px_rgba(249,115,22,0.3)]" />
           </div>
           <div className="text-center">
              <motion.h3 animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-3xl font-black text-slate-900 dark:text-white mb-2 italic tracking-tighter uppercase">{language === Language.MM ? "ဗီဒီယိုကို စစ်ဆေးနေသည်..." : "Scanning Scene Transitions..."}</motion.h3>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Translating to Burmese...</p>
           </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div 
              ref={containerRef}
              className="relative bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 aspect-video group"
            >
              {videoUrl && (
                <video 
                  ref={videoRef}
                  src={videoUrl} 
                  className="w-full h-full object-contain pointer-events-none"
                  onTimeUpdate={onTimeUpdate}
                  controls={false}
                />
              )}
              
              {/* THE SUBTITLE & BLUR BOX */}
              <div 
                onMouseDown={(e) => handleMouseDown(e, 'MOVE')}
                style={{
                  left: `${boxState.x}%`,
                  top: `${boxState.y}%`,
                  width: `${boxState.w}%`,
                  height: `${boxState.h}%`,
                }}
                className={`absolute z-20 group/box
                   ${dragMode !== 'NONE' ? 'cursor-grabbing' : 'cursor-grab'}
                `}
              >
                 {/* Visual Border (Only shows on hover or active) */}
                 <div className="absolute inset-0 border-2 border-brand-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)] rounded-lg pointer-events-none opacity-50 group-hover/box:opacity-100 transition-opacity" />

                 {/* The Blur Layer */}
                 {isBlurActive && (
                    <div 
                      className="absolute inset-0 z-0 rounded-lg pointer-events-none overflow-hidden" 
                      style={{ backdropFilter: `blur(${blurAmount}px)`, WebkitBackdropFilter: `blur(${blurAmount}px)` }} 
                    >
                      <div className="absolute inset-0 bg-black/20" />
                    </div>
                 )}
                 
                 {/* Resize Handle (Bottom Right) */}
                 <div 
                    onMouseDown={(e) => handleMouseDown(e, 'RESIZE')}
                    className="absolute -bottom-2 -right-2 w-8 h-8 cursor-nwse-resize bg-brand-500 rounded-full flex items-center justify-center shadow-xl z-30 opacity-0 group-hover/box:opacity-100 transition-opacity"
                 >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 19L5 5" /></svg>
                 </div>

                 {/* THE SUBTITLE TEXT (Inside the box) */}
                 <div className="absolute inset-0 flex items-center justify-center p-2 z-10 pointer-events-none">
                    <AnimatePresence mode="wait">
                        {activeSub && (
                          <motion.div 
                            key={activeSub.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="w-full text-center"
                          >
                            <span 
                              className="text-white font-black font-myanmar leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] break-words whitespace-pre-wrap"
                              style={{ fontSize: `${fontSize}px` }}
                            >
                              {activeSub.text}
                            </span>
                          </motion.div>
                        )}
                    </AnimatePresence>
                 </div>
              </div>

              {/* Video Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-6 z-10">
                 <button 
                  onClick={() => videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause()}
                  className="w-12 h-12 bg-brand-500 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 transition-transform"
                 >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      {videoRef.current?.paused ? <path d="M8 5v14l11-7z"/> : <rect x="6" y="6" width="12" height="12"/>}
                    </svg>
                 </button>
                 <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden relative cursor-pointer" onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const perc = (e.clientX - rect.left) / rect.width;
                    if(videoRef.current) videoRef.current.currentTime = videoRef.current.duration * perc;
                 }}>
                    <motion.div className="h-full bg-brand-500 relative" style={{ width: `${(currentTime / (videoRef.current?.duration || 1)) * 100}%` }}>
                       <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform"></div>
                    </motion.div>
                 </div>
                 <div className="text-[10px] font-black font-mono text-gray-400">
                    {currentTime.toFixed(1)}s / {videoRef.current?.duration.toFixed(1)}s
                 </div>
              </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Blur Control */}
              <div className="bg-white dark:bg-dark-800/40 p-6 rounded-[2rem] border border-black/5 dark:border-white/5 space-y-6 shadow-xl backdrop-blur-md transition-colors">
                 <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                       <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-gray-500 tracking-widest mb-1">{t.subStudio.blurMask}</h4>
                       <p className="text-[11px] font-bold text-slate-900 dark:text-white">{t.subStudio.blurDesc}</p>
                    </div>
                    <button 
                      onClick={() => setIsBlurActive(!isBlurActive)}
                      className={`w-14 h-7 rounded-full transition-all relative ${isBlurActive ? 'bg-brand-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-slate-200 dark:bg-dark-950 border border-black/5 dark:border-white/10'}`}
                    >
                       <motion.div animate={{ x: isBlurActive ? 30 : 4 }} className="w-5 h-5 bg-white rounded-full mt-1 shadow-md" />
                    </button>
                 </div>
                 
                 <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 dark:text-gray-500">
                       <span>{t.subStudio.blurPower}</span>
                       <span className="text-brand-500">{blurAmount}px</span>
                    </div>
                    <input type="range" min="0" max="40" value={blurAmount} onChange={(e) => setBlurAmount(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-200 dark:bg-dark-950 rounded-full appearance-none accent-brand-500 cursor-pointer" />
                 </div>
              </div>

              {/* Font Size Control (New) */}
              <div className="bg-white dark:bg-dark-800/40 p-6 rounded-[2rem] border border-black/5 dark:border-white/5 space-y-6 shadow-xl backdrop-blur-md transition-colors">
                 <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-gray-500 tracking-widest">{language === Language.MM ? "စာလုံးအရွယ်အစား" : "Font Size"}</h4>
                 <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 dark:text-gray-500">
                       <span>Size</span>
                       <span className="text-brand-500">{fontSize}px</span>
                    </div>
                    <input type="range" min="12" max="72" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-200 dark:bg-dark-950 rounded-full appearance-none accent-brand-500 cursor-pointer" />
                 </div>
                 <p className="text-[10px] text-slate-500 italic">
                    {language === Language.MM ? "အကွက်ထဲတွင် စာသားများ ဝင်ဆံ့အောင် ချိန်ညှိပါ" : "Adjust size to fit text within the box"}
                 </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white dark:bg-dark-900/60 border border-black/5 dark:border-white/5 rounded-[2.5rem] flex flex-col h-[700px] shadow-2xl overflow-hidden backdrop-blur-xl transition-colors">
            <div className="p-8 bg-slate-50 dark:bg-white/5 border-b border-black/5 dark:border-white/5 flex justify-between items-center transition-colors">
               <h4 className="text-xs font-black uppercase tracking-widest text-brand-500 italic">{t.subStudio.timelineView}</h4>
               <span className="bg-brand-500/20 text-brand-500 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter shadow-inner">{language === Language.MM ? "လက်ရှိ" : "Active"}</span>
            </div>
            <div ref={timelineRef} className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar bg-white dark:bg-transparent transition-colors">
              {subtitles.map((sub) => (
                <button 
                  key={sub.id} id={`sub-${sub.id}`} onClick={() => jumpToTime(sub.start)}
                  className={`w-full text-left p-5 rounded-3xl border transition-all duration-300 group
                    ${activeSub?.id === sub.id ? 'bg-brand-500 border-brand-500 shadow-2xl scale-[1.02]' : 'bg-slate-50 dark:bg-dark-800/30 border-transparent hover:border-brand-500/20'}
                  `}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className={`text-[10px] font-black font-mono tracking-tighter ${activeSub?.id === sub.id ? 'text-white/70' : 'text-brand-500'}`}>{sub.start.toFixed(2)}s</span>
                    <div className={`w-2 h-2 rounded-full ${activeSub?.id === sub.id ? 'bg-white animate-pulse' : 'bg-slate-300 dark:bg-gray-700'}`}></div>
                  </div>
                  <p className={`text-[15px] leading-relaxed font-bold font-myanmar ${activeSub?.id === sub.id ? 'text-white' : 'text-slate-700 dark:text-gray-400 group-hover:text-slate-900 dark:group-hover:text-gray-200'}`}>{sub.text}</p>
                </button>
              ))}
            </div>
            <div className="p-8 border-t border-black/5 dark:border-white/5 bg-white dark:bg-dark-950/50 space-y-4 transition-colors">
              <button 
                onClick={() => {
                  if (subtitles.length === 0) return;
                  const srtText = subtitles.map(s => `${s.id}\n00:00:${s.start.toFixed(3).replace('.', ',')} --> 00:00:${s.end.toFixed(3).replace('.', ',')}\n${s.text}`).join('\n\n');
                  const blob = new Blob([srtText], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'captions.srt'; a.click();
                }}
                className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-brand-500 dark:hover:bg-brand-500 hover:text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-2xl italic flex items-center justify-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                {t.subStudio.exportSrt}
              </button>
              <button onClick={() => { setSubtitles([]); setFile(null); }} className="w-full text-[10px] font-black text-slate-400 dark:text-gray-600 hover:text-brand-500 uppercase tracking-widest text-center py-2 transition-colors">{t.common.newProject}</button>
            </div>
          </div>
        </motion.div>
      )}

      {error && (
        <div className="mt-8 p-8 bg-red-900/20 border border-red-500/30 rounded-[2.5rem] text-center max-w-2xl mx-auto shadow-2xl backdrop-blur-md">
          <p className="text-red-400 font-bold text-sm mb-4">{error}</p>
          <button onClick={() => setError(null)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white transition-colors">{language === Language.MM ? "ပိတ်မည်" : "Dismiss"}</button>
        </div>
      )}
    </div>
  );
};

export default SubStudioSection;
