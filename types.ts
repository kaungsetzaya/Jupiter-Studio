
export enum AppMode {
  VIDEO_DUB = 'VIDEO_DUB',
  INSTANT_TTS = 'INSTANT_TTS',
  SUB_STUDIO = 'SUB_STUDIO',
  THUMBNAIL_MAKER = 'THUMBNAIL_MAKER',
  TRANSCRIBE = 'TRANSCRIBE',
  SOCIAL_GEN = 'SOCIAL_GEN'
}

export enum AppStep {
  UPLOAD = 'UPLOAD',
  ANALYZING = 'ANALYZING',
  EDITOR = 'EDITOR',
  VOICE_CONFIG = 'VOICE_CONFIG',
  GENERATING = 'GENERATING',
  RESULT = 'RESULT'
}

export enum Language {
  EN = 'EN',
  MM = 'MM'
}

export interface SubtitleSegment {
  id: string;
  startTime: number; 
  endTime: number; 
  originalText: string;
  translatedText: string;
}

export interface SyncMapping {
  segmentId: string;
  audioStart: number;
  audioEnd: number;
  videoStart: number;
  videoEnd: number;
  playbackRate: number;
}

export enum VoiceId {
  Kore = 'Kore',
  Fenrir = 'Fenrir',
  Charon = 'Charon',
  Puck = 'Puck',
  Aoede = 'Aoede',
  Zephyr = 'Zephyr',
}

export interface VoicePersona {
  id: string;
  apiVoice: VoiceId;
  name: string;
  gender: 'Male' | 'Female';
  description: string;
  detune: number; 
}

export enum VoiceTone {
  NORMAL = 'Normal',
  MOVIE_RECAP = 'Movie Recap',
  DOCUMENTARY = 'Documentary',
  HORROR = 'Horror'
}

export interface ProcessingState {
  currentSegmentIndex: number;
  totalSegments: number;
  statusMessage: string;
}

export interface ParsedSubtitle {
  id: number;
  start: number;
  end: number;
  text: string;
  translatedText?: string;
}

export interface SocialContent {
  title: string;
  caption: string;
  hashtags: string[];
}

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
