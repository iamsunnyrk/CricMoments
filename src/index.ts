import express from 'express';
import dotenv from 'dotenv';
import uploadRouter from './api/upload';
import path from 'path';

import clearRouter from './api/clear';
import cors from 'cors';
import router from './api/cancel';



dotenv.config();

const app = express();

// app.use(cors());
// Allow CORS from your Vercel domain
app.use(cors({
  origin: 'https://cricmoments-frontend.vercel.app', // 🔁 replace with your actual Vercel domain
}));


const PORT = 3000;

app.use('/api', uploadRouter);

app.use('/merged', express.static(path.join(__dirname, '../../merged')));

app.use('/api', clearRouter);
app.use('/api', router);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
