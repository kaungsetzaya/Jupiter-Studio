
import React, { useState, useRef, useEffect } from 'react';
import { generateThumbnail, optimizeImage } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';
import { Language } from '../types';
import { UI_STRINGS } from '../constants/translations';

const STYLES = [
  { id: 'vlog', icon: '🔥' },
  { id: 'cinematic', icon: '🎬' },
  { id: '3d', icon: '🚀' },
  { id: 'minimal', icon: '💎' },
];

const RATIOS = [
  { id: '16:9', icon: '📺' },
  { id: '9:16', icon: '📱' },
  { id: '1:1', icon: '🟦' },
];

const PLATFORMS = [
  { id: 'YouTube', icon: '🎬', defaultRatio: '16:9' },
  { id: 'TikTok', icon: '🎵', defaultRatio: '9:16' },
  { id: 'Instagram', icon: '📸', defaultRatio: '1:1' },
  { id: 'Facebook', icon: '👥', defaultRatio: '16:9' },
];

const FONT_COLORS = [
  { name: 'Studio Orange', hex: '#f97316' },
  { name: 'Cyber Blue', hex: '#22d3ee' },
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Luxury Gold', hex: '#fbbf24' },
  { name: 'Acid Green', hex: '#84cc16' },
];

// Predefined fonts that Gemini handles well
const PRESET_FONTS = [
  { id: 'Impact', name: 'Impact', label: 'Bold / Viral', style: 'font-sans' },
  { id: 'Padauk', name: 'Padauk', label: 'Myanmar Round', style: 'font-myanmar' },
  { id: 'Arial Black', name: 'Arial Black', label: 'Heavy Sans', style: 'font-sans font-black' },
  { id: 'Brush Script MT', name: 'Brush Script', label: 'Handwritten', style: 'italic' },
  { id: 'Courier New', name: 'Courier', label: 'Typewriter', style: 'font-mono' },
  { id: 'custom', name: 'Custom', label: 'Type Name...', style: 'border-dashed border-2' },
];

const getTranslatedStyle = (id: string, lang: Language) => {
  if (lang === Language.EN) {
    const en: Record<string, string> = { vlog: 'Vlog & Viral', cinematic: 'Cinematic', '3d': '3D Render', minimal: 'Minimalist' };
    return en[id];
  }
  const mm: Record<string, string> = { vlog: 'ဗလော့ဂ် ပုံစံ', cinematic: 'ရုပ်ရှင် ပုံစံ', '3d': 'သရီးဒီ ပုံစံ', minimal: 'ရိုးရှင်း ပုံစံ' };
  return mm[id];
};

interface ImageAsset {
  data: string;
  mimeType: string;
  previewUrl: string;
}

