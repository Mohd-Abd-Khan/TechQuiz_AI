import http from 'http';
import app from './app';
import connectDB from './config/db';
import { initSocket } from './config/socket';
import { startDailyChallengeCron } from './services/cronService';
import Badge from './models/Badge';

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

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
        badgeId: 'speed_demon',
        name: 'Speed Demon',
        description: 'Earned 15+ points in speed bonuses in a single attempt.',
        iconCode: 'Zap',
        unlockCondition: 'Score 15+ points in speed bonus.',
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
      const exists = await Badge.findOne({ badgeId: b.badgeId });
      if (!exists) {
        await new Badge(b).save();
        console.log(`SEED: Badge "${b.name}" seeded successfully.`);
      }
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

  // 3. Create HTTP Server
  const server = http.createServer(app);

  // 4. Initialize Sockets
  initSocket(server, CLIENT_URL);

  // 5. Start Daily Challenge Cron
  startDailyChallengeCron();

  // 6. Listen
  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('CRITICAL: Server failed to start:', error);
  process.exit(1);
});
