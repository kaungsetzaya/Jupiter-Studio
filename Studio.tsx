import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import StepIndicator from './components/StepIndicator';
import UploadSection from './components/UploadSection';
import EditorSection from './components/EditorSection';
import VoiceConfigSection from './components/VoiceConfigSection';
import ResultSection from './components/ResultSection';
import TTSSection from './components/TTSSection';
import SubStudioSection from './components/SubStudioSection';
import ThumbnailSection from './components/ThumbnailSection';
import SRTGeneratorSection from './components/SRTGeneratorSection';
import SocialGenSection from './components/SocialGenSection';
import ErrorBoundary from './components/ErrorBoundary';
import { AppMode, AppStep, SubtitleSegment, VoiceId, VoiceTone, Language, SyncMapping } from './types';
import { analyzeAndTranslateVideo, generateSegmentAudio, fileToGenerativePart, generateVideoSummary } from './services/geminiService';
import { AudioProcessor } from './utils/audioProcessor';
import { ALL_VOICES } from './constants/voices';
import { UI_STRINGS } from './constants/translations';
import { saveProject, getLatestProject, saveAudio, getAudio } from './utils/db';
import { motion, AnimatePresence } from 'framer-motion';

const Studio: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.VIDEO_DUB);
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UPLOAD);
  const [language, setLanguage] = useState<Language>(Language.MM);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoSummary, setVideoSummary] = useState<string>("");
  const [targetVideoDuration, setTargetVideoDuration] = useState<number>(0);
  const [forceSync, setForceSync] = useState<boolean>(true); // True = Video follows Audio (VFR), False = Audio follows Video (Stretch)
  const [smoothFlow, setSmoothFlow] = useState<boolean>(false);
  const [originalVideoUrl, setOriginalVideoUrl] = useState<string | null>(null);
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [syncData, setSyncData] = useState<SyncMapping[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(ALL_VOICES[0].id); 
  const [selectedTone, setSelectedTone] = useState<VoiceTone>(VoiceTone.NORMAL);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [generatedAudioBuffer, setGeneratedAudioBuffer] = useState<AudioBuffer | null>(null);
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0 });
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const initApp = async () => {
      const savedTheme = localStorage.getItem('jupiter_theme');
      const shouldBeDark = savedTheme !== 'light';
      setIsDarkMode(shouldBeDark);
      if (shouldBeDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');

      const savedLang = localStorage.getItem('jupiter_lang');
      if (savedLang) setLanguage(savedLang as Language);

      // Safe API Key Check
      if ((window as any).aistudio?.hasSelectedApiKey) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        const key = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : (window as any).process?.env?.API_KEY;
        setHasApiKey(!!key);
      }

      // Defer the confirm dialog to allow UI to render first
      setTimeout(async () => {
        const latest = await getLatestProject();
        if (latest && confirm(language === Language.MM ? "အရင်လုပ်လက်စ ပရောဂျက်ကို ပြန်ဖွင့်မလား?" : "Restore your last session?")) {
          setSegments(latest.segments);
          setVideoDuration(latest.videoDuration);
          setVideoSummary(latest.videoSummary || "");
          setTargetVideoDuration(latest.videoDuration);
          setSelectedPersonaId(latest.selectedPersonaId);
          setSelectedTone(latest.selectedTone);
          if(latest.syncData) setSyncData(latest.syncData);
          
          const audioData = await getAudio(`final_${latest.id}`);
          if (audioData) {
              const processor = new AudioProcessor();
              try {
                const buffer = await processor.decodeAudioFile(audioData as ArrayBuffer);
                const blob = processor.bufferToWave(buffer);
                setGeneratedAudioBuffer(buffer);
                setGeneratedAudioUrl(URL.createObjectURL(blob));
                setCurrentStep(AppStep.RESULT);
              } catch (err) {
                setCurrentStep(AppStep.EDITOR);
              }
          } else { 
              setCurrentStep(AppStep.EDITOR); 
          }
        }
      }, 500);
    };
    initApp();
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('jupiter_lang', lang);
  };

  const toggleTheme = () => {
    const nextThemeIsDark = !isDarkMode;
    setIsDarkMode(nextThemeIsDark);
    if (nextThemeIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('jupiter_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('jupiter_theme', 'light');
    }
  };

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  useEffect(() => {
    if (segments.length > 0) {
      saveProject('last_session', { 
        id: 'last_session', 
        segments, 
        videoDuration, 
        videoSummary, 
        selectedPersonaId, 
        selectedTone, 
        syncData, 
        updatedAt: Date.now() 
      });
    }
  }, [segments, videoDuration, videoSummary, selectedPersonaId, selectedTone, syncData]);

  const handleSelectKey = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleFileSelect = async (file: File) => {
    setVideoFile(file);
    if (originalVideoUrl) URL.revokeObjectURL(originalVideoUrl);
    setOriginalVideoUrl(URL.createObjectURL(file));
    
    const tempElement = document.createElement(file.type.startsWith('audio') ? 'audio' : 'video');
    tempElement.src = URL.createObjectURL(file);
    tempElement.onloadedmetadata = () => { 
        setVideoDuration(tempElement.duration || 0); 
        setTargetVideoDuration(tempElement.duration || 0); 
    };

    setIsProcessing(true); 
    setStatusMessage(UI_STRINGS[language].common.analyzing); 
    setCurrentStep(AppStep.ANALYZING);

    try {
      const generativePart = await fileToGenerativePart(file);
      const mimeType = file.type || generativePart.mimeType || 'video/mp4';
      
      const [analyzedSegments, summary] = await Promise.all([
        analyzeAndTranslateVideo(generativePart.data, mimeType),
        generateVideoSummary(generativePart.data, mimeType)
      ]);

      setSegments(analyzedSegments);
      setVideoSummary(summary);
      setIsProcessing(false); 
      setStatusMessage(""); 
      setCurrentStep(AppStep.EDITOR);
    } catch (error: any) {
      alert(UI_STRINGS[language].common.error + ": " + error.message); 
      setIsProcessing(false); 
      setCurrentStep(AppStep.UPLOAD);
    }
  };

  const handleGenerateAudio = async () => {
    if (segments.length === 0) return;
    setIsProcessing(true); 
    setCurrentStep(AppStep.GENERATING); 
    setGenProgress({ current: 0, total: segments.length }); 
    setStatusMessage(language === Language.MM ? "အသံဖန်တီးမှု စတင်နေသည်..." : "Starting voice synthesis...");
    
    const audioProcessor = new AudioProcessor();
    const processedSegments: { buffer: AudioBuffer; startTime: number }[] = [];
    const newSyncData: SyncMapping[] = [];
    const persona = ALL_VOICES.find(v => v.id === selectedPersonaId)!;
    
    try {
      await audioProcessor.resume();
      
      let currentAudioTime = 0;
      let lastVideoEndTime = 0;

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        setGenProgress({ current: i + 1, total: segments.length });
        setStatusMessage(language === Language.MM ? `အသံသွင်းနေသည်: အပိုင်း ${i + 1}/${segments.length}...` : `Recording segment ${i + 1}/${segments.length}...`);
        
        // 1. Handle Gaps (Video Silence)
        const gapDuration = seg.startTime - lastVideoEndTime;
        if (gapDuration > 0.05) {
             const silenceBuf = audioProcessor.createSilence(gapDuration);
             processedSegments.push({ buffer: silenceBuf, startTime: currentAudioTime });
             
             newSyncData.push({
                 segmentId: `gap_${i}`,
                 audioStart: currentAudioTime,
                 audioEnd: currentAudioTime + gapDuration,
                 videoStart: lastVideoEndTime,
                 videoEnd: seg.startTime,
                 playbackRate: 1.0
             });
             
             currentAudioTime += gapDuration;
        }

        // 2. Generate Segment Audio
        let segmentBuffer: AudioBuffer | undefined;
        if (!seg.translatedText || !seg.translatedText.trim()) {
          segmentBuffer = audioProcessor.createSilence(0.1); 
        } else {
          try {
            // Generate NATURAL audio
            const rawAudioBuffer = await generateSegmentAudio(seg.translatedText, persona.apiVoice, selectedTone, (wait) => setCooldown(wait));
            const rawDecoded = audioProcessor.decodePCM(rawAudioBuffer);
            segmentBuffer = await audioProcessor.processSegment(rawDecoded, persona.detune);
          } catch (segError: any) {
            console.error("Segment generation error", segError);
            segmentBuffer = audioProcessor.createSilence(0.1);
          }
        }

        const videoSegDuration = seg.endTime - seg.startTime;
        const audioSegDuration = segmentBuffer.duration;

        // 3. Sync Logic
        if (forceSync) {
            // SMART VIDEO SYNC (VFR):
            // Calculate playback rate. Use max(0.1, duration) to avoid division by zero.
            const safeAudioDuration = Math.max(0.1, audioSegDuration);
            const playbackRate = videoSegDuration / safeAudioDuration;
            
            processedSegments.push({ buffer: segmentBuffer, startTime: currentAudioTime });
            
            newSyncData.push({
                segmentId: seg.id,
                audioStart: currentAudioTime,
                audioEnd: currentAudioTime + audioSegDuration,
                videoStart: seg.startTime,
                videoEnd: seg.endTime,
                playbackRate: playbackRate
            });
            
            currentAudioTime += audioSegDuration;

        } else {
            // CLASSIC MODE (Audio Stretch):
            const stretchedBuffer = await audioProcessor.stretchToFit(segmentBuffer, videoSegDuration);
            
            processedSegments.push({ buffer: stretchedBuffer, startTime: currentAudioTime });
            
            newSyncData.push({
                segmentId: seg.id,
                audioStart: currentAudioTime,
                audioEnd: currentAudioTime + videoSegDuration,
                videoStart: seg.startTime,
                videoEnd: seg.endTime,
                playbackRate: 1.0
            });

            currentAudioTime += videoSegDuration;
        }

        lastVideoEndTime = seg.endTime;
        
        if (i < segments.length - 1) await new Promise(r => setTimeout(r, 50)); 
      }

      // 4. Handle Tail
      if (lastVideoEndTime < videoDuration) {
          const tailDuration = videoDuration - lastVideoEndTime;
          const silence = audioProcessor.createSilence(tailDuration);
          processedSegments.push({ buffer: silence, startTime: currentAudioTime });
          
          newSyncData.push({
              segmentId: 'tail',
              audioStart: currentAudioTime,
              audioEnd: currentAudioTime + tailDuration,
              videoStart: lastVideoEndTime,
              videoEnd: videoDuration,
              playbackRate: 1.0
          });
          
          currentAudioTime += tailDuration;
      }

      setSyncData(newSyncData);

      setStatusMessage(language === Language.MM ? "ဗီဒီယိုနှင့် အသံကို ပေါင်းစပ်နေသည်..." : "Merging audio and video...");
      
      const { blob: finalBlob, buffer: finalBuffer } = await audioProcessor.stitchAudio(processedSegments, currentAudioTime);
      
      const arrayBuffer = await finalBlob.arrayBuffer();
      await saveAudio(`final_last_session`, arrayBuffer);
      
      if (generatedAudioUrl) URL.revokeObjectURL(generatedAudioUrl);
      const newUrl = URL.createObjectURL(finalBlob);
      
      setGeneratedAudioBuffer(finalBuffer); 
      setGeneratedAudioUrl(newUrl); 
      setCurrentStep(AppStep.RESULT);
    } catch (error: any) {
      alert("Error: " + error.message);
      setCurrentStep(AppStep.VOICE_CONFIG); 
    } finally { 
      setIsProcessing(false); 
      setStatusMessage(""); 
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case AppStep.UPLOAD:
      case AppStep.ANALYZING:
        return <motion.div key="upload" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }}><UploadSection onFileSelect={handleFileSelect} isProcessing={isProcessing} statusMessage={statusMessage} language={language} /></motion.div>;
      case AppStep.EDITOR:
        return <motion.div key="editor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }}><EditorSection segments={segments} setSegments={setSegments} onNext={() => setCurrentStep(AppStep.VOICE_CONFIG)} language={language} /></motion.div>;
      case AppStep.VOICE_CONFIG:
      case AppStep.GENERATING:
        return <motion.div key="voice" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }}><VoiceConfigSection selectedVoice={selectedPersonaId} setSelectedVoice={setSelectedPersonaId} selectedTone={selectedTone} setSelectedTone={setSelectedTone} onGenerate={handleGenerateAudio} isGenerating={isProcessing} progress={genProgress} statusMessage={statusMessage} segments={segments} targetDuration={targetVideoDuration} setTargetDuration={setTargetVideoDuration} forceSync={forceSync} setForceSync={setForceSync} smoothFlow={smoothFlow} setSmoothFlow={setSmoothFlow} language={language} /></motion.div>;
      case AppStep.RESULT:
        return <motion.div key="result" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.6 }}><ResultSection originalVideoUrl={originalVideoUrl} generatedAudioUrl={generatedAudioUrl} generatedAudioBuffer={generatedAudioBuffer} segments={segments} fileType={videoFile?.type} videoDuration={videoDuration} language={language} syncData={syncData} /></motion.div>;
      default: return null;
    }
  };

  const sharedProps = {
    currentMode: mode, 
    setMode: setMode, 
    hasApiKey: hasApiKey, 
    onSelectKey: handleSelectKey,
    isDarkMode: isDarkMode,
    toggleTheme: toggleTheme,
    language: language,
    setLanguage: handleSetLanguage,
  };

  // Main UI Render
  if (mode === AppMode.SUB_STUDIO) {
    return (
      <ErrorBoundary>
        <Layout {...sharedProps}>
          <SubStudioSection language={language} />
        </Layout>
      </ErrorBoundary>
    );
  }

  if (mode === AppMode.THUMBNAIL_MAKER) {
    return (
      <ErrorBoundary>
        <Layout {...sharedProps}>
          <ThumbnailSection language={language} />
        </Layout>
      </ErrorBoundary>
    );
  }

  if (mode === AppMode.INSTANT_TTS) {
    return (
      <ErrorBoundary>
        <Layout {...sharedProps}>
          <TTSSection language={language} />
        </Layout>
      </ErrorBoundary>
    );
  }

  if (mode === AppMode.TRANSCRIBE) {
     return (
      <ErrorBoundary>
        <Layout {...sharedProps}>
          <SRTGeneratorSection language={language} />
        </Layout>
      </ErrorBoundary>
     );
  }

  if (mode === AppMode.SOCIAL_GEN) {
     return (
      <ErrorBoundary>
        <Layout {...sharedProps}>
          <SocialGenSection language={language} />
        </Layout>
      </ErrorBoundary>
     );
  }

  return (
    <ErrorBoundary>
      <Layout 
        {...sharedProps}
        setMode={(m) => { setMode(m); setCurrentStep(AppStep.UPLOAD); }} 
      >
        <StepIndicator currentStep={currentStep} language={language} />

        <AnimatePresence mode="wait">
           {renderStep()}
        </AnimatePresence>
      </Layout>
    </ErrorBoundary>
  );
};

export default Studio;