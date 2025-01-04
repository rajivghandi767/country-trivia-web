-- Initial database schema for Country Trivia game

BEGIN;

CREATE TYPE game_type AS ENUM ('capital', 'country');

-- Users table: Stores basic user information
CREATE TABLE users (
    id SERIAL PRIMARY KEY,  
    username VARCHAR(50) UNIQUE NOT NULL,  
    email VARCHAR(255) UNIQUE NOT NULL,    
    password_hash VARCHAR(255) NOT NULL,   
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,  
    last_login TIMESTAMPTZ                
);

-- Game sessions table: Track individual game sessions
CREATE TABLE game_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),  
    game_type game_type NOT NULL,         
    questions_asked INTEGER DEFAULT 0,     
    correct_answers INTEGER DEFAULT 0,     
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    score INTEGER,                        
    
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
WHERE gs.ended_at IS NOT NULL
GROUP BY u.id, u.username
ORDER BY high_score DESC;


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

INSERT INTO schema_version (version, description, applied_at)
VALUES (1, 'Initial schema', CURRENT_TIMESTAMP);

COMMIT;