const ThumbnailSection: React.FC<{ language: Language }> = ({ language }) => {
  const t = UI_STRINGS[language];
  const [subject, setSubject] = useState('');
  const [headline, setHeadline] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState(PLATFORMS[0].id);
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0].id);
  const [selectedRatio, setSelectedRatio] = useState(RATIOS[0].id);
  
  // Typography State
  const [selectedFont, setSelectedFont] = useState(PRESET_FONTS[0].id);
  const [customFontName, setCustomFontName] = useState('');
  const [textColor, setTextColor] = useState(FONT_COLORS[0].hex);
  const [styleRefs, setStyleRefs] = useState<ImageAsset[]>([]);
  
  const [keyAssets, setKeyAssets] = useState<ImageAsset[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const keyInputRef = useRef<HTMLInputElement>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);

  const statusMessages = language === Language.MM ? [
    "ဒြပ်စင်များကို စစ်ဆေးနေသည်...",
    "အရည်အသွေးမြင့် အသွင်အပြင်များ ညှိနေသည်...",
    "အလင်းအမှောင်များကို ပေါင်းစပ်နေသည်...",
    "အဓိကအချက်အလက်များကို နေရာချနေသည်...",
    "နောက်ဆုံးအဆင့် အရောင်ညှိနေသည်...",
    "ပုံကို အကောင်းဆုံးဖြစ်အောင် လုပ်ဆောင်နေသည်..."
  ] : [
    "Analyzing visual elements...",
    "Matching high-fidelity textures...",
    "Blending lighting layers...",
    "Positioning key subjects...",
    "Applying studio grading...",
    "Optimizing final output..."
  ];

  useEffect(() => {
    let interval: number;
    if (isGenerating) {
      interval = window.setInterval(() => {
        setStatus(statusMessages[Math.floor(Math.random() * statusMessages.length)]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isGenerating, statusMessages]);

  const handlePlatformSelect = (pId: string) => {
    setSelectedPlatform(pId);
    const plat = PLATFORMS.find(p => p.id === pId);
    if (plat) setSelectedRatio(plat.defaultRatio);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, isStyleRef = false) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newAssets: ImageAsset[] = [];
      for (let i = 0; i < files.length; i++) {
        try {
          const { data, mimeType } = await optimizeImage(files[i]);
          newAssets.push({ data, mimeType, previewUrl: URL.createObjectURL(files[i]) });
        } catch (err) { console.error(err); }
      }
      if (isStyleRef) {
        setStyleRefs(prev => [...prev, ...newAssets]);
      } else {
        setKeyAssets(prev => [...prev, ...newAssets]);
      }
    }
  };

  const removeAsset = (index: number, isStyleRef = false) => {
    if (isStyleRef) {
      URL.revokeObjectURL(styleRefs[index].previewUrl);
      setStyleRefs(prev => prev.filter((_, i) => i !== index));
    } else {
      URL.revokeObjectURL(keyAssets[index].previewUrl);
      setKeyAssets(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleGenerate = async () => {
    if (!subject.trim()) { setError(language === Language.MM ? "သင့်အိုင်ဒီယာကို အရင်ရေးပေးပါ။" : "Please describe your idea first."); return; }
    setIsGenerating(true); 
    setError(null); 
    setStatus(language === Language.MM ? 'စတူဒီယို အင်ဂျင်ကို ပြင်ဆင်နေသည်...' : 'Initializing Studio Engine...');
    
    try {
      const allAssets = keyAssets.map(a => ({ data: a.data, mimeType: a.mimeType }));
      const allStyleRefs = styleRefs.map(a => ({ data: a.data, mimeType: a.mimeType }));
      
      // Determine the actual font name to send to AI
      let fontVibeToUse = '';
      if (selectedFont === 'custom') {
          fontVibeToUse = customFontName.trim() || 'Bold Modern Sans Serif';
      } else {
          const preset = PRESET_FONTS.find(f => f.id === selectedFont);
          fontVibeToUse = preset ? preset.name : 'Impact';
      }

      const imageUrl = await generateThumbnail(
        subject, 
        headline, 
        selectedStyle, 
        allAssets, 
        selectedRatio,
        {
          fontVibe: fontVibeToUse,
          textColor,
          styleRefs: allStyleRefs
        },
        selectedPlatform
      );
      setResultImage(imageUrl);
    } catch (err: any) {
      setError(err.message || "Studio Error: Generation failed.");
    } finally { 
      setIsGenerating(false); 
      setStatus(''); 
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="h-full flex flex-col pb-24 md:pb-12"
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8 items-start">
        <motion.div variants={itemVariants} className="xl:col-span-5 space-y-4 md:space-y-6 max-h-none xl:max-h-[85vh] xl:overflow-y-auto pr-0 xl:pr-2 custom-scrollbar order-2 xl:order-1">
          
          {/* Target & Layout Section */}
          <div className="bg-white dark:bg-dark-900 border border-black/5 dark:border-white/5 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-xl space-y-6 md:space-y-8 backdrop-blur-xl transition-colors">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">{t.thumbnail.platform}</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PLATFORMS.map(p => (
                  <button 
                    key={p.id} 
                    onClick={() => handlePlatformSelect(p.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${selectedPlatform === p.id ? 'bg-brand-500 border-brand-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-dark-950 border-black/5 dark:border-white/5 text-slate-500 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    <span className="text-xl">{p.icon}</span>
                    <span className="text-[8px] font-black uppercase tracking-tighter">{p.id}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">{t.thumbnail.ratio}</label>
              <div className="grid grid-cols-3 gap-2">
                {RATIOS.map(r => (
                  <button 
                    key={r.id} 
                    onClick={() => setSelectedRatio(r.id)}
                    className={`flex items-center justify-center gap-2 md:gap-3 p-3 md:p-4 rounded-2xl border transition-all ${selectedRatio === r.id ? 'bg-brand-500 border-brand-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-dark-950 border-black/5 dark:border-white/5 text-slate-500 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    <span className="text-lg md:text-xl">{r.icon}</span>
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">{r.id}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Visual Concept */}
          <div className="bg-white dark:bg-dark-900 border border-black/5 dark:border-white/5 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-xl space-y-6 md:space-y-8 backdrop-blur-xl transition-colors">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400 transition-colors">{t.thumbnail.concept}</label>
              <textarea value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t.thumbnail.conceptPlaceholder} className="w-full bg-slate-50 dark:bg-dark-950/50 p-5 md:p-6 rounded-2xl text-sm text-slate-900 dark:text-white border border-black/5 dark:border-white/10 focus:border-brand-500 outline-none resize-none transition-all h-24 md:h-28 shadow-inner" />
            </div>
            
            <div className="space-y-2">
               <label className="text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase flex justify-between transition-colors">{t.thumbnail.assets} <button onClick={() => keyInputRef.current?.click()} className="text-brand-600 dark:text-brand-400 hover:text-brand-500 dark:hover:text-brand-300 transition-colors">{t.thumbnail.addAsset}</button></label>
               <div className="bg-slate-50 dark:bg-dark-950 border border-dashed border-black/10 dark:border-white/10 rounded-xl p-4 min-h-[100px] flex flex-wrap gap-3 transition-colors">
                  {keyAssets.length === 0 ? (
                    <div className="w-full flex flex-col items-center justify-center py-4 opacity-40">
                       <svg className="w-8 h-8 mb-2 text-slate-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" /></svg>
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500">{t.thumbnail.noAssets}</span>
                    </div>
                  ) : (
                    keyAssets.map((a, i) => (
                      <div key={i} className="relative w-16 h-16 group">
                        <img src={a.previewUrl} className="w-full h-full object-cover rounded-lg border border-black/5 dark:border-white/10" />
                        <button onClick={() => removeAsset(i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">×</button>
                      </div>
                    ))
                  )}
               </div>
               <input type="file" ref={keyInputRef} onChange={(e) => handleUpload(e)} hidden multiple accept="image/*" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STYLES.map(s => (
                <button key={s.id} onClick={() => setSelectedStyle(s.id)} className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedStyle === s.id ? 'bg-brand-500 border-brand-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-dark-950 border-black/5 dark:border-white/5 text-slate-500 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800'}`}>
                  <span className="text-xl">{s.icon}</span>
                  <div className="flex flex-col transition-colors"><span className="text-[10px] font-black uppercase tracking-tight">{getTranslatedStyle(s.id, language)}</span></div>
                </button>
              ))}
            </div>
          </div>

          {/* Typography Studio */}
          <div className="bg-white dark:bg-dark-900 border border-black/5 dark:border-white/5 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-xl space-y-6 md:space-y-8 backdrop-blur-xl transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
            
            <div className="flex items-center gap-4 mb-2">
               <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
               </div>
               <h3 className="text-lg font-black italic text-slate-900 dark:text-white tracking-tight">{t.thumbnail.typography}</h3>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400 transition-colors">{t.thumbnail.headline}</label>
              <input type="text" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder={t.thumbnail.headlinePlaceholder} className="w-full bg-slate-50 dark:bg-dark-950/50 p-5 md:p-6 rounded-2xl text-lg md:text-xl font-black text-slate-900 dark:text-white border border-black/5 dark:border-white/10 focus:border-brand-500 outline-none transition-all shadow-inner" />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-gray-500 transition-colors">{t.thumbnail.fontVibe}</label>
              
              <div className="grid grid-cols-2 gap-2">
                 {PRESET_FONTS.map(font => (
                   <button 
                     key={font.id}
                     onClick={() => setSelectedFont(font.id)}
                     className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${selectedFont === font.id ? 'bg-brand-500 border-brand-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-dark-950 border-black/5 dark:border-white/5 text-slate-500 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white'}`}
                   >
                     <span className={`text-base leading-none ${font.style}`}>{font.name}</span>
                     <span className={`text-[9px] font-black uppercase tracking-wider ${selectedFont === font.id ? 'text-white/70' : 'text-slate-300 dark:text-gray-600'}`}>{font.label}</span>
                   </button>
                 ))}
              </div>

              {/* Custom Font Input Field - Only shows if 'custom' is selected */}
              <AnimatePresence>
                {selectedFont === 'custom' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pt-2">
                     <input 
                       type="text" 
                       value={customFontName} 
                       onChange={(e) => setCustomFontName(e.target.value)} 
                       placeholder={language === Language.MM ? "ဖောင့်နာမည် ရိုက်ထည့်ပါ (ဥပမာ - Pyidaungsu)" : "Enter Font Name (e.g. Comic Sans)"}
                       className="w-full bg-brand-50 dark:bg-brand-500/10 p-4 rounded-xl text-sm font-bold text-brand-600 dark:text-brand-400 border border-brand-500/30 focus:border-brand-500 outline-none placeholder:text-brand-500/40"
                       autoFocus
                     />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-3">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-gray-500 transition-colors">{t.thumbnail.textColor}</label>
               <div className="flex gap-3 flex-wrap">
                  {FONT_COLORS.map(c => (
                    <button 
                      key={c.hex} 
                      onClick={() => setTextColor(c.hex)}
                      title={c.name}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${textColor === c.hex ? 'border-brand-500 scale-125 shadow-lg' : 'border-transparent shadow-sm'}`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase flex justify-between transition-colors">{t.thumbnail.styleRef} <button onClick={() => styleInputRef.current?.click()} className="text-brand-600 dark:text-brand-400 hover:text-brand-500 dark:hover:text-brand-300 transition-colors">{t.thumbnail.addAsset}</button></label>
               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest -mt-1">{t.thumbnail.styleRefDesc}</p>
               <div className="bg-slate-50 dark:bg-dark-950 border border-dashed border-black/10 dark:border-white/10 rounded-xl p-4 min-h-[100px] flex flex-wrap gap-3 transition-colors">
                  {styleRefs.length === 0 ? (
                    <div className="w-full flex flex-col items-center justify-center py-4 opacity-40">
                       <svg className="w-8 h-8 mb-2 text-slate-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    </div>
                  ) : (
                    styleRefs.map((a, i) => (
                      <div key={i} className="relative w-16 h-16 group">
                        <img src={a.previewUrl} className="w-full h-full object-cover rounded-lg border border-black/5 dark:border-white/10" />
                        <button onClick={() => removeAsset(i, true)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">×</button>
                      </div>
                    ))
                  )}
               </div>
               <input type="file" ref={styleInputRef} onChange={(e) => handleUpload(e, true)} hidden multiple accept="image/*" />
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            disabled={isGenerating || !subject.trim()} 
            onClick={handleGenerate} 
            className="w-full py-6 bg-brand-500 hover:bg-brand-400 text-white rounded-[2rem] font-black text-xl tracking-widest shadow-2xl transition-all uppercase italic shadow-brand-500/20"
          >
            {isGenerating ? <div className="flex items-center justify-center gap-3"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t.thumbnail.designing}</div> : t.thumbnail.generate}
          </motion.button>
        </motion.div>

        <motion.div variants={itemVariants} className="xl:col-span-7 order-1 xl:order-2">
          <div className="bg-slate-200 dark:bg-black/40 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl border border-black/5 dark:border-white/5 flex flex-col items-center justify-center relative min-h-[400px] md:min-h-[600px] p-6 md:p-8 backdrop-blur-md transition-colors">
             <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-4">
                     <div className="w-20 h-20 md:w-24 md:h-24 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_20px_rgba(249,115,22,0.4)]" />
                     <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white italic uppercase transition-colors tracking-tight">{status}</p>
                  </motion.div>
                ) : resultImage ? (
                  <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 md:gap-8 w-full">
                     <div className="relative group/result w-full">
                        <img src={resultImage} className="w-full rounded-[2rem] md:rounded-[2.5rem] border-4 border-white/10 dark:border-white/10 shadow-2xl" />
                        <div className="absolute inset-0 bg-brand-500/10 opacity-0 group-hover/result:opacity-100 transition-opacity pointer-events-none rounded-[2rem] md:rounded-[2.5rem]" />
                     </div>
                     <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <button onClick={() => { const l = document.createElement('a'); l.href = resultImage; l.download='thumbnail.png'; l.click(); }} className="flex-1 sm:flex-none bg-slate-900 dark:bg-white text-white dark:text-black px-8 md:px-12 py-4 md:py-5 rounded-full font-black uppercase text-xs md:text-sm shadow-xl hover:bg-brand-500 dark:hover:bg-brand-500 dark:hover:text-white transition-all italic whitespace-nowrap">{t.thumbnail.downloadPng}</button>
                        <button onClick={() => { setResultImage(null); setKeyAssets([]); setStyleRefs([]); }} className="flex-1 sm:flex-none bg-white dark:bg-dark-800 text-slate-400 dark:text-gray-400 px-8 md:px-10 py-4 md:py-5 rounded-full font-black uppercase text-xs md:text-sm shadow-sm hover:text-slate-900 dark:hover:text-white transition-all whitespace-nowrap">{t.common.newProject}</button>
                     </div>
                  </motion.div>
                ) : (
                  <div className="text-center opacity-20 transition-opacity flex flex-col items-center gap-6">
                    <svg className="w-24 h-24 md:w-32 md:h-32 text-slate-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" /></svg>
                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-gray-600">Studio Ready</span>
                  </div>
                )}
             </AnimatePresence>
          </div>
        </motion.div>
      </div>
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 md:px-10 py-4 md:py-5 rounded-full font-black uppercase text-[10px] md:text-xs shadow-2xl z-50 tracking-widest w-[90%] md:w-auto text-center"
        >
          {error}
        </motion.div>
      )}
    </motion.div>
  );
};

export default ThumbnailSection;
