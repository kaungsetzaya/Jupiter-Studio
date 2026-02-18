import { GoogleGenAI, Type, Modality } from "@google/genai";
import { SubtitleSegment, VoiceId, VoiceTone, SocialContent } from "../types";

// Safe API Key retrieval
const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  // Fallback for environments where process.env is injected differently or global shim used
  return (window as any).process?.env?.API_KEY || "";
};

const decode = (base64: string): Uint8Array => {
  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  } catch (e) {
    console.error("Base64 decoding failed", e);
    throw new Error("Invalid audio data received from server.");
  }
};

const concatenateAudioBuffers = (buffers: ArrayBuffer[]): ArrayBuffer => {
  const totalLen = buffers.reduce((acc, b) => acc + b.byteLength, 0);
  const tmp = new Uint8Array(totalLen);
  let offset = 0;
  for (const b of buffers) {
    tmp.set(new Uint8Array(b), offset);
    offset += b.byteLength;
  }
  return tmp.buffer;
};

const isQuotaError = (error: any) => {
  const msg = (error.message || '').toLowerCase();
  return msg.includes('429') || 
         msg.includes('resource_exhausted') || 
         msg.includes('quota') ||
         msg.includes('too many requests');
};

const handleGeminiError = (error: any, context: string) => {
  const msg = error.message || '';
  if (isQuotaError(error)) {
    throw new Error(`Quota exceeded for ${context}. Switching models... (Please try again in a moment if this persists)`);
  }
  if (msg.includes("Requested entity was not found")) {
     throw error; // Let UI handle key re-selection
  }
  throw new Error(`${context} failed: ${msg}`);
};

export const fileToGenerativePart = async (file: File): Promise<{data: string, mimeType: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Content = base64String.split(',')[1];
      resolve({ data: base64Content, mimeType: file.type || 'image/jpeg' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const optimizeImage = async (file: File): Promise<{data: string, mimeType: string}> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1280; 
      const MAX_HEIGHT = 1280;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      } else {
        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
      }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve({ data: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
      URL.revokeObjectURL(img.src);
    };
  });
};

