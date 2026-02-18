import React, { useState } from 'react';
import { AppMode, Language } from '../types';
import { UI_STRINGS } from '../constants/translations';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
  hasApiKey: boolean;
  onSelectKey: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const modeIcons: Record<AppMode, React.ReactNode> = {
  [AppMode.VIDEO_DUB]: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
  [AppMode.SUB_STUDIO]: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  [AppMode.INSTANT_TTS]: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
  [AppMode.THUMBNAIL_MAKER]: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  [AppMode.TRANSCRIBE]: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002-2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  [AppMode.SOCIAL_GEN]: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
};

const NavItem: React.FC<{ mode: AppMode; label: string; icon: React.ReactNode; currentMode: AppMode; setMode: (m: AppMode) => void; onClick?: () => void }> = ({ mode, label, icon, currentMode, setMode, onClick }) => (
  <button 
    onClick={() => { setMode(mode); onClick?.(); }}
    className={`w-full flex items-center gap-3.5 px-5 py-4 rounded-xl text-[14px] md:text-[16px] font-black transition-all ${
      currentMode === mode 
      ? 'bg-brand-500 text-white shadow-lg' 
      : 'text-slate-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
    }`}
  >
    <span className={currentMode === mode ? 'text-white' : 'text-brand-500/80 dark:text-brand-400'}>{icon}</span>
    <span className="truncate">{label}</span>
  </button>
);

const Layout: React.FC<LayoutProps> = ({ children, currentMode, setMode, hasApiKey, onSelectKey, isDarkMode, toggleTheme, language, setLanguage }) => {
  const t = UI_STRINGS[language];
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen transition-colors duration-300 flex overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)]">
      
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Responsive */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-[280px] lg:w-[320px] bg-[var(--bg-surface)] border-r border-slate-200 dark:border-white/10 
        flex flex-col shrink-0 transition-transform duration-500 ease-in-out lg:translate-x-0 shadow-2xl lg:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 md:p-8 flex items-center justify-between gap-3.5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-brand-500 flex items-center justify-center text-white font-black text-xl md:text-2xl shadow-lg shrink-0">J</div>
            <span className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 dark:text-white italic">Jupiter</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-slate-500">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          <p className="px-5 text-[11px] md:text-[13px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-gray-500 mb-4">{t.common.mainMenu}</p>
          {Object.entries(AppMode).map(([key, m]) => (
            <NavItem 
              key={m} 
              mode={m as AppMode} 
              label={t.modes[m as AppMode]} 
              icon={modeIcons[m as AppMode]} 
              currentMode={currentMode} 
              setMode={setMode} 
              onClick={() => setIsMobileMenuOpen(false)}
            />
          ))}
        </nav>

        <div className="p-6 space-y-4">
           <div className="p-6 bg-brand-500/5 rounded-2xl border border-brand-500/10">
              <p className="text-[10px] md:text-[12px] font-black uppercase text-brand-600 dark:text-brand-400 mb-3 tracking-widest">{t.common.status}</p>
              <div className="flex items-center gap-3">
                 <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                 <span className="text-[12px] md:text-[14px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{t.common.systemReady}</span>
              </div>
           </div>
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto relative z-10 custom-scrollbar flex flex-col w-full">
        {/* Header */}
        <header className="px-4 md:px-8 border-b border-slate-200 dark:border-white/10 bg-[var(--bg-surface)] backdrop-blur-3xl sticky top-0 z-30 flex items-center justify-between h-16 md:h-20 transition-colors">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-600 dark:text-gray-300">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div>
              <h1 className="text-base md:text-xl font-black uppercase tracking-widest text-slate-900 dark:text-white italic truncate max-w-[150px] md:max-w-none">{t.modes[currentMode]}</h1>
              <p className="hidden md:block text-[12px] text-slate-500 dark:text-gray-500 font-black uppercase tracking-[0.15em]">Jupiter Studio Pro</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-6">
            {/* Language Switcher - Compact on mobile */}
            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-full border border-slate-200 dark:border-white/10">
              <button 
                onClick={() => setLanguage(Language.EN)}
                className={`px-3 md:px-5 py-1.5 md:py-2.5 rounded-full text-[11px] md:text-[13px] font-black transition-all ${
                  language === Language.EN ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                EN
              </button>
              <button 
                onClick={() => setLanguage(Language.MM)}
                className={`px-3 md:px-5 py-1.5 md:py-2.5 rounded-full text-[11px] md:text-[13px] font-black transition-all ${
                  language === Language.MM ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                MM
              </button>
            </div>

            {/* Theme Toggle */}
            <div className="hidden sm:flex bg-slate-100 dark:bg-white/5 p-1 rounded-full border border-slate-200 dark:border-white/10">
               <button 
                onClick={() => !isDarkMode && toggleTheme()}
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all ${
                  isDarkMode ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                }`}
               >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
               </button>
               <button 
                onClick={() => isDarkMode && toggleTheme()}
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all ${
                  !isDarkMode ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
               >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
               </button>
            </div>

            {!hasApiKey ? (
              <button onClick={onSelectKey} className="px-4 py-2 md:px-6 md:py-3 bg-slate-900 dark:bg-white text-white dark:text-black text-[10px] md:text-[13px] font-black uppercase tracking-widest rounded-xl hover:bg-brand-500 transition-all shadow-xl whitespace-nowrap">{t.common.configureApi}</button>
            ) : (
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 border border-brand-500/20">
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
            )}
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-10 flex-1 bg-[var(--bg-main)]">
          <AnimatePresence mode="wait">
            <motion.div key={currentMode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-[1600px] mx-auto w-full">
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Layout;