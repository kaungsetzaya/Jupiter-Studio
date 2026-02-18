
import React, { useEffect, useRef, useState } from 'react';
import { SubtitleSegment, Language, SyncMapping } from '../types';
import { UI_STRINGS } from '../constants/translations';
import { generateSRT } from '../utils/srtGenerator';
import { AudioProcessor } from '../utils/audioProcessor';
import { motion, AnimatePresence } from 'framer-motion';

interface ResultSectionProps {
  originalVideoUrl: string | null;
  generatedAudioUrl: string | null;
  generatedAudioBuffer: AudioBuffer | null;
  segments: SubtitleSegment[];
  fileType?: string;
  videoDuration: number;
  language: Language;
  syncData?: SyncMapping[];
}

const ResultSection: React.FC<ResultSectionProps> = ({ 
  originalVideoUrl, 
  generatedAudioUrl: initialAudioUrl, 
  generatedAudioBuffer,
  segments, 
  fileType,
  videoDuration,
  language,
  syncData
}) => {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const dubbedAudioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = UI_STRINGS[language];
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(initialAudioUrl);
  const [audioDuration, setAudioDuration] = useState(generatedAudioBuffer?.duration || 0);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);

  const isAudioFile = fileType?.startsWith('audio/');

  // Sync state if initialAudioUrl changes
  useEffect(() => {
    if (initialAudioUrl) {
      setCurrentAudioUrl(initialAudioUrl);
      if (generatedAudioBuffer) {
        setAudioDuration(generatedAudioBuffer.duration);
      }
    }
  }, [initialAudioUrl, generatedAudioBuffer]);

  // Main Playback Sync Logic
  useEffect(() => {
    const video = mediaRef.current as HTMLVideoElement;
    const audio = dubbedAudioRef.current;
    if (!video || !audio) return;

    if (isAudioFile) {
        const sync = () => { if(!video.paused) audio.currentTime = video.currentTime; };
        video.addEventListener('timeupdate', sync);
        video.addEventListener('play', () => audio.play());
        video.addEventListener('pause', () => audio.pause());
        return () => { video.removeEventListener('timeupdate', sync); };
    }

    if (!syncData || syncData.length === 0) {
        // Fallback: Default Overlay behavior
        const handlePlay = () => { audio.play().catch(e => console.log(e)); setIsPlaying(true); };
        const handlePause = () => { audio.pause(); setIsPlaying(false); };
        const handleSeek = () => { audio.currentTime = video.currentTime; };
        const handleEnded = () => { setIsPlaying(false); };

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('seeking', handleSeek);
        video.addEventListener('ended', handleEnded);
        video.muted = true;

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('seeking', handleSeek);
            video.removeEventListener('ended', handleEnded);
        };
    } else {
        // --- SMART VIDEO SYNC (Variable Frame Rate) ---
        // Audio is the MASTER. Video is the SLAVE.
        video.muted = true;
        
        const handleAudioPlay = () => {
            video.play().catch(e => console.log(e));
            setIsPlaying(true);
        };
        const handleAudioPause = () => {
            video.pause();
            setIsPlaying(false);
        };
        const handleAudioEnded = () => {
            setIsPlaying(false);
            video.pause();
        };

        const updateVideoSync = () => {
            const t = audio.currentTime;
            
            // 1. Find the current mapping segment based on AUDIO time
            // Use <= for audioEnd to catch the exact end frame
            const currentSeg = syncData.find(s => t >= s.audioStart && t <= s.audioEnd);

            if (currentSeg) {
                // Calculate where we are inside this audio segment (0.0 to 1.0)
                const segDuration = currentSeg.audioEnd - currentSeg.audioStart;
                const segProgress = segDuration > 0 ? (t - currentSeg.audioStart) / segDuration : 0;
                
                // Calculate where the video SHOULD be
                const targetVideoTime = currentSeg.videoStart + (segProgress * (currentSeg.videoEnd - currentSeg.videoStart));
                
                video.playbackRate = currentSeg.playbackRate;

                // Drift Correction: If video desyncs by > 0.2s, snap it back
                if (Math.abs(video.currentTime - targetVideoTime) > 0.2) {
                    video.currentTime = targetVideoTime;
                }
                
                if(video.paused && !audio.paused && !audio.ended) video.play();

            } else {
                // We are at the end or in an undefined zone
                if (audio.ended || t >= audio.duration) {
                     video.pause();
                }
            }
        };

        const interval = setInterval(updateVideoSync, 30); // 30ms check interval

        audio.addEventListener('play', handleAudioPlay);
        audio.addEventListener('pause', handleAudioPause);
        audio.addEventListener('ended', handleAudioEnded);
        audio.addEventListener('seeking', updateVideoSync);

        return () => {
            clearInterval(interval);
            audio.removeEventListener('play', handleAudioPlay);
            audio.removeEventListener('pause', handleAudioPause);
            audio.removeEventListener('ended', handleAudioEnded);
            audio.removeEventListener('seeking', updateVideoSync);
        };
    }
  }, [currentAudioUrl, syncData, isAudioFile]);

  // RENDER VIDEO LOGIC (Canvas Recording)
  const renderAndDownloadVideo = async () => {
    const video = mediaRef.current as HTMLVideoElement;
    const audio = dubbedAudioRef.current;
    if (!video || !audio || !currentAudioUrl || !syncData) return;

    setIsRendering(true);
    setRenderProgress(0);

    // Setup Canvas
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Setup Audio Stream
    audio.currentTime = 0;
    video.currentTime = syncData[0].videoStart;
    video.playbackRate = syncData[0].playbackRate;
    
    // Create MediaStreamDestination to mix
    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();
    const source = audioCtx.createMediaElementSource(audio);
    source.connect(dest);
    source.connect(audioCtx.destination); 

    // Canvas Stream
    const canvasStream = canvas.captureStream(30); 
    
    // Add Audio Track to Canvas Stream
    const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
    ]);

    const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9'
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    
    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dubbed_video_${Date.now()}.webm`;
        a.click();
        setIsRendering(false);
        // Cleanup
        source.disconnect();
        audioCtx.close();
    };

    mediaRecorder.start();
    
    try {
        await audio.play();
    } catch(e) {
        console.error("Autoplay failed needed for recording", e);
        alert("Please interact with the page first.");
        setIsRendering(false);
        return;
    }

    const drawFrame = () => {
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        if (audioDuration > 0) {
            setRenderProgress(Math.round((audio.currentTime / audioDuration) * 100));
        }

        if (!audio.paused && !audio.ended) {
            requestAnimationFrame(drawFrame);
        } else {
             mediaRecorder.stop();
        }
    };
    
    drawFrame();
  };

  const downloadAudio = () => {
    if (!currentAudioUrl) return;
    const a = document.createElement('a');
    a.href = currentAudioUrl;
    a.download = `jupiter_dub.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadSRT = () => {
    const srtContent = generateSRT(segments);
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtitles.srt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1500px] mx-auto pb-20 px-2 md:px-6">
      <div className="text-center mb-8 md:mb-12">
        <h2 className="text-6xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter italic">
          {language === Language.MM ? "ရလဒ် စစ်ဆေးရန်" : "Studio Result"}
        </h2>
        <p className="text-slate-400 dark:text-gray-400 font-medium uppercase text-[12px] tracking-[0.25em]">{language === Language.MM ? "နောက်ဆုံးအဆင့် ဗီဒီယိုနှင့် အသံကို စစ်ဆေးပါ" : "Final Polish & High-Fidelity Export"}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="bg-black rounded-[3rem] overflow-hidden shadow-2xl border border-black/10 dark:border-white/5 relative group min-h-[450px] flex items-center justify-center transition-colors">
             {originalVideoUrl && !isAudioFile && (
               <video 
                 ref={mediaRef as React.RefObject<HTMLVideoElement>}
                 src={originalVideoUrl} 
                 className="w-full h-auto max-h-[650px] aspect-video object-contain"
                 controls={false}
                 crossOrigin="anonymous" // Required for canvas recording if CORS allows
               />
             )}
             
             {originalVideoUrl && isAudioFile && (
               <div className="flex flex-col items-center gap-10 p-24 w-full bg-slate-900 dark:bg-dark-950">
                  <motion.div 
                    animate={{ scale: isPlaying ? [1, 1.15, 1] : 1 }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-40 h-40 bg-brand-500/10 rounded-full flex items-center justify-center text-brand-400"
                  >
                     <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                     </svg>
                  </motion.div>
               </div>
             )}
             
             {/* Main Control Layer */}
             {!isRendering && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity z-20 pointer-events-none">
                   <button 
                     onClick={() => {
                         const audio = dubbedAudioRef.current;
                         if (audio) {
                             if (audio.paused) audio.play();
                             else audio.pause();
                         }
                     }}
                     className="w-20 h-20 bg-brand-500/90 rounded-full flex items-center justify-center text-white backdrop-blur-sm shadow-xl hover:scale-110 transition-transform pointer-events-auto"
                   >
                      {isPlaying ? (
                         <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12"/></svg>
                      ) : (
                         <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      )}
                   </button>
               </div>
             )}

             {/* Rendering Overlay */}
             <AnimatePresence>
               {isRendering && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center">
                    <div className="w-24 h-24 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                    <h3 className="text-white text-xl font-black uppercase tracking-widest animate-pulse">{language === Language.MM ? "ဗီဒီယို ထုတ်ယူနေသည်..." : "Rendering Video..."}</h3>
                    <p className="text-brand-500 font-bold mt-2">{renderProgress}%</p>
                    <p className="text-white/50 text-xs mt-4 max-w-xs text-center">Do not close this tab. The video is playing to capture frames.</p>
                 </motion.div>
               )}
             </AnimatePresence>

             {/* Audio Player is the MASTER */}
             {currentAudioUrl && (
               <div className="absolute bottom-6 left-6 right-6 z-30 opacity-0 pointer-events-none">
                   <audio 
                     ref={dubbedAudioRef} 
                     src={currentAudioUrl} 
                     controls={false}
                     crossOrigin="anonymous"
                   />
               </div>
             )}
             
             <div className="absolute top-8 left-8 bg-brand-500 text-white text-[12px] font-black uppercase px-6 py-2 rounded-full shadow-lg z-10 tracking-widest">
                {language === Language.MM ? "Natural Voice Sync" : "Natural Voice Sync"}
             </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-dark-900 border border-black/5 dark:border-white/5 rounded-[3rem] p-10 shadow-xl overflow-hidden relative transition-colors"
          >
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                   <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{language === Language.MM ? "အသံချိန်ညှိမှု ကဏ္ဍ" : "Synchronization Lab"}</h3>
                   <p className="text-[12px] text-slate-400 dark:text-gray-500 font-black uppercase tracking-widest">{language === Language.MM ? "မူရင်းအသံနှင့် ကိုက်ညီအောင် ဗီဒီယိုကို ချိန်ညှိထားသည်" : "Video adapts to natural voice speed"}</p>
                </div>
                <div className="flex items-center gap-5 bg-slate-50 dark:bg-dark-800/50 p-4 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm transition-colors">
                   <div className="text-right">
                      <p className="text-[11px] text-slate-400 dark:text-gray-500 font-black uppercase leading-none mb-2 tracking-tighter">{language === Language.MM ? "မူရင်းဗီဒီယို" : "Video Source"}</p>
                      <p className="text-lg font-black text-slate-700 dark:text-white">{videoDuration.toFixed(2)}s</p>
                   </div>
                   <div className="w-px h-10 bg-slate-200 dark:bg-white/10 mx-3"></div>
                   <div className="text-right">
                      <p className="text-[11px] text-brand-500 dark:text-brand-400 font-black uppercase leading-none mb-2 tracking-tighter">{language === Language.MM ? "ရလဒ်ကြာချိန်" : "Result Duration"}</p>
                      <p className="text-lg font-black text-green-500 dark:text-green-400">
                        {audioDuration.toFixed(2)}s
                      </p>
                   </div>
                </div>
             </div>
          </motion.div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-dark-900 border border-black/5 dark:border-white/5 rounded-[2.5rem] p-8 shadow-2xl transition-colors">
             <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 italic">{language === Language.MM ? "ထုတ်ယူရန်" : "Exports"}</h3>
             <div className="space-y-4">
                {/* VIDEO RENDER BUTTON */}
                <button 
                  onClick={renderAndDownloadVideo}
                  disabled={isRendering}
                  className="w-full py-5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center justify-center gap-3 transition-all"
                >
                   {isRendering ? (
                       <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                   ) : (
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                   )}
                   {language === Language.MM ? "ဗီဒီယိုဖိုင် ဒေါင်းလုဒ် (MP4/WebM)" : "Render & Download Video"}
                </button>

                <button onClick={downloadAudio} className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-700 dark:hover:bg-slate-200 transition-all shadow-lg flex items-center justify-center gap-3">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                   {language === Language.MM ? "အသံဖိုင် သက်သက် (WAV)" : "Audio Only (WAV)"}
                </button>
                <button onClick={downloadSRT} className="w-full py-5 bg-white dark:bg-dark-800 text-slate-900 dark:text-white border border-black/5 dark:border-white/5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 dark:hover:bg-dark-700 transition-all shadow-sm flex items-center justify-center gap-3">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                   {language === Language.MM ? "စာတန်းထိုး (SRT)" : "Subtitles (SRT)"}
                </button>
             </div>
          </div>

          <div className="bg-brand-500 p-8 rounded-[2.5rem] text-white shadow-xl shadow-brand-500/20 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
             <h3 className="text-2xl font-black italic mb-2 tracking-tighter relative z-10">{language === Language.MM ? "နောက်ထပ် ဖန်တီးမလား?" : "Create Another?"}</h3>
             <p className="text-white/80 text-xs font-medium leading-relaxed mb-8 relative z-10">{language === Language.MM ? "နောက်ထပ် ဗီဒီယိုတစ်ခု ထပ်လုပ်ရန် အောက်ပါခလုတ်ကို နှိပ်ပါ" : "Start a new dubbing project with a fresh video."}</p>
             <button onClick={() => window.location.reload()} className="w-full py-4 bg-white text-brand-600 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-brand-50 transition-all relative z-10">
                {t.common.newProject}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultSection;
