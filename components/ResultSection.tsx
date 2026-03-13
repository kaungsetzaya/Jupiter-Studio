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
  const mediaRef = useRef<HTMLVideoElement>(null);
  const dubbedAudioRef = useRef<HTMLAudioElement>(null);
  const t = UI_STRINGS[language];
  
  // Overlay/Blur State
  const [isBlurActive, setIsBlurActive] = useState(true);
  const [blurAmount, setBlurAmount] = useState(16);
  const [fontSize, setFontSize] = useState(24);
  const [boxState, setBoxState] = useState({ x: 10, y: 75, w: 80, h: 15 });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudioUrl] = useState<string | null>(initialAudioUrl);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);

  // Sync Video/Audio
  useEffect(() => {
    const video = mediaRef.current;
    const audio = dubbedAudioRef.current;
    if (!video || !audio || !syncData) return;

    video.muted = true;
    
    const sync = () => {
        const t = audio.currentTime;
        const currentSeg = syncData.find(s => t >= s.audioStart && t <= s.audioEnd);
        if (currentSeg) {
            const segDuration = currentSeg.audioEnd - currentSeg.audioStart;
            const segProgress = segDuration > 0 ? (t - currentSeg.audioStart) / segDuration : 0;
            const targetVideoTime = currentSeg.videoStart + (segProgress * (currentSeg.videoEnd - currentSeg.videoStart));
            
            video.playbackRate = currentSeg.playbackRate;
            if (Math.abs(video.currentTime - targetVideoTime) > 0.2) video.currentTime = targetVideoTime;
            if (video.paused && !audio.paused) video.play();
        }
    };
    
    const interval = setInterval(sync, 30);
    return () => clearInterval(interval);
  }, [syncData]);

  const renderAndDownloadVideo = async () => {
    const video = mediaRef.current;
    const audio = dubbedAudioRef.current;
    if (!video || !audio || !currentAudioUrl || !syncData) return;

    setIsRendering(true);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();
    const source = audioCtx.createMediaElementSource(audio);
    source.connect(dest);
    
    const canvasStream = canvas.captureStream(30);
    const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `dubbed_video_${Date.now()}.webm`; a.click();
        setIsRendering(false);
        audioCtx.close();
    };

    mediaRecorder.start();
    audio.currentTime = 0;
    audio.play();
    video.play();

    const drawFrame = () => {
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Blur
        if (isBlurActive) {
            const x = (boxState.x / 100) * canvas.width;
            const y = (boxState.y / 100) * canvas.height;
            const w = (boxState.w / 100) * canvas.width;
            const h = (boxState.h / 100) * canvas.height;
            ctx.save();
            ctx.filter = `blur(${blurAmount}px)`;
            ctx.fillRect(x, y, w, h);
            ctx.restore();
        }
        
        // Subtitle
        const activeSub = segments.find(s => audio.currentTime >= s.startTime && audio.currentTime <= s.endTime);
        if (activeSub) {
            ctx.fillStyle = "white";
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText(activeSub.translatedText, canvas.width / 2, (boxState.y + boxState.h/2) / 100 * canvas.height);
        }

        setRenderProgress(Math.round((audio.currentTime / audio.duration) * 100));
        if (!audio.paused && !audio.ended) requestAnimationFrame(drawFrame);
        else mediaRecorder.stop();
    };
    drawFrame();
  };

  return (
    <div className="max-w-[1500px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 bg-black p-4 rounded-3xl aspect-video relative">
                <video ref={mediaRef} src={originalVideoUrl || ''} className="w-full h-full object-cover" />
                <audio ref={dubbedAudioRef} src={currentAudioUrl || ''} />
            </div>
            <div className="lg:col-span-4 bg-white dark:bg-dark-900 p-8 rounded-3xl space-y-6">
                <h3 className="text-xl font-black">{language === Language.MM ? "စာတန်းထိုးနှင့် အဝါးချိန်ညှိရန်" : "Subtitle & Blur Settings"}</h3>
                
                {/* Blur Controls */}
                <div className="space-y-4">
                    <div className="flex justify-between text-xs font-black">
                        <label>{language === Language.MM ? "အဝါးအဆင့် (Blur)" : "Blur Power"}</label>
                        <input type="range" min="0" max="40" value={blurAmount} onChange={(e) => setBlurAmount(parseInt(e.target.value))} className="w-32" />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {['x', 'y', 'w', 'h'].map((key) => (
                            <div key={key}>
                                <input 
                                    type="number" 
                                    value={Math.round(boxState[key as keyof typeof boxState])}
                                    onChange={(e) => setBoxState(prev => ({...prev, [key]: parseInt(e.target.value)}))}
                                    className="w-full bg-slate-100 rounded-lg p-2 text-center text-xs"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <button 
                  onClick={renderAndDownloadVideo}
                  className="w-full py-4 bg-brand-500 text-white rounded-xl font-black uppercase tracking-widest"
                >
                    {isRendering ? `${renderProgress}% Rendering...` : "Final Export"}
                </button>
            </div>
        </div>
    </div>
  );
};

export default ResultSection;
