import { SubtitleSegment } from "../types";

const formatTime = (seconds: number): string => {
  const date = new Date(0);
  date.setMilliseconds(seconds * 1000);
  const iso = date.toISOString();
  // Format: HH:MM:SS,mmm
  // Using substring instead of deprecated substr
  return iso.substring(11, 19) + ',' + iso.substring(20, 23);
};

export const generateSRT = (segments: SubtitleSegment[]): string => {
  return segments.map((seg, index) => {
    return `${index + 1}
${formatTime(seg.startTime)} --> ${formatTime(seg.endTime)}
${seg.translatedText}
`;
  }).join('\n');
};