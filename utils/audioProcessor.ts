
import { SubtitleSegment } from "../types";

export class AudioProcessor {
  private audioContext: AudioContext;
  private readonly OUTPUT_SAMPLE_RATE = 44100;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.OUTPUT_SAMPLE_RATE
    });
  }

  async resume() {
    if (this.audioContext.state === 'suspended') {
      console.log("AudioContext was suspended. Resuming now...");
      await this.audioContext.resume();
    }
  }

  /**
   * Decodes raw 16-bit PCM data (no header) from Gemini TTS
   */
  decodePCM(arrayBuffer: ArrayBuffer, inputSampleRate = 24000): AudioBuffer {
    try {
      const bytes = new Uint8Array(arrayBuffer);
      if (bytes.length === 0) throw new Error("Empty buffer.");

      const sampleCount = Math.floor(bytes.length / 2);
      const dataInt16 = new Int16Array(bytes.buffer, bytes.byteOffset, sampleCount);
      
      const audioBuffer = this.audioContext.createBuffer(1, sampleCount, inputSampleRate);
      const channelData = audioBuffer.getChannelData(0);
      
      for (let i = 0; i < sampleCount; i++) {
          channelData[i] = dataInt16[i] / 32768.0;
      }
      return audioBuffer;
    } catch (e) {
      console.error("decodePCM Error:", e);
      return this.createSilence(0.1);
    }
  }

  /**
   * Decodes standard audio files (WAV, MP3, etc.) using native browser API
   */
  async decodeAudioFile(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    try {
      return await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.error("decodeAudioFile Error:", e);
      // If it fails as a file, try decoding as raw PCM as fallback
      return this.decodePCM(arrayBuffer);
    }
  }

  createSilence(duration: number): AudioBuffer {
    const validDuration = Math.max(0.01, duration);
    const frameCount = Math.ceil(validDuration * this.OUTPUT_SAMPLE_RATE);
    return this.audioContext.createBuffer(1, frameCount, this.OUTPUT_SAMPLE_RATE);
  }

  trimSilence(buffer: AudioBuffer): AudioBuffer {
    const channel = buffer.getChannelData(0);
    let start = 0;
    let end = buffer.length;
    const threshold = 0.0008; 

    for (let i = 0; i < buffer.length; i++) {
      if (Math.abs(channel[i]) > threshold) {
        start = i;
        break;
      }
    }

    for (let i = buffer.length - 1; i >= 0; i--) {
      if (Math.abs(channel[i]) > threshold) {
        const padding = Math.floor(0.25 * buffer.sampleRate);
        end = Math.min(buffer.length, i + 1 + padding);
        break;
      }
    }

    if (start >= end) return this.createSilence(0.1);
    const newBuffer = this.audioContext.createBuffer(1, end - start, buffer.sampleRate);
    newBuffer.copyToChannel(channel.subarray(start, end), 0);
    return newBuffer;
  }

  async processSegment(rawBuffer: AudioBuffer, detuneValue: number = 0): Promise<AudioBuffer> {
    const trimmedBuffer = this.trimSilence(rawBuffer);
    const playbackRate = Math.pow(2, detuneValue / 1200);
    const adjustedDuration = (trimmedBuffer.duration / playbackRate) + 0.35; 
    const targetSamples = Math.ceil(adjustedDuration * this.OUTPUT_SAMPLE_RATE);
    const offlineCtx = new OfflineAudioContext(1, targetSamples, this.OUTPUT_SAMPLE_RATE);

    const source = offlineCtx.createBufferSource();
    source.buffer = trimmedBuffer;
    source.detune.value = detuneValue;
    source.connect(offlineCtx.destination);
    source.start(0);
    return await offlineCtx.startRendering();
  }

  async stretchBuffer(buffer: AudioBuffer, speed: number): Promise<AudioBuffer> {
    const safeSpeed = Math.max(0.25, Math.min(4.0, speed));
    const targetSamples = Math.ceil((buffer.duration / safeSpeed) * this.OUTPUT_SAMPLE_RATE);
    const offlineCtx = new OfflineAudioContext(1, targetSamples, this.OUTPUT_SAMPLE_RATE);
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = safeSpeed;
    source.connect(offlineCtx.destination);
    source.start(0);
    return await offlineCtx.startRendering();
  }

  // Adding stretchToFit to fix the missing method error in App.tsx
  async stretchToFit(buffer: AudioBuffer, targetDuration: number): Promise<AudioBuffer> {
    const speed = buffer.duration / targetDuration;
    return this.stretchBuffer(buffer, speed);
  }

  async stitchAudio(segments: { buffer: AudioBuffer, startTime: number }[], totalDuration: number): Promise<{blob: Blob, buffer: AudioBuffer}> {
    let maxEnd = Math.max(0.1, totalDuration || 0);
    segments.forEach(seg => maxEnd = Math.max(maxEnd, seg.startTime + seg.buffer.duration));
    const finalSamples = Math.ceil(maxEnd * this.OUTPUT_SAMPLE_RATE);
    const offlineCtx = new OfflineAudioContext(1, finalSamples, this.OUTPUT_SAMPLE_RATE);

    segments.forEach(seg => {
      const source = offlineCtx.createBufferSource();
      source.buffer = seg.buffer;
      source.connect(offlineCtx.destination);
      source.start(Math.max(0, seg.startTime));
    });

    const renderedBuffer = await offlineCtx.startRendering();
    return { blob: this.bufferToWave(renderedBuffer), buffer: renderedBuffer };
  }

  public bufferToWave(abuffer: AudioBuffer): Blob {
    const numOfChan = abuffer.numberOfChannels;
    const sampleRate = abuffer.sampleRate;
    const frameCount = abuffer.length;
    const dataLength = frameCount * numOfChan * 2;
    const fileLength = dataLength + 44;
    const buffer = new ArrayBuffer(fileLength);
    const view = new DataView(buffer);
    let pos = 0;

    const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
    const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

    setUint32(0x46464952); // "RIFF"
    setUint32(fileLength - 8);
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt "
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(sampleRate);
    setUint32(sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);
    setUint32(0x61746164); // "data"
    setUint32(dataLength);

    const channel = abuffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
        let sample = Math.max(-1, Math.min(1, channel[i] || 0));
        view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        pos += 2;
    }
    return new Blob([buffer], { type: "audio/wav" });
  }

  playBuffer(buffer: AudioBuffer, onEnded?: () => void): AudioBufferSourceNode {
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    if (onEnded) source.onended = onEnded;
    source.start(0);
    return source;
  }
}
