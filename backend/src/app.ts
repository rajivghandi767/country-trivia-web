import express from 'express';
import { config } from 'dotenv';
import cors from 'cors';
import gameRoutes from './routes/gameRoutes';
import userRoutes from './routes/userRoutes';
import leaderboardRoutes from './routes/leaderboardRoutes';
import { setupVaultConnection } from './config/vault';
import { setupDatabase } from './config/database';

config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/game', gameRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Database and Vault setup
setupVaultConnection();
setupDatabase();

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});