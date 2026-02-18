import React, { useState, useRef, useEffect } from 'react';
import { VoicePersona, VoiceTone, SubtitleSegment, Language } from '../types';
import { generateSegmentAudio } from '../services/geminiService';
import { AudioProcessor } from '../utils/audioProcessor';
import { ALL_VOICES } from '../constants/voices';
import { UI_STRINGS } from '../constants/translations';
import { saveAudio, getAudio, hasAudio } from '../utils/db';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceConfigSectionProps {
  selectedVoice: string; 
  setSelectedVoice: (id: string) => void;
  selectedTone: VoiceTone;
  setSelectedTone: (t: VoiceTone) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  progress: { current: number; total: number };
  statusMessage?: string;
  segments: SubtitleSegment[]; 
  targetDuration: number;
  setTargetDuration: (d: number) => void;
  forceSync: boolean;
  setForceSync: (v: boolean) => void;
  smoothFlow: boolean;
  setSmoothFlow: (v: boolean) => void;
  language: Language;
}

const tones = [
  { id: VoiceTone.NORMAL, icon: '🙂' },
  { id: VoiceTone.MOVIE_RECAP, icon: '🎬' },
  { id: VoiceTone.DOCUMENTARY, icon: '🦁' },
  { id: VoiceTone.HORROR, icon: '👻' },
];

const VoiceCard: React.FC<{ 
  persona: VoicePersona; 
  index: number; 
  isSelected: boolean; 
  isPlaying: boolean; 
  isLoading: boolean; 
  isCached: boolean; 
  isFav: boolean; 
  onSelect: () => void; 
  onPreview: (e: React.MouseEvent) => void | Promise<void>; 
  onFavorite: (e: React.MouseEvent) => void; 
  language: Language;
}> = ({ 
  persona, 
  index, 
  isSelected, 
  isPlaying, 
  isLoading, 
  isCached, 
  isFav, 
  onSelect, 
  onPreview, 
  onFavorite,
  language
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: index * 0.02 }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onSelect}
    className={`relative flex items-center p-4 md:p-5 rounded-2xl border cursor-pointer transition-all group
      ${isSelected 
        ? 'bg-brand-500/10 border-brand-500 shadow-xl' 
        : 'bg-white dark:bg-dark-800/30 border-slate-200 dark:border-white/10 hover:border-brand-500/30 hover:bg-slate-50 dark:hover:bg-dark-800/80 shadow-sm hover:shadow-md'}
    `}
  >
    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center text-lg md:text-xl font-black mr-3 md:mr-4 shadow-inner relative shrink-0 ${persona.gender === 'Male' ? 'bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400' : 'bg-pink-600/10 text-pink-600 dark:bg-pink-600/20 dark:text-pink-400'}`}>
      {persona.name[0]}
      {/* Green Dot for Cached Audio */}
      {isCached && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1.5 -right-1.5 w-4 h-4 md:w-5 md:h-5 bg-green-500 rounded-full flex items-center justify-center text-white border-2 border-white dark:border-dark-900 shadow-sm" title="Preview Ready">
           <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
        </motion.div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
         <h4 className={`font-black text-[14px] md:text-[15px] mb-0.5 ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-gray-200'}`}>{persona.name}</h4>
         <motion.button whileTap={{ scale: 0.8 }} onClick={onFavorite} className={`p-1 rounded-full transition-colors ${isFav ? 'text-yellow-500' : 'text-slate-300 dark:text-gray-600 hover:text-slate-500 dark:hover:text-gray-400'}`}>
           <svg className="w-4 h-4 md:w-4.5 md:h-4.5" fill={isFav ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363 1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
         </motion.button>
      </div>
      <p className="text-[10px] md:text-[11px] text-slate-500 dark:text-gray-500 uppercase font-black tracking-tight truncate">{language === Language.MM ? "စတူဒီယို အသံအရည်အသွေး" : persona.description}</p>
    </div>
    <motion.button 
      whileHover={{ scale: 1.1 }} 
      whileTap={{ scale: 0.9 }} 
      onClick={onPreview} 
      className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all shrink-0 ${isPlaying ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-500 hover:bg-slate-200 dark:hover:bg-white hover:text-slate-900 dark:hover:text-black shadow-sm'} ${isLoading ? 'cursor-not-allowed opacity-70' : ''}`}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      ) : isPlaying ? (
        <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" /></svg>
      ) : (
        <svg className={`w-4 h-4 md:w-5 md:h-5 ml-0.5`} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      )}
    </motion.button>
  </motion.div>
);

