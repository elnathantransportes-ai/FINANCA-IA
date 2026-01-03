import { Blob } from '@google/genai';

export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Process microphone audio: Downsampling (Box Filter) + Float32 to Int16 Conversion.
 * This ensures compatibility with Gemini (16kHz) regardless of the device's native sample rate (44.1/48kHz).
 */
export function processAudioInput(
  inputData: Float32Array, 
  inputSampleRate: number, 
  targetSampleRate: number = 16000
): string {
  
  if (inputSampleRate === targetSampleRate) {
    return encodePCM(inputData);
  }

  const ratio = inputSampleRate / targetSampleRate;
  const newLength = Math.floor(inputData.length / ratio);
  const result = new Int16Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.floor((i + 1) * ratio);
    let sum = 0;
    let count = 0;

    // Box filter (averaging) to prevent aliasing artifacts
    for (let j = start; j < end && j < inputData.length; j++) {
      sum += inputData[j];
      count++;
    }
    
    const avg = count > 0 ? sum / count : 0;
    
    // Clamp (-1.0 to 1.0) and convert to Int16
    const s = Math.max(-1, Math.min(1, avg));
    result[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  return encode(new Uint8Array(result.buffer));
}

function encodePCM(data: Float32Array): string {
    const l = data.length;
    const int16Data = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        let s = Math.max(-1, Math.min(1, data[i]));
        int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return encode(new Uint8Array(int16Data.buffer));
}

export function createBlob(base64PCM: string): Blob {
  return {
    data: base64PCM,
    mimeType: 'audio/pcm;rate=16000',
  };
}