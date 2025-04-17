import path from 'path';
import fs from 'fs-extra';
import child_process from 'child_process';
import os from 'os';

import { isCancelled } from '../api/cancel';

const clipsDir = path.join(__dirname, '../../../clips');
fs.ensureDirSync(clipsDir);

interface ClipOptions {
  videoPath: string;
  timestamps: number[];
  clipBefore: number; // seconds before spike
  clipAfter: number;  // seconds after spike
  mode: 'quick' | 'high';
}

export async function cutHighlights(options: ClipOptions): Promise<string[]> {
  if (isCancelled()) return Promise.reject('Processing cancelled');
  const { videoPath, timestamps, clipBefore, clipAfter } = options;
  const outputFiles: string[] = [];

  let lastClipEndTimestamp = 0;
  
  for (let i = 0; i < timestamps.length; i++) {

    const timestamp = timestamps[i];
    const start = Math.max(lastClipEndTimestamp, timestamp - clipBefore);
    const duration = clipBefore + clipAfter;
    lastClipEndTimestamp = start + duration;

    const outputFile = path.join(clipsDir, `highlight_${i + 1}.mp4`);
    outputFiles.push(outputFile);
  
    // ffmpeg -ss START -i input.mp4 -t DURATION -c copy -avoid_negative_ts make_zero output.mp4

    const useFastMode = options.mode === 'quick';

    const command = useFastMode
      ? `ffmpeg -y -ss ${start} -i "${videoPath}" -t ${duration} -c copy -avoid_negative_ts make_zero -fflags +genpts "${outputFile}"`
      : `ffmpeg -y -ss ${start} -i "${videoPath}" -t ${duration} -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 128k "${outputFile}"`;

    await new Promise<void>((resolve, reject) => {
      child_process.exec(command, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  return outputFiles;
}