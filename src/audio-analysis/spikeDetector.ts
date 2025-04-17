import fs from 'fs';
import path from 'path';
import child_process from 'child_process';
import { decode } from 'wav-decoder';

import { isCancelled } from '../api/cancel';
const tempDir = path.join(__dirname, '../../../temp');
fs.promises.mkdir(tempDir, { recursive: true });

export async function detectAudioSpikes(inputVideoPath: string): Promise<number[]> {
  
  if (isCancelled()) return Promise.reject('Processing cancelled');

  const audioPath = path.join(tempDir, `extracted_${Date.now()}.wav`);
 
  // Step 1: Extract audio to WAV using FFmpeg
  await new Promise<void>((resolve, reject) => {
    const command = `ffmpeg -i "${inputVideoPath}" -ac 1 -ar 44100 -vn -y "${audioPath}"`;
    child_process.exec(command, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  // Step 2: Load and decode WAV file
  const buffer = fs.readFileSync(audioPath);
  const wavData = await decode(buffer);
  const samples = wavData.channelData[0]; // Mono audio

  // Step 3: Detect amplitude spikes
  const windowSize = 4410; // 0.1s at 44.1kHz
  const threshold = 0.08; // Adjust based on testing
  const spikes: number[] = [];

  for (let i = 0; i < samples.length; i += windowSize) {
    const window = samples.slice(i, i + windowSize);
    const avg = window.reduce((sum: number, val: number) => sum + Math.abs(val), 0) / window.length;
    console.log(`🟢 Detected spike at ${Math.round(i / 44100)}s with avg ${avg}`);

    if (avg > threshold) {
      const timestampSec = i / 44100;
      spikes.push(Math.round(timestampSec));
      i += 44100 * 3; // skip 3s to avoid duplicates
    }
  }

  fs.unlink(audioPath, () => {}); // Clean up temp file
  return [...new Set(spikes)].sort((a, b) => a - b); // Unique + sorted
}