export const generateSocialContent = async (
  base64Data: string, 
  mimeType: string, 
  platform: string, 
  includeTags: boolean,
  lang: string
): Promise<SocialContent> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing.");
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    TASK: Analyze this video and create viral social media content in ${lang === 'MM' ? 'Burmese (Spoken Style)' : 'English'}.
    PLATFORM: ${platform}. 
    STYLE: Short, impactful, and high-engagement.
    
    REQUIREMENTS:
    1. TITLE: A very catchy, short, and "viral" title that summarizes the video's core event/meaning. This acts as the hook. (Max 8-10 words).
    2. CAPTION: A concise, engaging description. Avoid long paragraphs. Focus on why people should care about this video.
    3. HASHTAGS: ${includeTags ? 'Provide 5 highly relevant hashtags based on the video context.' : 'Do not include hashtags.'}
    
    OUTPUT: JSON object { "title": "...", "caption": "...", "hashtags": ["tag1", "tag2"] }
  `;

  // Use Gemini 3 Flash Preview as primary (High Limit), fallback to 2.5 Flash Latest
  const models = ['gemini-3-flash-preview', 'gemini-2.5-flash-latest'];
  
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              caption: { type: Type.STRING },
              hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "caption", "hashtags"]
          }
        }
      });
      return JSON.parse(response.text || "{}");
    } catch (error: any) {
      if (isQuotaError(error) && model !== models[models.length - 1]) {
        console.warn(`Quota exceeded for ${model} in SocialGen, switching to next model...`);
        continue;
      }
      handleGeminiError(error, "Social Content Generation");
      return { title: "", caption: "", hashtags: [] };
    }
  }
  return { title: "", caption: "", hashtags: [] };
};

export const analyzeAndTranslateVideo = async (base64Data: string, mimeType: string): Promise<SubtitleSegment[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing.");
  const ai = new GoogleGenAI({ apiKey });
  
  // High-Quality Spoken Burmese Prompt
  const prompt = `
    TASK: Transcribe the video audio and translate it into **Natural, Spoken Burmese** (Myanmar Language).
    GOAL: Create a translation suitable for a professional Myanmar Dubbing Video.

    STRICT TRANSLATION GUIDELINES:
    1. **SPOKEN STYLE (အပြောစကား)**: Use natural, conversational Burmese.
       - STRICTLY AVOID formal literary style (စာစကား).
       - Example: Use "မသိဘူး" (Conversational) instead of "မသိရှိပါ" (Formal).
       - Example: Use "လုပ်နေတယ်" instead of "ဆောင်ရွက်လျက်ရှိသည်".
    2. **EMOTION & PARTICLES**: Capture the speaker's tone using sentence-ending particles.
       - Use 'ကွ', 'ဗျာ', 'နော်', 'ရှင့်', 'လေ' where appropriate to match the energy.
    3. **IDIOMS**: Translate the *meaning*, not the literal words.
    4. **DUBBING FLOW**: Sentences must flow smoothly when spoken aloud. 
    5. **COMPLETENESS**: Transcribe and translate EVERY sentence.

    OUTPUT FORMAT: JSON Array
    [ 
      { 
        "id": "1", 
        "startTime": 0.0, 
        "endTime": 2.5, 
        "originalText": "Hello everyone", 
        "translatedText": "အားလုံးပဲ မင်္ဂလာပါ" 
      } 
    ]
  `;

  // Use Gemini 3 Flash Preview as primary (High Limit), fallback to 2.5 Flash Latest
  const models = ['gemini-3-flash-preview', 'gemini-2.5-flash-latest'];

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                startTime: { type: Type.NUMBER },
                endTime: { type: Type.NUMBER },
                originalText: { type: Type.STRING },
                translatedText: { type: Type.STRING },
              },
              required: ["id", "startTime", "endTime", "originalText", "translatedText"]
            }
          }
        }
      });
      const parsed = JSON.parse(response.text || "[]");
      // Sanitize input to prevent crashes
      return parsed.map((item: any) => ({
        id: item.id || Math.random().toString(),
        startTime: typeof item.startTime === 'number' ? item.startTime : 0,
        endTime: typeof item.endTime === 'number' ? item.endTime : 0,
        originalText: item.originalText || "",
        translatedText: item.translatedText || ""
      }));
    } catch (error: any) { 
      if (error.message?.includes("Requested entity was not found.") && (window as any).aistudio?.openSelectKey) {
        await (window as any).aistudio.openSelectKey();
      }
      if (isQuotaError(error) && model !== models[models.length - 1]) {
        console.warn(`Quota exceeded for ${model} in VideoAnalysis, switching to next model...`);
        continue;
      }
      handleGeminiError(error, "Video Translation");
      return [];
    }
  }
  return [];
};

export const generateSegmentAudio = async (text: string, voice: VoiceId, tone: VoiceTone, onCooldown?: (wait: number) => void): Promise<ArrayBuffer> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing.");
  const ai = new GoogleGenAI({ apiKey });
  
  const cleanText = text.trim();
  if (!cleanText) throw new Error("Input text is empty.");

  // --- LONG TEXT HANDLING ---
  const MAX_CHUNK_LENGTH = 250; 
  if (cleanText.length > MAX_CHUNK_LENGTH) {
    const chunks = cleanText.match(/[^။.!?\n]+[။.!?\n]*|[^။.!?\n]+$/g);
    
    if (chunks && chunks.length > 1) {
        console.log(`Text too long (${cleanText.length} chars). Splitting into ${chunks.length} chunks to prevent missing text.`);
        const buffers: ArrayBuffer[] = [];
        
        for (const chunk of chunks) {
            if (chunk.trim().length === 0) continue;
            try {
              const chunkBuffer = await generateSegmentAudio(chunk, voice, tone, onCooldown);
              if (chunkBuffer.byteLength > 0) {
                buffers.push(chunkBuffer);
              }
            } catch (e) {
               console.warn("Failed to generate sub-chunk, skipping:", e);
            }
        }
        
        if (buffers.length > 0) {
           return concatenateAudioBuffers(buffers);
        }
    }
  }
  // --------------------------

  const promptText = tone === VoiceTone.NORMAL 
    ? cleanText 
    : `(Tone: ${tone}) ${cleanText}`;

  const models = [
    "gemini-2.5-flash-preview-tts",              
    "gemini-3-flash-preview",                    
    "gemini-3-pro-preview"                       
  ];

  for (const model of models) {
    let retries = 1; 
    let delay = 1000;

    while (retries >= 0) {
      try {
        const response = await ai.models.generateContent({
          model: model,
          contents: [{ parts: [{ text: promptText }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
          },
        });
        
        const candidate = response.candidates?.[0];
        if (!candidate) throw new Error("No candidates returned from API.");

        let base64Audio: string | undefined;
        let textResponse: string | undefined;

        const parts = candidate.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            base64Audio = part.inlineData.data;
          }
          if (part.text) {
            textResponse = part.text;
          }
        }

        if (candidate.finishReason && candidate.finishReason !== "STOP") {
          console.warn(`TTS Finish Reason: ${candidate.finishReason}`);
          if (candidate.finishReason === "SAFETY") throw new Error("Message blocked by safety filters.");
          if (!base64Audio) throw new Error(`Generation stopped: ${candidate.finishReason}`);
        }

        if (!base64Audio) {
          if (textResponse) throw new Error(`Model returned text instead of audio (Model: ${model}): "${textResponse.substring(0, 50)}..."`);
          throw new Error("API returned success but contained no audio data.");
        }
        
        const decoded = decode(base64Audio);
        return decoded.buffer;

      } catch (error: any) {
        const msg = (error.message || '').toLowerCase();
        const isQuota = isQuotaError(error);
        const isOtherError = msg.includes("generation stopped: other");
        const isServerOverload = msg.includes("503") || msg.includes("500") || msg.includes("overloaded");
        const isNotFound = msg.includes("not found") || msg.includes("404");
        
        const shouldRetry = (isQuota || isOtherError || isServerOverload) && !isNotFound;
        
        if (shouldRetry) {
           if (retries > 0) {
              if (onCooldown && isQuota) onCooldown(delay / 1000);
              await new Promise(resolve => setTimeout(resolve, delay));
              retries--;
              delay *= 2; 
              continue;
           } else {
              if (model !== models[models.length - 1]) break; 
           }
        }
        
        if (model === models[models.length - 1] || (!shouldRetry)) {
           if (shouldRetry && onCooldown) onCooldown(30);
           handleGeminiError(error, "Voice Generation");
           return new ArrayBuffer(0);
        }
        break; 
      }
    }
  }
  return new ArrayBuffer(0);
};

export const generateThumbnail = async (
  subject: string, 
  headline: string, 
  styleId: string, 
  assets: {data: string, mimeType: string}[], 
  aspectRatio: string = "16:9",
  typography?: { fontVibe: string, textColor: string, styleRefs: {data: string, mimeType: string}[] },
  platform: string = "YouTube"
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing.");
  const ai = new GoogleGenAI({ apiKey });
  
  const stylePrompts: Record<string, string> = {
    'vlog': "High-CTR YouTube Vlog Thumbnail. STYLE: Bright, High Saturation, 4K Realism.",
    'cinematic': "Movie Poster. STYLE: Dramatic, Gritty, High Contrast.",
    '3d': "3D Character Art. STYLE: Pixar style.",
    'minimal': "Minimalist Design. Clean backgrounds."
  };

  const selectedStyle = stylePrompts[styleId] || stylePrompts['vlog'];

  const prompt = `
    TASK: Create a professional ${aspectRatio} thumbnail for ${platform}.
    VISUAL STYLE: ${selectedStyle}
    SUBJECT: ${subject}
    HEADLINE: "${headline}"
  `;

  const parts: any[] = [{ text: prompt }];
  assets.forEach(asset => parts.push({ inlineData: { data: asset.data, mimeType: asset.mimeType } }));
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: { imageConfig: { aspectRatio: aspectRatio as any, imageSize: "1K" } }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) { 
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`; 
    }
    throw new Error("No image data returned from API.");
  } catch (error: any) {
    console.error("Thumbnail generation failed", error);
    handleGeminiError(error, "Thumbnail Generation");
    return "";
  }
};

