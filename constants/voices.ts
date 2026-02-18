
import { VoicePersona, VoiceId } from "../types";

// Explicitly defined static voice list for consistency and quality control
export const ALL_VOICES: VoicePersona[] = [
  // --- MALE VOICES (Fenrir, Charon, Puck) ---
  {
    id: "m_thura",
    apiVoice: VoiceId.Fenrir,
    name: "Thura",
    gender: "Male",
    description: "Deep & Authoritative",
    detune: 0 // Native pitch (Clear)
  },
  {
    id: "m_min",
    apiVoice: VoiceId.Charon,
    name: "Min",
    gender: "Male",
    description: "Calm & Professional",
    detune: -20 // Slightly deeper
  },
  {
    id: "m_kyaw",
    apiVoice: VoiceId.Puck,
    name: "Kyaw",
    gender: "Male",
    description: "Rough & Powerful",
    detune: -40
  },
  {
    id: "m_aung",
    apiVoice: VoiceId.Fenrir,
    name: "Aung",
    gender: "Male",
    description: "Smooth & Elegant",
    detune: 20
  },
  {
    id: "m_bo",
    apiVoice: VoiceId.Charon,
    name: "Bo",
    gender: "Male",
    description: "Warm & Friendly",
    detune: 0
  },
  {
    id: "m_zay",
    apiVoice: VoiceId.Puck,
    name: "Zay",
    gender: "Male",
    description: "Fast & Energetic",
    detune: 30
  },
  {
    id: "m_htet",
    apiVoice: VoiceId.Fenrir,
    name: "Htet",
    gender: "Male",
    description: "Serious & Direct",
    detune: -30
  },
  {
    id: "m_naing",
    apiVoice: VoiceId.Charon,
    name: "Naing",
    gender: "Male",
    description: "Modern & Crisp",
    detune: 10
  },
  {
    id: "m_soe",
    apiVoice: VoiceId.Puck,
    name: "Soe",
    gender: "Male",
    description: "Classic Narrator",
    detune: -10
  },
  {
    id: "m_win",
    apiVoice: VoiceId.Fenrir,
    name: "Win",
    gender: "Male",
    description: "Rich & Resonant",
    detune: -50
  },
  {
    id: "m_kaung",
    apiVoice: VoiceId.Charon,
    name: "Kaung",
    gender: "Male",
    description: "Polished & Sharp",
    detune: 40
  },
  {
    id: "m_hein",
    apiVoice: VoiceId.Puck,
    name: "Hein",
    gender: "Male",
    description: "Casual & Relaxed",
    detune: 0
  },

  // --- FEMALE VOICES (Kore, Aoede, Zephyr) ---
  {
    id: "f_hla",
    apiVoice: VoiceId.Kore,
    name: "Hla",
    gender: "Female",
    description: "Soft & Relaxing",
    detune: 0 // Native pitch (Clear)
  },
  {
    id: "f_may",
    apiVoice: VoiceId.Aoede,
    name: "May",
    gender: "Female",
    description: "Bright & Youthful",
    detune: 20
  },
  {
    id: "f_nwe",
    apiVoice: VoiceId.Zephyr,
    name: "Nwe",
    gender: "Female",
    description: "Dramatic & Bold",
    detune: -20
  },
  {
    id: "f_su",
    apiVoice: VoiceId.Kore,
    name: "Su",
    gender: "Female",
    description: "Quiet & Steady",
    detune: -30
  },
  {
    id: "f_phyu",
    apiVoice: VoiceId.Aoede,
    name: "Phyu",
    gender: "Female",
    description: "Sweet & Gentle",
    detune: 40
  },
  {
    id: "f_yi",
    apiVoice: VoiceId.Zephyr,
    name: "Yi",
    gender: "Female",
    description: "Expressive & Lively",
    detune: 0
  },
  {
    id: "f_thandar",
    apiVoice: VoiceId.Kore,
    name: "Thandar",
    gender: "Female",
    description: "Mysterious & Deep",
    detune: -40
  },
  {
    id: "f_khin",
    apiVoice: VoiceId.Aoede,
    name: "Khin",
    gender: "Female",
    description: "Clear & Direct",
    detune: 0
  },
  {
    id: "f_moe",
    apiVoice: VoiceId.Zephyr,
    name: "Moe",
    gender: "Female",
    description: "Professional News",
    detune: -10
  },
  {
    id: "f_cho",
    apiVoice: VoiceId.Kore,
    name: "Cho",
    gender: "Female",
    description: "Kind & Motherly",
    detune: -20
  },
  {
    id: "f_eain",
    apiVoice: VoiceId.Aoede,
    name: "Eain",
    gender: "Female",
    description: "Energetic & Fun",
    detune: 50
  },
  {
    id: "f_pan",
    apiVoice: VoiceId.Zephyr,
    name: "Pan",
    gender: "Female",
    description: "Storyteller",
    detune: 10
  }
];
