
import { ParsedSubtitle } from "../types";

export const parseSRT = (srt: string): ParsedSubtitle[] => {
  const segments = srt.trim().split(/\n\s*\n/);
  return segments.map((segment, index) => {
    const lines = segment.split('\n');
    if (lines.length < 3) return null;

    const id = parseInt(lines[0]);
    const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
    
    if (!timeMatch) return null;

    const parseTime = (timeStr: string): number => {
      const [hms, mms] = timeStr.split(',');
      const [h, m, s] = hms.split(':').map(Number);
      return h * 3600 + m * 60 + s + parseInt(mms) / 1000;
    };

    const start = parseTime(timeMatch[1]);
    const end = parseTime(timeMatch[2]);
    const text = lines.slice(2).join(' ');

    return { id, start, end, text };
  }).filter((s): s is ParsedSubtitle => s !== null);
};
