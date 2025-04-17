import express from 'express';

const router = express.Router();
// Simple in-memory cancel flag (can be improved with session IDs)
let cancelled = false;

router.post('/cancel', (req, res) => {
  cancelled = true;
  res.json({ message: 'Processing cancelled.' });
});

router.get('/cancelled', (req, res) => {
  res.json({ cancelled });
});

export function resetCancelFlag() {
  cancelled = false;
}

export function isCancelled() {
  return cancelled;
}

export default router;
