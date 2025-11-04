import { useState } from "react";
import { Country } from "@/types";
import apiService from "@/api/apiService";
import useApi from "@/hooks/useApi";

import { Button } from "./common/Button";
import { Card, CardContent, CardTitle } from "./common/Card";
import { Section } from "./common/Section";
import DataLoader from "./common/DataLoader";
import ResultDisplay from "./common/ResultDisplay";

// Define Game Modes
type GameMode = "capital" | "country" | null;

// Define Result Types
type ResultType = "correct" | "incorrect" | null;

const Game = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [score, setScore] = useState(0);

  // Updated result state to store type and message
  const [result, setResult] = useState<{
    type: ResultType;
    message: string | null;
  }>({
    type: null,
    message: null,
  });

  // State to disable the form after an answer is given
  const [isAnswered, setIsAnswered] = useState(false);

  // Use the useApi hook
  const {
    data: countries,
    isLoading,
    error,
  } = useApi<Country[]>(() => apiService.trivia.getShuffledCountries());

  // Function to reset the game state
  const resetGame = (mode: GameMode) => {
    setGameMode(mode);
    setCurrentIndex(0);
    setScore(0);
    setUserAnswer("");
    setResult({ type: null, message: null });
    setIsAnswered(false);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserAnswer(e.target.value);
  };

  /**
   * Normalizes an answer string for simple comparison.
   * - Trims whitespace from ends.
   * - Converts to lowercase.
   * - Removes punctuation like ' , . -
   */
  const normalizeAnswer = (answer: string): string => {
    return answer
      .trim()
      .toLowerCase()
      .replace(/[',.-]/g, ""); // Removes ' , . -
  };

  // This is the core logic, translating your 'check_answer' functions
  const handleSubmit = (
    e: React.FormEvent<HTMLFormElement>,
    gameCountries: Country[] // Add this parameter
  ) => {
    e.preventDefault();
    if (isAnswered) return;

    // --- USE THE PARAMETER ---
    const currentQuestion = gameCountries[currentIndex];
    let correctAnswer: string;
    let resultMessage: string;

    // --- START OF CHANGES ---
    const normalizedUserAnswer = normalizeAnswer(userAnswer);
    // --- END OF CHANGES ---

    if (gameMode === "capital") {
      correctAnswer = currentQuestion.capital;
      // --- START OF CHANGES ---
      if (normalizedUserAnswer === normalizeAnswer(correctAnswer)) {
        // --- END OF CHANGES ---
        setResult({ type: "correct", message: "Correct!" });
        setScore(score + 1);
      } else {
        resultMessage = `Incorrect! The capital of ${currentQuestion.name} is ${correctAnswer}.`;
        setResult({ type: "incorrect", message: resultMessage });
      }
    } else {
      // gameMode === "country"
      correctAnswer = currentQuestion.name;
      // --- START OF CHANGES ---
      if (normalizedUserAnswer === normalizeAnswer(correctAnswer)) {
        // --- END OF CHANGES ---
        setResult({ type: "correct", message: "Correct!" });
        setScore(score + 1);
      } else {
        resultMessage = `Incorrect! ${currentQuestion.capital} is the capital of ${correctAnswer}.`;
        setResult({ type: "incorrect", message: resultMessage });
      }
    }

    setIsAnswered(true);
  };

  // Move to the next question
  const handleNextQuestion = () => {
    setIsAnswered(false);
    setResult({ type: null, message: null });
    setUserAnswer("");
    setCurrentIndex(currentIndex + 1);
  };

  // --- RENDER FUNCTIONS ---

  // Renders the main game UI (questions, input, etc.)
  const renderGameInterface = (gameCountries: Country[]) => {
    // Handle Game Over
    // --- USE THE PARAMETER, NOT STATE ---
    const isGameOver = currentIndex >= gameCountries.length;

    if (isGameOver) {
      return (
        <CardContent>
          <CardTitle as="h2" className="text-center mb-4">
            Game Over!
          </CardTitle>
          <p className="text-center text-lg mb-6">
            {/* --- USE THE PARAMETER --- */}
            Your final score is: {score} / {gameCountries.length}
          </p>
          <div className="flex flex-col space-y-4">
            <Button size="lg" fullWidth onClick={() => resetGame(gameMode)}>
              Play Again
            </Button>
            <Button variant="outline" fullWidth onClick={() => resetGame(null)}>
              Back to Menu
            </Button>
          </div>
        </CardContent>
      );
    }

    // Get the current question
    const currentQuestion = gameCountries[currentIndex];
    const questionText =
      gameMode === "capital"
        ? `What is the capital of ${currentQuestion.name}?`
        : `${currentQuestion.capital} is the capital of which country?`;

    return (
      <CardContent>
        {/* Score and Question Counter */}
        <div className="flex justify-between items-center mb-4 text-sm text-gray-300">
          <span className="font-semibold">Score: {score}</span>
          <span>
            {/* --- ADD "Back" BUTTON AND USE THE PARAMETER --- */}
            <Button variant="link" size="sm" onClick={() => resetGame(null)}>
              Back to Game Modes
            </Button>
            | Question: {currentIndex + 1} / {gameCountries.length}
            {/* --- END OF CHANGES --- */}
          </span>
        </div>

        {/* Question Prompt */}
        <CardTitle as="h3" className="text-center mb-6 text-xl">
          {questionText}
        </CardTitle>

        {/* Answer Form */}
        <form onSubmit={(e) => handleSubmit(e, gameCountries)}>
          <input
            type="text"
            value={userAnswer}
            onChange={handleInputChange}
            disabled={isAnswered}
            className="w-full p-3 border border-gray-300 rounded-lg bg-white text-black"
            placeholder="Type your answer..."
          />

          {/* Only show the Submit button inside the form */}
          {!isAnswered && (
            <Button type="submit" size="lg" fullWidth className="mt-4">
              Submit
            </Button>
          )}
        </form>

        {/* Show the Next Question button OUTSIDE the form */}
        {isAnswered && (
          <Button
            type="button"
            size="lg"
            fullWidth
            className="mt-4"
            onClick={handleNextQuestion}
          >
            Next Question
          </Button>
        )}

        {/* Result Area */}
        <ResultDisplay type={result.type} message={result.message} />
      </CardContent>
    );
  };

  // Renders the game mode selection menu
  const renderModeSelection = () => (
    <CardContent>
      <CardTitle as="h2" className="text-center mb-6">
        Choose a Game Mode
      </CardTitle>
      <div className="flex flex-col space-y-4">
        <Button size="lg" fullWidth onClick={() => resetGame("capital")}>
          Guess the Capital
        </Button>
        <Button size="lg" fullWidth onClick={() => resetGame("country")}>
          Guess the Country
        </Button>
      </div>
    </CardContent>
  );

  // --- MAIN COMPONENT RETURN ---
  return (
    <Section id="game">
      <DataLoader<Country>
        isLoading={isLoading}
        error={error}
        data={countries} // This now comes directly from useApi
        emptyMessage="Could not load trivia questions. Please try again later."
      >
        {(loadedCountries) => (
          <Card className="max-w-xl mx-auto shadow-xl">
            {
              !gameMode
                ? renderModeSelection()
                : renderGameInterface(loadedCountries) // Pass the data in
            }
          </Card>
        )}
      </DataLoader>
    </Section>
  );
};

export default Game;
