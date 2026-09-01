import app from './app';
import connectDB from './config/db';
import { startDailyChallengeCron } from './services/cronService';
import Badge from './models/Badge';

const PORT = process.env.PORT || 5000;

// Pre-seeding badges database function
const seedBadges = async () => {
  try {
    const defaultBadges = [
      {
        badgeId: 'first_quiz',
        name: 'First Blood',
        description: 'Completed your first quiz attempt on TechQuiz AI.',
        iconCode: 'Trophy',
        unlockCondition: 'Complete 1 quiz attempt.',
      },
      {
        badgeId: 'perfect_score',
        name: 'Quiz Master',
        description: 'Achieved a 100% perfect score on a quiz attempt.',
        iconCode: 'Zap',
        unlockCondition: 'Achieve a 100% score on any quiz.',
      },
      {
        badgeId: 'streak_7',
        name: 'Daily Champion',
        description: 'Maintained a consecutive active learning streak of 7 days.',
        iconCode: 'Calendar',
        unlockCondition: 'Achieve a 7-day daily quiz streak.',
      },
    ];

    for (const b of defaultBadges) {
      await Badge.findOneAndUpdate({ badgeId: b.badgeId }, b, { upsert: true, new: true });
      console.log(`SEED: Badge "${b.name}" updated/seeded successfully.`);
    }
  } catch (err) {
    console.error('SEED WARNING: Failed to auto-seed badges:', err);
  }
};

const startServer = async () => {
  // 1. Connect database
  await connectDB();

  // 2. Run auto-seeding
  await seedBadges();

  // 3. Start Daily Challenge Cron
  startDailyChallengeCron();

  // 4. Listen via Express app.listen
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('CRITICAL: Server failed to start:', error);
  process.exit(1);
});