export const generateVideoSummary = async (base64Data: string, mimeType: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing.");
  const ai = new GoogleGenAI({ apiKey });
  const prompt = "Summarize the key events in this video in 3 concise sentences.";
  
  const models = ['gemini-3-flash-preview', 'gemini-2.5-flash-latest'];
  
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] },
      });
      return response.text || "No summary available.";
    } catch (error: any) {
      if (isQuotaError(error) && model !== models[models.length - 1]) {
        continue;
      }
      console.error("Summary generation failed", error);
      return "Summary generation failed.";
    }
  }
  return "Summary generation failed.";
};

export interface TranscribeResult {
  original: string;
  translated?: string;
}

export const transcribeToSRT = async (
  base64Data: string, 
  mimeType: string, 
  layout: string = '16:9', 
  sourceLang: string = 'Auto', 
  targetLang: string | null = null
): Promise<TranscribeResult> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing.");
  const ai = new GoogleGenAI({ apiKey });
  
  let prompt = `
    TASK: Generate subtitles for this video in SRT format.
    LAYOUT_CONTEXT: The video is ${layout}.
    SOURCE_LANGUAGE: ${sourceLang}.
  `;

  if (targetLang) {
    prompt += `
      TARGET_LANGUAGE: ${targetLang}.
      REQUIREMENT: Return a JSON object with two fields:
      1. "original": The SRT string in the source language.
      2. "translated": The SRT string translated to ${targetLang}.
      
      Ensure timestamps match exactly between original and translated versions.
    `;
  } else {
    prompt += `
      REQUIREMENT: Return a JSON object with one field:
      1. "original": The SRT string in the source language.
    `;
  }

  // Schema for JSON output
  const schema = {
    type: Type.OBJECT,
    properties: {
      original: { type: Type.STRING, description: "SRT formatted string" },
      translated: { type: Type.STRING, description: "Translated SRT formatted string" }
    },
    required: ["original"]
  };

  const models = ['gemini-3-flash-preview', 'gemini-2.5-flash-latest'];

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });

      const json = JSON.parse(response.text || "{}");
      if (!json.original) throw new Error("Invalid response from AI");
      
      return {
        original: json.original,
        translated: json.translated
      };
    } catch (error: any) {
      if (isQuotaError(error) && model !== models[models.length - 1]) {
        console.warn(`Quota exceeded for ${model} in SRTGen, switching to next model...`);
        continue;
      }
      console.error("SRT generation failed", error);
      handleGeminiError(error, "SRT Extraction");
      return { original: "" };
    }
  }
  return { original: "" };
};