// backend/src/services/gameService.ts

import { Pool } from 'pg';
import { getPool } from '../config/database';
import { QuestionType, GameMode, GameState, Question } from '../types/game';
import gameData from '../data/data.json'; // Static reference data

export class GameService {
    private pool: Pool;
    private readonly referenceData: any[];

    constructor() {
        this.pool = getPool();
        // Load static reference data once during service initialization
        this.referenceData = gameData.data;
    }

    async createGame(userId: string, gameMode: GameMode): Promise<GameState> {
        try {
            // Only store dynamic game state in database
            const query = `
                INSERT INTO games (user_id, game_mode, started_at)
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                RETURNING id
            `;
            const result = await this.pool.query(query, [userId, gameMode]);
            
            // Generate first question using in-memory reference data
            const initialQuestion = this.generateQuestion(gameMode);
            
            return {
                gameId: result.rows[0].id,
                score: 0,
                questionsAnswered: 0,
                gameMode,
                currentQuestion: initialQuestion
            };
        } catch (error) {
            console.error('Failed to create game:', error);
            throw new Error('Game creation failed');
        }
    }

    private generateQuestion(gameMode: GameMode): Question {
        // Use in-memory reference data for quick question generation
        const randomIndex = Math.floor(Math.random() * this.referenceData.length);
        const countryData = this.referenceData[randomIndex];

        if (gameMode === 'CAPITALS') {
            return {
                type: QuestionType.CAPITAL,
                prompt: `What is the capital city of ${countryData.country}?`,
                answer: countryData.capital,
                options: this.generateOptions(countryData.capital, 'capital')
            };
        } else {
            return {
                type: QuestionType.COUNTRY,
                prompt: `${countryData.capital} is the capital city of which country?`,
                answer: countryData.country,
                options: this.generateOptions(countryData.country, 'country')
            };
        }
    }

    private generateOptions(correctAnswer: string, field: 'country' | 'capital'): string[] {
        // Use in-memory reference data for generating options
        const options = new Set<string>([correctAnswer]);
        
        while (options.size < 4) {
            const randomIndex = Math.floor(Math.random() * this.referenceData.length);
            options.add(this.referenceData[randomIndex][field]);
        }

        return Array.from(options).sort(() => Math.random() - 0.5);
    }

    // ... rest of the service implementation
}

export default new GameService();