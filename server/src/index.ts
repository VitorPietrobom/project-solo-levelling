import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import gamificationRoutes from './routes/gamification';
import questRoutes from './routes/quests';
import taskRoutes from './routes/tasks';
import skillRoutes from './routes/skills';
import weightRoutes from './routes/weight';
import measurementRoutes from './routes/measurements';
import gymSessionRoutes from './routes/gym-sessions';
import trainingProgramRoutes from './routes/training-programs';
import foodEntryRoutes from './routes/food-entries';
import calorieGoalRoutes from './routes/calorie-goal';
import recipeRoutes from './routes/recipes';
import mealPrepRoutes from './routes/meal-prep';
import documentRoutes from './routes/documents';
import bookRoutes from './routes/books';
import journalRoutes from './routes/journal';
import lessonRoutes from './routes/lessons';
import noteRoutes from './routes/notes';
import weeklySummaryRoutes from './routes/weekly-summary';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/weight', weightRoutes);
app.use('/api/measurements', measurementRoutes);
app.use('/api/gym-sessions', gymSessionRoutes);
app.use('/api/training-programs', trainingProgramRoutes);
app.use('/api/food-entries', foodEntryRoutes);
app.use('/api/calorie-goal', calorieGoalRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/meal-prep', mealPrepRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/weekly-summary', weeklySummaryRoutes);

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