const VoiceConfigSection: React.FC<VoiceConfigSectionProps> = ({
  selectedVoice,
  setSelectedVoice,
  selectedTone,
  setSelectedTone,
  onGenerate,
  isGenerating,
  progress,
  statusMessage,
  segments,
  targetDuration,
  setTargetDuration,
  forceSync,
  setForceSync,
  smoothFlow,
  setSmoothFlow,
  language
}) => {
  const t = UI_STRINGS[language];
  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  const [activeTab, setActiveTab] = useState<'Male' | 'Female' | 'Favorites'>('Male');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  // New State for Preview Language
  const [previewLanguage, setPreviewLanguage] = useState<'MM' | 'EN'>('MM');
  const [cachedVoices, setCachedVoices] = useState<Set<string>>(new Set());
  
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const processorRef = useRef<AudioProcessor | null>(null);

  // Initialize audio processor lazily
  useEffect(() => {
    if (!processorRef.current) {
        try {
            processorRef.current = new AudioProcessor();
        } catch (e) {
            console.error("Failed to initialize AudioProcessor", e);
        }
    }
  }, []);

  // Check which voices are already cached in IndexedDB when preview settings change
  useEffect(() => {
    const checkCache = async () => {
      const newCached = new Set<string>();
      for (const v of ALL_VOICES) {
        // Standardized Cache Key: Shared with TTSSection for 'Normal' tone
        const key = `voice_preview_${v.id}_${previewLanguage}_${selectedTone}`;
        if (await hasAudio(key)) {
          newCached.add(v.id);
        }
      }
      setCachedVoices(newCached);
    };
    checkCache();
  }, [previewLanguage, selectedTone]);

  useEffect(() => {
    const resume = async () => { 
        if (processorRef.current) {
            try { await processorRef.current.resume(); } catch {} 
        }
    };
    window.addEventListener('click', resume, { once: true });
    return () => {
      window.removeEventListener('click', resume);
      if (activeSourceRef.current) try { activeSourceRef.current.stop(); } catch {}
    };
  }, []);

  const handlePreview = async (e: React.MouseEvent, voice: VoicePersona) => {
    e.stopPropagation();
    if (!processorRef.current) {
        try { processorRef.current = new AudioProcessor(); } catch(e) { return; }
    }
    
    try { await processorRef.current.resume(); } catch {}

    if (playingVoiceId === voice.id) {
        if (activeSourceRef.current) {
            try { activeSourceRef.current.stop(); } catch {}
            activeSourceRef.current = null;
        }
        setPlayingVoiceId(null);
        return;
    }

    if (activeSourceRef.current) {
        try { activeSourceRef.current.stop(); } catch {}
        activeSourceRef.current = null;
    }
    setPlayingVoiceId(null);
    setPreviewLoadingId(voice.id);

    try {
        // Unified Cache Key
        const cacheKey = `voice_preview_${voice.id}_${previewLanguage}_${selectedTone}`;
        let buffer: AudioBuffer;
        
        // 1. Check DB first (Persistent Cache)
        const cachedData = await getAudio(cacheKey);
        
        if (cachedData) {
            buffer = await processorRef.current.decodeAudioFile(cachedData as ArrayBuffer);
        } else {
            // 2. If not found, generate via API
            // Standardized Text for both Auto Dub and TTS sections
            const previewText = previewLanguage === 'MM' 
              ? "မင်္ဂလာပါ။ ဒါကတော့ ဂျူပီတာ စတူဒီယိုရဲ့ အသံနမူနာ ဖြစ်ပါတယ်။" 
              : "Hello. This is a preview of my voice on Jupiter Studio.";
            
            const raw = await generateSegmentAudio(previewText, voice.apiVoice, selectedTone);
            const decoded = processorRef.current.decodePCM(raw);
            buffer = await processorRef.current.processSegment(decoded, voice.detune);
            
            // 3. Save to DB for next time (Persistent Cache)
            const wave = processorRef.current.bufferToWave(buffer);
            await saveAudio(cacheKey, await wave.arrayBuffer());
            
            // Update visual indicator
            setCachedVoices(prev => new Set(prev).add(voice.id));
        }

        setPreviewLoadingId(null);
        setPlayingVoiceId(voice.id);
        
        activeSourceRef.current = processorRef.current.playBuffer(buffer, () => {
            setPlayingVoiceId(null);
            activeSourceRef.current = null;
        });
    } catch (error) {
        console.error("Preview failed:", error);
        setPreviewLoadingId(null);
    }
  };

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredVoices = ALL_VOICES.filter(v => {
    if (activeTab === 'Favorites') return favorites.has(v.id);
    return v.gender === activeTab;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        
        {/* Context & Tone */}
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 p-5 rounded-[2rem] shadow-sm flex flex-col gap-3">
           <span className="text-[10px] font-black uppercase text-slate-500 dark:text-gray-500 tracking-widest">{t.voiceConfig.context}</span>
           <div className="grid grid-cols-2 gap-2">
              {tones.map(tone => (
                 <button
                   key={tone.id}
                   onClick={() => setSelectedTone(tone.id)}
                   className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${selectedTone === tone.id ? 'bg-brand-500 border-brand-500 text-white shadow-md' : 'bg-slate-50 dark:bg-dark-950 border-transparent text-slate-600 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white'}`}
                 >
                    <span>{tone.icon}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest truncate">{tone.id}</span>
                 </button>
              ))}
           </div>
        </div>

        {/* Preview Language Toggle (NEW) */}
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 p-5 rounded-[2rem] shadow-sm flex flex-col gap-3">
           <span className="text-[10px] font-black uppercase text-slate-500 dark:text-gray-500 tracking-widest">{language === Language.MM ? "နမူနာ ဘာသာစကား" : "Preview Language"}</span>
           <div className="flex bg-slate-100 dark:bg-dark-950 p-1 rounded-xl border border-slate-200 dark:border-white/10">
              <button 
                onClick={() => setPreviewLanguage('MM')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${previewLanguage === 'MM' ? 'bg-white dark:bg-dark-800 text-brand-500 shadow-md' : 'text-slate-500 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-300'}`}
              >
                🇲🇲 Myanmar
              </button>
              <button 
                onClick={() => setPreviewLanguage('EN')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${previewLanguage === 'EN' ? 'bg-white dark:bg-dark-800 text-brand-500 shadow-md' : 'text-slate-500 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-300'}`}
              >
                🇺🇸 English
              </button>
           </div>
           
           {/* Smart Sync (Moved here or kept) */}
           <button onClick={() => setForceSync(!forceSync)} className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all text-left mt-auto ${forceSync ? 'bg-brand-500/10 border-brand-500/30 text-brand-600 dark:text-brand-400' : 'bg-slate-50 dark:bg-dark-950 border-transparent text-slate-500 dark:text-slate-400'}`}>
              <span className="text-[9px] font-black uppercase tracking-widest">{language === Language.MM ? "Smart Video Sync" : "Smart Video Sync"}</span>
              <div className={`w-6 h-3 rounded-full relative transition-colors ${forceSync ? 'bg-brand-500' : 'bg-slate-300'}`}>
                 <motion.div animate={{ x: forceSync ? 14 : 2 }} className="absolute top-0.5 w-2 h-2 bg-white rounded-full shadow-sm" />
              </div>
           </button>
        </div>

        {/* Generate Button */}
        <div className="bg-brand-500 p-5 rounded-[2rem] shadow-xl shadow-brand-500/20 flex flex-col justify-between text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700" />
            <div>
               <h3 className="text-2xl font-black italic tracking-tighter mb-1">{language === Language.MM ? "အသံထုတ်ယူရန်" : "Generate Dub"}</h3>
               <p className="text-[10px] font-medium opacity-80 uppercase tracking-widest">{segments.length} segments • Normal Speed</p>
            </div>
            <button 
              onClick={onGenerate}
              disabled={isGenerating}
              className="w-full py-3 bg-white text-brand-600 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-slate-50 transition-all disabled:opacity-70 flex items-center justify-center gap-2 mt-4"
            >
              {isGenerating ? <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
              {isGenerating ? t.common.loading : t.common.dubNow}
            </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl relative">
        <div className="p-4 border-b border-slate-200 dark:border-white/10 flex gap-2 overflow-x-auto no-scrollbar bg-slate-50 dark:bg-dark-950/50">
           {['Male', 'Female', 'Favorites'].map(tab => (
             <button 
               key={tab} 
               onClick={() => setActiveTab(tab as any)}
               className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all relative ${activeTab === tab ? 'text-white' : 'text-slate-500 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white'}`}
             >
                {activeTab === tab && <motion.div layoutId="voice-tab" className="absolute inset-0 bg-brand-500 rounded-xl shadow-lg" />}
                <span className="relative z-10">{language === Language.MM ? (tab === 'Male' ? 'အမျိုးသား' : tab === 'Female' ? 'အမျိုးသမီး' : 'အနှစ်သက်ဆုံး') : tab}</span>
             </button>
           ))}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start custom-scrollbar">
           {filteredVoices.map((voice, i) => (
             <VoiceCard
                key={voice.id}
                index={i}
                persona={voice}
                isSelected={selectedVoice === voice.id}
                isPlaying={playingVoiceId === voice.id}
                isLoading={previewLoadingId === voice.id}
                isCached={cachedVoices.has(voice.id)}
                isFav={favorites.has(voice.id)}
                onSelect={() => setSelectedVoice(voice.id)}
                onPreview={(e) => handlePreview(e, voice)}
                onFavorite={(e) => toggleFavorite(e, voice.id)}
                language={language}
             />
           ))}
        </div>

        <AnimatePresence>
           {isGenerating && (
             <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="absolute bottom-0 left-0 right-0 p-6 bg-slate-900/95 text-white backdrop-blur-xl border-t border-white/10 z-20">
                <div className="flex justify-between items-end mb-3">
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-1">{statusMessage || t.common.loading}</p>
                     <p className="text-2xl font-black italic tracking-tighter">{progressPercent}%</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] font-bold text-slate-400">{progress.current} / {progress.total} Segments</p>
                   </div>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${progressPercent}%` }}
                     transition={{ ease: "easeOut" }}
                     className="h-full bg-brand-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]"
                   />
                </div>
             </motion.div>
           )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VoiceConfigSection;