// frontend/src/components/Game.tsx
import { useEffect, useState } from "react";
import { Country, AIAnswerResponse, AIQuestion } from "@/types";
import apiService from "@/api/apiService";
import useApi from "@/hooks/useApi";

import { Button } from "./common/Button";
import { Card, CardContent, CardTitle } from "./common/Card";
import { Section } from "./common/Section";
import DataLoader from "./common/DataLoader";
import ResultDisplay from "./common/ResultDisplay";

type GameMode = "capital" | "country" | "ai-quiz" | null;
type ResultType = "correct" | "incorrect" | null;
type GameQuestion = Country | AIQuestion;

// Storage keys for high scores
const HIGH_SCORE_KEYS = {
  capital: "trivia-high-score-capital",
  country: "trivia-high-score-country",
};

const Game = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<{
    type: ResultType;
    message: string | null;
  }>({
    type: null,
    message: null,
  });
  const [isAnswered, setIsAnswered] = useState(false);
  const [highScores, setHighScores] = useState({ capital: 0, country: 0 });
  const [funFact, setFunFact] = useState<string | null>(null); // For Feature 2
  const [currentAiTopic, setCurrentAiTopic] = useState<string>(""); // For Feature 3

  // This state holds the *raw* country data
  const {
    data: countries,
    isLoading: isLoadingCountries,
    error: countriesError,
  } = useApi<Country[]>(
    () => apiService.trivia.getShuffledCountries(),
    ["countries"]
  );

  // This state holds the *active* game data (could be countries or AI questions)
  const [gameData, setGameData] = useState<GameQuestion[]>([]);
  const [isLoadingGame, setIsLoadingGame] = useState(true);
  const [gameError, setGameError] = useState<string | null>(null);

  // --- EFFECTS ---

  // Load high scores from localStorage
  useEffect(() => {
    const capitalScore = localStorage.getItem(HIGH_SCORE_KEYS.capital);
    const countryScore = localStorage.getItem(HIGH_SCORE_KEYS.country);
    setHighScores({
      capital: capitalScore ? parseInt(capitalScore, 10) : 0,
      country: countryScore ? parseInt(countryScore, 10) : 0,
    });
  }, []);

  useEffect(() => {
    setIsLoadingGame(isLoadingCountries);
  }, [isLoadingCountries]);

  useEffect(() => {
    setGameError(countriesError);
  }, [countriesError]);

  // --- GAME LOGIC FUNCTIONS ---

  // Resets and starts a new game
  const startGame = (mode: GameMode) => {
    setGameMode(mode);
    setCurrentIndex(0);
    setScore(0);
    setUserAnswer("");
    setResult({ type: null, message: null });
    setIsAnswered(false);
    setFunFact(null);
    setGameError(null); // Clear errors on new game

    // If it's a standard game, just use the loaded countries
    if (mode === "capital" || mode === "country") {
      if (countries) {
        // Re-shuffle the countries for a new game
        const shuffledCountries = [...countries].sort(
          () => Math.random() - 0.5
        );
        setGameData(shuffledCountries);
      } else if (countriesError) {
        setGameError(countriesError);
      }
    }
  };

  // Fetches and starts a new AI quiz
  const startAiQuiz = async (topic: string) => {
    setIsLoadingGame(true);
    setGameError(null);
    setGameData([]);
    setCurrentAiTopic(topic); // Remember the topic for "Play Again"

    const result = await apiService.aiQuiz.generate(topic);

    if (result.error || !result.data || result.data.length === 0) {
      setGameError(result.error || "Failed to generate AI quiz.");
    } else {
      setGameData(result.data as AIQuestion[]);
      startGame("ai-quiz"); // Call startGame to reset states
    }
    setIsLoadingGame(false);
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
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    activeGameData: GameQuestion[]
  ) => {
    e.preventDefault();
    if (isAnswered) return;
    setIsAnswered(true); // Set answered immediately

    const currentQuestion = activeGameData[currentIndex];

    // --- AI Quiz Logic (Feature 3) ---
    if (gameMode === "ai-quiz") {
      const aiQuestion = currentQuestion as AIQuestion;
      const normalizedUserAnswer = normalizeAnswer(userAnswer);
      const normalizedCorrectAnswer = normalizeAnswer(aiQuestion.correctAnswer);

      if (normalizedUserAnswer === normalizedCorrectAnswer) {
        setResult({ type: "correct", message: "Correct!" });
        setScore(score + 1);
      } else {
        setResult({
          type: "incorrect",
          message: `Incorrect! The correct answer is ${aiQuestion.correctAnswer}.`,
        });
      }
      return; // Stop here for AI quiz
    }

    // --- Country/Capital Logic (Feature 1) ---
    const countryQuestion = currentQuestion as Country;
    setFunFact("Loading fun fact..."); // For Feature 2

    try {
      // Pass the gameMode to the API
      const result = await apiService.trivia.checkAnswer(
        countryQuestion.id,
        userAnswer,
        gameMode! // We know gameMode is 'capital' or 'country' here
      );

      if (result.error || !result.data) {
        throw new Error(result.error || "No data from AI grader");
      }

      const aiResponse = result.data as AIAnswerResponse; // Use our flexible type

      // Construct final feedback message
      let finalMessage = aiResponse.feedback_message;

      // Check if shared_capital_info exists (it's optional)
      if (aiResponse.shared_capital_info) {
        finalMessage += ` (${aiResponse.shared_capital_info})`;
      }

      if (aiResponse.is_correct) {
        setResult({ type: "correct", message: finalMessage });

        // Use points_awarded if it exists, otherwise default to 1
        setScore(score + (aiResponse.points_awarded || 1));
      } else {
        setResult({ type: "incorrect", message: finalMessage });
      }
    } catch (err) {
      console.error("Failed to check answer:", err);
      // Fallback message if API fails
      setResult({
        type: "incorrect",
        message: "Error grading answer. Please try again.",
      });
    }

    // --- Fun Fact Logic (Feature 2) ---
    try {
      const factResult = await apiService.trivia.getFunFact(countryQuestion.id);
      if (factResult.data) {
        setFunFact(factResult.data.fact);
      } else {
        setFunFact(null); // Don't show if it fails
      }
    } catch (err) {
      console.error("Failed to fetch fun fact:", err);
      setFunFact(null);
    }
  };

  // Handle skipping a question
  const handleSkipQuestion = (
    gameCountries: Country[] // Add this parameter
  ) => {
    if (isAnswered) return;

    const currentQuestion = gameCountries[currentIndex];
    let correctAnswer: string;
    let resultMessage: string;

    if (gameMode === "capital") {
      correctAnswer = currentQuestion.capital.replace("|", ", ");
      resultMessage = `The capital(s) of ${currentQuestion.name} are: ${correctAnswer}.`;
    } else {
      // gameMode === "country"
      correctAnswer = currentQuestion.name;
      resultMessage = `${
        currentQuestion.capital.split("|")[0]
      } is the capital of ${correctAnswer}.`;
    }

    setResult({ type: "incorrect", message: resultMessage });
    setIsAnswered(true);
    setFunFact(null); // Don't fetch fun fact on skip
  };

  // Move to the next question
  const handleNextQuestion = (activeGameData: GameQuestion[]) => {
    const nextIndex = currentIndex + 1;

    // Check if game is over
    if (nextIndex >= activeGameData.length && gameMode) {
      // High score logic only for standard modes
      if (gameMode === "capital" || gameMode === "country") {
        if (score > highScores[gameMode]) {
          const key = HIGH_SCORE_KEYS[gameMode];
          localStorage.setItem(key, score.toString());
          // Update the high scores state
          setHighScores((prevScores) => ({
            ...prevScores,
            [gameMode]: score,
          }));
        }
      }
    }

    // Move to next question or game over screen
    setIsAnswered(false);
    setResult({ type: null, message: null });
    setUserAnswer("");
    setFunFact(null); // Clear fun fact
    setCurrentIndex(nextIndex);
  };

  // --- RENDER FUNCTIONS ---

  // Renders the main game UI (questions, input, etc.)
  const renderGameInterface = (activeGameData: GameQuestion[]) => {
    // Handle Game Over
    const isGameOver = currentIndex >= activeGameData.length;

    if (isGameOver) {
      return (
        <CardContent>
          <CardTitle as="h2" className="text-center mb-4">
            Game Over!
          </CardTitle>
          <div className="text-center mb-6">
            <p className="text-white text-2xl mb-2">
              Your final score is: {score} / {activeGameData.length}
            </p>
            {/* Only show high score for standard modes */}
            {(gameMode === "capital" || gameMode === "country") && (
              <p className="text-lg text-gray-400">
                High Score: {gameMode && highScores[gameMode]}
              </p>
            )}
          </div>
          <div className="flex flex-col space-y-4">
            <Button
              size="lg"
              fullWidth
              onClick={() => {
                if (gameMode === "ai-quiz") {
                  startAiQuiz(currentAiTopic); // Replay AI quiz
                } else {
                  startGame(gameMode); // Replay standard game
                }
              }}
            >
              Play Again
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => setGameMode(null)} // Go back to menu
            >
              Back to Menu
            </Button>
          </div>
        </CardContent>
      );
    }

    // Get the current question
    const currentQuestion = activeGameData[currentIndex];
    let questionText = "";
    let options: string[] | null = null;

    // --- Logic to display correct question type ---
    if (gameMode === "ai-quiz") {
      const aiQuestion = currentQuestion as AIQuestion;
      questionText = aiQuestion.question;
      options = aiQuestion.options; // We'll render these later
    } else {
      const countryQuestion = currentQuestion as Country;
      questionText =
        gameMode === "capital"
          ? `What is the capital of ${countryQuestion.name}?`
          : `${
              countryQuestion.capital.split("|")[0]
            } is the capital of which country?`;
    }

    return (
      <CardContent>
        {/* Score and Question Counter */}
        <div className="flex justify-between items-center mb-4 text-sm text-gray-300">
          <span className="font-semibold">Score: {score}</span>
          <span>
            <Button
              variant="link"
              size="sm"
              onClick={() => setGameMode(null)} // Go back to menu
            >
              Back to Game Modes
            </Button>
            | Question: {currentIndex + 1} / {activeGameData.length}
          </span>
        </div>

        {/* Question Prompt */}
        <CardTitle as="h3" className="text-center mb-6 text-xl">
          {questionText}
        </CardTitle>

        {/* Answer Form */}
        <form onSubmit={(e) => handleSubmit(e, activeGameData)}>
          {/* Render options for AI quiz */}
          {gameMode === "ai-quiz" && options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {options.map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant="outline"
                  fullWidth
                  disabled={isAnswered}
                  onClick={() => {
                    setUserAnswer(option);
                    // Manually submit form
                    const fakeEvent = {
                      preventDefault: () => {},
                    } as React.FormEvent<HTMLFormElement>;
                    handleSubmit(fakeEvent, activeGameData);
                  }}
                >
                  {option}
                </Button>
              ))}
            </div>
          )}

          {/* Text Input (always shown, but hidden for AI quiz to save space) */}
          <input
            type="text"
            value={userAnswer}
            onChange={handleInputChange}
            disabled={isAnswered}
            className={cn(
              "w-full p-3 border border-gray-300 rounded-lg bg-white text-black",
              gameMode === "ai-quiz" ? "hidden" : "block" // Hide for AI quiz
            )}
            placeholder="Type your answer..."
            autoFocus
          />

          {/* Action Buttons (don't show for AI quiz) */}
          {!isAnswered && gameMode !== "ai-quiz" && (
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={() => handleSkipQuestion(countries || [])}
              >
                I don't know!🤷🏽
              </Button>
              <Button type="submit" size="lg" fullWidth>
                Submit
              </Button>
            </div>
          )}
        </form>

        {/* Show the Next Question button OUTSIDE the form */}
        {isAnswered && (
          <Button
            type="button"
            size="lg"
            fullWidth
            className="mt-4"
            onClick={() => handleNextQuestion(activeGameData)}
          >
            Next Question
          </Button>
        )}

        {/* Result Area */}
        <ResultDisplay type={result.type} message={result.message} />

        {/* Fun Fact Area (only for standard modes) */}
        {funFact && (
          <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-sm text-center italic">
            {funFact}
          </div>
        )}
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
        {/* Standard Modes */}
        <Button
          size="lg"
          fullWidth
          onClick={() => startGame("capital")}
          disabled={!countries || countries.length === 0}
        >
          <span>Guess the Capital </span>
          <div className="text-xs font-normal text-gray-400">
            (High Score: {highScores.capital})
          </div>
        </Button>
        <Button
          size="lg"
          fullWidth
          onClick={() => startGame("country")}
          disabled={!countries || countries.length === 0}
        >
          <span>Guess the Country </span>
          <div className="text-xs font-normal text-gray-400">
            (High Score: {highScores.country})
          </div>
        </Button>

        {/* AI QUIZ BUTTONS */}
        <CardTitle
          as="h3"
          className="text-center pt-4 border-t border-gray-700"
        >
          AI-Generated Quizzes
        </CardTitle>
        <Button
          size="lg"
          variant="outline"
          fullWidth
          onClick={() => startAiQuiz("Formula 1")}
        >
          F1 Trivia 🏎️
        </Button>
        <Button
          size="lg"
          variant="outline"
          fullWidth
          onClick={() => startAiQuiz("World Football (Soccer)")}
        >
          Football Trivia ⚽
        </Button>
        <Button
          size="lg"
          variant="outline"
          fullWidth
          onClick={() => startAiQuiz("Credit Card Points and Miles")}
        >
          Travel Hacking Trivia ✈️
        </Button>
      </div>
    </CardContent>
  );

  // --- MAIN COMPONENT RETURN ---
  return (
    <Section id="game">
      <DataLoader<GameQuestion>
        isLoading={isLoadingGame} // Use the new generic loading state
        error={gameError} // Use the new generic error state
        data={gameData} // Use the new generic gameData state
        emptyMessage="Could not load trivia questions. Please try again later."
      >
        {(loadedGameData) => (
          <Card className="max-w-xl mx-auto shadow-xl">
            {
              !gameMode
                ? renderModeSelection()
                : renderGameInterface(loadedGameData) // Pass the data in
            }
          </Card>
        )}
      </DataLoader>
    </Section>
  );
};

export default Game;
