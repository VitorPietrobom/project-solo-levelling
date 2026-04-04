import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import gamificationRoutes from './routes/gamification';
import questRoutes from './routes/quests';
import taskRoutes from './routes/tasks';
import skillRoutes from './routes/skills';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/skills', skillRoutes);

if (process.env.NODE_ENV !== 'test') {
  // Warm up the DB connection pool before accepting requests
  import('./lib/prisma').then(({ default: prisma }) => {
    prisma.$connect().then(() => {
      console.log('Database connected');
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    });
  });
}

export default app;
