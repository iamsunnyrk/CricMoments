import path from 'path';
import fs from 'fs-extra';
import child_process from 'child_process';
import { isCancelled } from '../api/cancel';

const clipsDir = path.join(__dirname, '../../../clips');
const mergedDir = path.join(__dirname, '../../../merged');
fs.ensureDirSync(mergedDir);

export async function mergeClips(clipFilenames: string[]): Promise<string> {
  if (isCancelled()) return Promise.reject('Processing cancelled');
  const listFilePath = path.join(clipsDir, 'clip_list.txt');
  const mergedOutput = path.join(mergedDir, `merged_highlights_${Date.now()}.mp4`);

  // Step 1: Write temp list file for FFmpeg
  const listContent = clipFilenames.map(filename => `file '${path.join(clipsDir, filename)}'`).join('\n');
  await fs.writeFile(listFilePath, listContent);
  
  
  // Step 2: Run FFmpeg concat
  const command = `ffmpeg -y -f concat -safe 0 -i "${listFilePath}" -fflags +genpts -c copy "${mergedOutput}"`;
  
  await new Promise<void>((resolve, reject) => {
    child_process.exec(command, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Step 3: Clean up list file
  await fs.remove(listFilePath);

  return mergedOutput;
}
