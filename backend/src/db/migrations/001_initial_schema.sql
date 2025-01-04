-- Description: Initial database schema for Country Trivia game

BEGIN;

-- Create an enum for game types to ensure data consistency
CREATE TYPE game_type AS ENUM ('capital', 'country');

-- Users table: Stores basic user information
CREATE TABLE users (
    id SERIAL PRIMARY KEY,  -- Auto-incrementing unique identifier
    username VARCHAR(50) UNIQUE NOT NULL,  -- Username must be unique
    email VARCHAR(255) UNIQUE NOT NULL,    -- Email must be unique
    password_hash VARCHAR(255) NOT NULL,   -- Store hashed passwords only
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,  -- When user registered
    last_login TIMESTAMPTZ                -- Track user engagement
);

-- Game sessions table: Track individual game sessions
CREATE TABLE game_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),  -- Link to user who played
    game_type game_type NOT NULL,         -- Using our enum type
    questions_asked INTEGER DEFAULT 0,     -- Track number of questions
    correct_answers INTEGER DEFAULT 0,     -- Track correct answers
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    score INTEGER,                        -- Final score for the session
    
    -- Ensure correct_answers cannot exceed questions_asked
    CONSTRAINT valid_answers CHECK (correct_answers <= questions_asked)
);

-- Create indexes for common queries
CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX idx_game_sessions_score ON game_sessions(score DESC);

-- Create a view for the leaderboard
CREATE VIEW leaderboard AS
SELECT 
    u.username,
    COUNT(gs.id) as games_played,
    ROUND(AVG(gs.score)::numeric, 2) as average_score,
    MAX(gs.score) as high_score
FROM users u
LEFT JOIN game_sessions gs ON u.id = gs.user_id
WHERE gs.ended_at IS NOT NULL  -- Only include completed games
GROUP BY u.id, u.username
ORDER BY high_score DESC;

-- Add some helpful functions
-- Function to get a user's game history
CREATE OR REPLACE FUNCTION get_user_game_history(p_user_id INTEGER)
RETURNS TABLE (
    game_date TIMESTAMPTZ,
    game_type game_type,
    score INTEGER,
    accuracy NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        started_at,
        game_type,
        score,
        ROUND((correct_answers::numeric / NULLIF(questions_asked, 0) * 100), 2)
    FROM game_sessions
    WHERE user_id = p_user_id
    ORDER BY started_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Record this migration
INSERT INTO schema_version (version, description, applied_at)
VALUES (1, 'Initial schema', CURRENT_TIMESTAMP);

COMMIT;