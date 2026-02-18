import React, { useState, useRef, useEffect } from 'react';
import { VoicePersona, VoiceTone, Language } from '../types';
import { generateSegmentAudio } from '../services/geminiService';
import { AudioProcessor } from '../utils/audioProcessor';
import { ALL_VOICES } from '../constants/voices';
import { UI_STRINGS } from '../constants/translations';
import { hasAudio, getAudio, saveAudio } from '../utils/db';
import { motion, AnimatePresence } from 'framer-motion';

const VoiceItem: React.FC<{ 
    voice: VoicePersona; 
    index: number; 
    isSelected: boolean; 
    isPlaying: boolean; 
    isLoading: boolean; 
    isCached: boolean;
    onSelect: () => void; 
    onPreview: (e: React.MouseEvent) => void 
}> = ({ voice, index, isSelected, isPlaying, isLoading, isCached, onSelect, onPreview }) => {
  const isMale = voice.gender === 'Male';
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center p-4 rounded-2xl border transition-all relative ${
        isSelected ? 'bg-brand-500/10 border-brand-500/40 shadow-lg' : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-transparent hover:border-brand-500/20 shadow-sm'
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black mr-4 shrink-0 relative ${isMale ? 'bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400' : 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400'}`}>
        {voice.name[0]}
        {isCached && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-dark-900"></div>
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className={`text-sm font-bold ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-gray-200'} truncate`}>{voice.name}</div>
        <div className="text-[10px] text-slate-500 dark:text-gray-500 uppercase font-black tracking-widest truncate">{voice.description}</div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onPreview(e); }} className={`w-10 h-10 rounded-xl flex items-center justify-center ml-2 transition-all ${isPlaying ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10'}`}>
        {isLoading ? <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"></div> : isPlaying ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12"/></svg> : <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
      </button>
    </button>
  );
};

const TTSSection: React.FC<{ language: Language }> = ({ language }) => {
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<string>(ALL_VOICES[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Male' | 'Female'>('Male');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  
  // Preview Language State
  const [previewLanguage, setPreviewLanguage] = useState<'MM' | 'EN'>('MM');
  const [cachedVoices, setCachedVoices] = useState<Set<string>>(new Set());
  
  const processorRef = useRef<AudioProcessor | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const t = UI_STRINGS[language];

  useEffect(() => {
    // Check which voices are already cached
    const checkCache = async () => {
      const newCached = new Set<string>();
      for (const v of ALL_VOICES) {
        // Cache key includes language and default NORMAL tone
        // Standardized with VoiceConfigSection
        const key = `voice_preview_${v.id}_${previewLanguage}_${VoiceTone.NORMAL}`;
        if (await hasAudio(key)) {
          newCached.add(v.id);
        }
      }
      setCachedVoices(newCached);
    };
    checkCache();
  }, [previewLanguage]);

  // Lazy init processor
  useEffect(() => {
    if (!processorRef.current) {
        try { processorRef.current = new AudioProcessor(); } catch (e) { console.warn("Audio Context init deferred"); }
    }
    return () => {
      if (activeSourceRef.current) {
        try { activeSourceRef.current.stop(); } catch(e) {}
      }
    };
  }, []);

  const handlePreview = async (e: React.MouseEvent, voice: VoicePersona) => {
    e.stopPropagation();
    
    if (!processorRef.current) {
         try { processorRef.current = new AudioProcessor(); } catch(e) { return; }
    }

    try { await processorRef.current.resume(); } catch (err) {}

    if (playingId === voice.id) {
        if (activeSourceRef.current) {
            try { activeSourceRef.current.stop(); } catch(e) {}
            activeSourceRef.current = null;
        }
        setPlayingId(null);
        return;
    }

    if (activeSourceRef.current) {
        try { activeSourceRef.current.stop(); } catch(e) {}
        activeSourceRef.current = null;
    }
    setPlayingId(null);
    setPreviewLoadingId(voice.id);

    try {
        // Unified Cache Key
        const cacheKey = `voice_preview_${voice.id}_${previewLanguage}_${VoiceTone.NORMAL}`;
        let buffer: AudioBuffer;
        
        // 1. Try DB (Persistent Cache)
        const cachedData = await getAudio(cacheKey);
        if (cachedData) {
            buffer = await processorRef.current.decodeAudioFile(cachedData as ArrayBuffer);
        } else {
            // 2. Fetch from API
            // Standardized Text with VoiceConfigSection
            const previewText = previewLanguage === 'MM' 
                ? "မင်္ဂလာပါ။ ဒါကတော့ ဂျူပီတာ စတူဒီယိုရဲ့ အသံနမူနာ ဖြစ်ပါတယ်။" 
                : "Hello. This is a preview of my voice on Jupiter Studio.";
            
            const raw = await generateSegmentAudio(previewText, voice.apiVoice, VoiceTone.NORMAL);
            const decoded = processorRef.current.decodePCM(raw);
            buffer = await processorRef.current.processSegment(decoded, voice.detune);
            
            // 3. Save to DB (Persistent Cache)
            const wave = processorRef.current.bufferToWave(buffer);
            await saveAudio(cacheKey, await wave.arrayBuffer());
            
            // Update visual indicator
            setCachedVoices(prev => new Set(prev).add(voice.id));
        }

        setPreviewLoadingId(null);
        setPlayingId(voice.id);
        
        activeSourceRef.current = processorRef.current.playBuffer(buffer, () => {
            setPlayingId(null);
            activeSourceRef.current = null;
        });

    } catch (error) {
        console.error("Preview failed:", error);
        setPreviewLoadingId(null);
        alert(language === Language.MM ? "အသံဖွင့်မရပါ" : "Cannot play preview");
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    
    if (!processorRef.current) {
         try { processorRef.current = new AudioProcessor(); } catch(e) { 
             setIsGenerating(false); return; 
         }
    }

    await processorRef.current.resume();
    try {
      const persona = ALL_VOICES.find(v => v.id === selectedVoice)!;
      const raw = await generateSegmentAudio(text, persona.apiVoice, VoiceTone.NORMAL);
      const decoded = processorRef.current.decodePCM(raw);
      const processed = await processorRef.current.processSegment(decoded, persona.detune);
      const blob = processorRef.current.bufferToWave(processed);
      if(resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(URL.createObjectURL(blob));
    } catch (e) { console.error(e); } finally { setIsGenerating(false); }
  };

  const filteredVoices = ALL_VOICES.filter(v => v.gender === activeTab);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
      <div className="md:col-span-7 lg:col-span-8 space-y-6">
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-xl transition-colors">
          <h2 className="text-[10px] font-black uppercase text-slate-400 dark:text-gray-500 tracking-[0.2em]">{language === Language.MM ? "စာသား ရိုက်ထည့်ပါ" : "Narration Script"}</h2>
          <textarea 
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder={language === Language.MM ? "ဒီနေရာမှာ မြန်မာစာသားကို ရိုက်ထည့်ပါ..." : "Enter Burmese text here..."}
            className="w-full bg-slate-50 dark:bg-dark-950/50 border border-slate-200 dark:border-white/10 rounded-2xl p-8 text-xl font-myanmar leading-relaxed min-h-[400px] outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 custom-scrollbar"
          />
          <button 
            onClick={handleGenerate} disabled={isGenerating || !text.trim()}
            className="w-full py-5 bg-brand-500 hover:bg-brand-400 text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl shadow-brand-500/20 transition-all italic"
          >
            {isGenerating ? t.common.loading : (language === Language.MM ? "အသံဖိုင် ထုတ်ယူမည်" : "Master Audio Export")}
          </button>
        </div>
        
        <AnimatePresence>
          {resultUrl && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-brand-500/5 border border-slate-200 dark:border-brand-500/20 p-6 rounded-[2rem] flex items-center gap-6 shadow-xl transition-colors">
              <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                 <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v13m0 0l-4-4m4 4l4-4M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
              </div>
              <audio src={resultUrl} controls className="flex-1 h-10" />
              <button onClick={() => { const a = document.createElement('a'); a.href = resultUrl; a.download='voice.wav'; a.click(); }} className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black text-[10px] font-black uppercase rounded-xl hover:bg-brand-500 hover:text-white transition-all">{language === Language.MM ? "ဒေါင်းလုဒ်" : "Download"}</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="md:col-span-5 lg:col-span-4 bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] flex flex-col h-[750px] shadow-xl overflow-hidden transition-colors">
        <div className="p-4 bg-slate-50 dark:bg-dark-800/50 border-b border-slate-200 dark:border-white/10 transition-colors flex flex-col gap-3">
          {/* Gender Tabs */}
          <div className="flex gap-2">
            {['Male', 'Female'].map(t => (
                <button key={t} onClick={() => setActiveTab(t as any)} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all relative ${activeTab === t ? 'text-white' : 'text-slate-500 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white'}`}>
                {activeTab === t && <motion.div layoutId="tab-pill" className="absolute inset-0 bg-brand-500 rounded-xl shadow-lg" />}
                <span className="relative z-10">{language === Language.MM ? (t === 'Male' ? 'ကျား' : 'မ') : t}</span>
                </button>
            ))}
          </div>

          {/* Preview Language Switcher */}
          <div className="flex bg-slate-200 dark:bg-dark-950 p-1 rounded-xl">
             <button onClick={() => setPreviewLanguage('MM')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${previewLanguage === 'MM' ? 'bg-white dark:bg-dark-800 text-brand-500 shadow-sm' : 'text-slate-500 dark:text-gray-500'}`}>🇲🇲 Myanmar</button>
             <button onClick={() => setPreviewLanguage('EN')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${previewLanguage === 'EN' ? 'bg-white dark:bg-dark-800 text-brand-500 shadow-sm' : 'text-slate-500 dark:text-gray-500'}`}>🇺🇸 English</button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredVoices.map((v, i) => (
            <VoiceItem 
              key={v.id} 
              voice={v} 
              index={i} 
              isSelected={selectedVoice === v.id} 
              isPlaying={playingId === v.id} 
              isLoading={previewLoadingId === v.id} 
              isCached={cachedVoices.has(v.id)}
              onSelect={() => setSelectedVoice(v.id)} 
              onPreview={(e) => handlePreview(e, v)} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TTSSection;