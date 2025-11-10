export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface Country {
  id: number;
  name: string;
  capital: string;
  continent: string;
}

export interface AIAnswerResponse {
  is_correct: boolean;
  feedback_message: string;
  all_capitals_guessed?: boolean;
  correct_guesses?: string[];
  incorrect_guesses?: string[];
  missed_capitals?: string[];
  points_awarded?: number;
  shared_capital_info?: string | null;
}

export interface AIQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  funFact?: string;
}

export type GameMode = "capital" | "country" | "ai-quiz" | null;