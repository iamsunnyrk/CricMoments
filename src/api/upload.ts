import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { detectAudioSpikes } from '../audio-analysis/spikeDetector';
import { cutHighlights } from '../clip-cutter/cutter';
import ffmpeg from 'fluent-ffmpeg';
import { mergeClips } from '../clip-cutter/merger';
import { resetCancelFlag } from '../api/cancel';

const router = express.Router();

const uploadDir = path.join(__dirname, '../../../uploads');
fs.ensureDirSync(uploadDir);

// Configure Multer to save uploaded videos to /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if (ext !== '.mp4') {
      return cb(new Error('Only .mp4 files are allowed'));
    }
    cb(null, true);
  }
});
  
// POST /api/upload
router.post('/upload', upload.single('video'), async (req, res) => {
  const start = Date.now();
  const qualityMode = req.body.quality; // default to quick

  resetCancelFlag();
  try {
    if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const filePath = req.file.path;
  console.log(`Uploaded: ${filePath}`);

  const spikeTimestamps = await detectAudioSpikes(filePath);
  console.log('Detected highlight timestamps:', spikeTimestamps);
  console.log(`✅ Audio Done in ${(Date.now() - start) / 1000}s`);


  if (spikeTimestamps.length === 0) {
    return res.status(200).json({
      message: 'No highlights detected.',
      spikes: [],
      clips: []
    });
  }

  const clips = await cutHighlights({
    videoPath: filePath,
    timestamps: spikeTimestamps,
    clipBefore: 3,
    clipAfter: 5,
    mode: qualityMode, 
  });

  console.log(`✅ Clips cut Done in ${(Date.now() - start) / 1000}s`);


  // After cutting clips
  const mergedPath = await mergeClips(clips.map(file => path.basename(file)));

  // ✅ CLEANUP: Delete original upload and all highlight clips
  try {
    // Delete uploaded video
    await fs.remove(filePath);
    console.log(`🗑️ Deleted uploaded file: ${filePath}`);

    // Delete clips used for this video
    for (const clip of clips) {
      await fs.remove(clip);
      console.log(`🗑️ Deleted clip: ${clip}`);
    }
  } catch (err) {
    console.error("❌ Error during cleanup:", err);
  }

  console.log(`✅ Done in ${(Date.now() - start) / 1000}s`);
  
  res.json({
  message: 'Highlights generated successfully!',
  spikes: spikeTimestamps,
  clips: clips.map(file => path.basename(file)),
  merged: path.basename(mergedPath)
  });
} catch (err) {
    console.error('Error processing upload:', err);
    res.status(500).json({ error: 'Internal server error', details: err });
  }
});

export default router;
