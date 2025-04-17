import express from 'express';
import fs from 'fs-extra';
import path from 'path';

const router = express.Router();

router.post('/clear', async (req, res) => {
  try {
    const folders = ['../../../uploads', '../../../clips', '../../../merged'];

    for (const folder of folders) {
      const dirPath = path.join(__dirname, folder);
      await fs.emptyDir(dirPath); // clears contents but keeps folder
      console.log(`🧹 Cleared: ${dirPath}`);
    }

    res.json({ message: 'Session cleared successfully.' });
  } catch (err) {
    console.error('❌ Error clearing session:', err);
    res.status(500).json({ error: 'Failed to clear session.' });
  }
});

export default router;
