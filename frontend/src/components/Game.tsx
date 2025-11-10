import { useEffect, useState } from "react";
import { Country, AIAnswerResponse, AIQuestion, GameMode } from "@/types";
import apiService from "@/api/apiService";
import useApi from "@/hooks/useApi";
import { cn } from "@/utils/styleUtils";

import { Button } from "./common/Button";
import { Card, CardContent, CardTitle } from "./common/Card";
import { Section } from "./common/Section";
import DataLoader from "./common/DataLoader";
import ResultDisplay from "./common/ResultDisplay";

// --- GAME MODES & TYPES ---
type ResultType = "correct" | "incorrect" | null;
type GameQuestion = Country | AIQuestion; // Unified question type

// Storage keys for high scores
const HIGH_SCORE_KEYS = {
  capital: "trivia-high-score-capital",
  country: "trivia-high-score-country",
};

const Game = () => {
  // --- STATES ---
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

  // AI Quiz Parameters State
  const [aiQuizParams, setAiQuizParams] = useState<{
    topic: string;
    fresh: boolean;
  } | null>(null);

  // Game ID to force refetching countries
  const [gameId, setGameId] = useState(0);

  // --- DATA STATES ---

  // 1. Country Data
  const {
    data: countries,
    isLoading: isLoadingCountries,
    error: countriesError,
  } = useApi<Country[]>(
    () => apiService.trivia.getShuffledCountries(),
    [gameId] // Hook now refetches when gameId changes
  );

  // 2. AI Quiz Data (fetched on demand)
  const {
    data: aiQuizData,
    isLoading: isLoadingAiQuiz,
    error: aiQuizError,
  } = useApi<AIQuestion[]>(
    () =>
      apiService.aiQuiz.generate(
        aiQuizParams?.topic || "",
        aiQuizParams?.fresh
      ),
    [aiQuizParams], // Re-run when params change
    { skip: !aiQuizParams } // Don't run until params are set
  );

  // 3. Active Game Data (either shuffled countries or AI questions)
  const [gameData, setGameData] = useState<GameQuestion[]>([]);

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

  // --- GAME LOGIC FUNCTIONS ---

  // Resets game to a specific mode
  const startGame = (mode: GameMode) => {
    setGameMode(mode);
    setCurrentIndex(0);
    setScore(0);
    setUserAnswer("");
    setResult({ type: null, message: null });
    setIsAnswered(false);
    setFunFact(null);
    setAiQuizParams(null); // Clear AI quiz params

    if (mode === "capital" || mode === "country") {
      // Force a refetch of shuffled countries from the backend
      setGameId((id) => id + 1);
    }
  };

  // This effect runs when 'countries' data changes (due to the refetch)
  useEffect(() => {
    if ((gameMode === "capital" || gameMode === "country") && countries) {
      setGameData(countries); // Load the new shuffled list
    }
  }, [countries, gameMode]);

  // Fetches and starts a new AI quiz
  const startAiQuiz = (topic: string, fresh: boolean = false) => {
    setGameData([]);
    setGameMode("ai-quiz");

    // This triggers the useApi hook to fetch data
    setAiQuizParams({ topic, fresh });
  };

  // This effect loads the AI quiz data once the useApi hook finishes
  useEffect(() => {
    if (gameMode === "ai-quiz" && aiQuizData) {
      setGameData(aiQuizData as AIQuestion[]);
      // Reset counters *after* data is loaded
      setCurrentIndex(0);
      setScore(0);
      setUserAnswer("");
      setResult({ type: null, message: null });
      setIsAnswered(false);
      setFunFact(null);
    }
  }, [aiQuizData, gameMode]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserAnswer(e.target.value);
  };

  /**
   * Normalizes an answer string for simple comparison.
   */
  const normalizeAnswer = (answer: string): string => {
    return answer
      .trim()
      .toLowerCase()
      .replace(/[',.-]/g, "");
  };

  // Handles answer selection for AI quiz mode
  const handleAiQuizAnswer = (
    option: string,
    activeGameData: GameQuestion[]
  ) => {
    if (isAnswered) return;
    setIsAnswered(true);

    const currentQuestion = activeGameData[currentIndex] as AIQuestion;
    const normalizedUserAnswer = normalizeAnswer(option);
    const normalizedCorrectAnswer = normalizeAnswer(
      currentQuestion.correctAnswer
    );

    setFunFact(currentQuestion.funFact || null);

    if (normalizedUserAnswer === normalizedCorrectAnswer) {
      setResult({ type: "correct", message: "Correct!" });
      setScore(score + 1);
    } else {
      setResult({
        type: "incorrect",
        message: `Incorrect! The correct answer is ${currentQuestion.correctAnswer}.`,
      });
    }
  };

  // Handles answer submission for standard modes
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    activeGameData: GameQuestion[]
  ) => {
    e.preventDefault();
    if (isAnswered) return;

    // Validate non-empty answer
    if (!userAnswer.trim()) {
      setResult({
        type: "incorrect",
        message: 'Please type an answer or click "I don\'t know!"',
      });
      setIsAnswered(true);
      return;
    }

    setIsAnswered(true); // Set answered immediately

    // This must be a Country/Capital question
    const countryQuestion = activeGameData[currentIndex] as Country;
    setFunFact("Loading fun fact...");

    try {
      // Run both API calls in parallel for speed
      const [answerResult, factResult] = await Promise.all([
        apiService.trivia.checkAnswer(
          countryQuestion.id,
          userAnswer,
          gameMode!
        ),
        apiService.trivia.getFunFact(countryQuestion.id),
      ]);

      // --- Handle Answer Result ---
      if (answerResult.error || !answerResult.data) {
        throw new Error(answerResult.error || "No data from AI grader");
      }

      const aiResponse = answerResult.data as AIAnswerResponse;
      let finalMessage = aiResponse.feedback_message;
      if (aiResponse.shared_capital_info) {
        finalMessage += ` (${aiResponse.shared_capital_info})`;
      }

      if (aiResponse.is_correct) {
        setResult({ type: "correct", message: finalMessage });
        setScore(score + (aiResponse.points_awarded || 1));
      } else {
        setResult({ type: "incorrect", message: finalMessage });
      }

      // --- Handle Fun Fact Result ---
      if (factResult.data) {
        setFunFact(factResult.data.fact);
      } else {
        setFunFact(null);
      }
    } catch (err) {
      console.error("Failed to check answer or get fun fact:", err);
      setResult({
        type: "incorrect",
        message: "Error grading answer. Please try again.",
      });
      setFunFact(null); // Clear fun fact on error
    }
  };

  const handleSkipQuestion = async (activeGameData: GameQuestion[]) => {
    if (isAnswered || gameMode === "ai-quiz" || !activeGameData.length) return;
    setIsAnswered(true);
    setFunFact("Loading fun fact..."); // Set loading state

    const currentQuestion = activeGameData[currentIndex] as Country;
    let correctAnswer: string;
    let resultMessage: string;

    if (gameMode === "capital") {
      correctAnswer = currentQuestion.capital.replace(/\|/g, ", ");
      resultMessage = `The capital(s) of ${currentQuestion.name} are: ${correctAnswer}.`;
    } else {
      correctAnswer = currentQuestion.name;
      resultMessage = `${
        currentQuestion.capital.split("|")[0]
      } is the capital of ${correctAnswer}.`;
    }

    setResult({ type: "incorrect", message: resultMessage });

    // Fetch fun fact
    try {
      const factResult = await apiService.trivia.getFunFact(currentQuestion.id);
      if (factResult.data) {
        setFunFact(factResult.data.fact);
      } else {
        setFunFact(null);
      }
    } catch (err) {
      console.error("Failed to fetch fun fact:", err);
      setFunFact(null);
    }
  };

  // Move to the next question
  const handleNextQuestion = (activeGameData: GameQuestion[]) => {
    const nextIndex = currentIndex + 1;

    if (nextIndex >= activeGameData.length && gameMode) {
      if (gameMode === "capital" || gameMode === "country") {
        if (score > highScores[gameMode]) {
          const key = HIGH_SCORE_KEYS[gameMode];
          localStorage.setItem(key, score.toString());
          setHighScores((prevScores) => ({
            ...prevScores,
            [gameMode]: score,
          }));
        }
      }
    }

    setIsAnswered(false);
    setResult({ type: null, message: null }); // Clears the feedback
    setUserAnswer("");
    setFunFact(null); // Clears the fun fact
    setCurrentIndex(nextIndex);
  };

  // --- RENDER FUNCTIONS ---

  // Renders the main game UI
  const renderGameInterface = (activeGameData: GameQuestion[]) => {
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
            {(gameMode === "capital" || gameMode === "country") && (
              <p className="text-lg text-gray-400">
                High Score: {highScores[gameMode]}
              </p>
            )}
          </div>
          <div className="flex flex-col space-y-4">
            <Button
              size="lg"
              fullWidth
              onClick={() => {
                if (gameMode === "ai-quiz") {
                  startAiQuiz(aiQuizParams!.topic, true); // Request fresh questions
                } else {
                  startGame(gameMode); // Triggers a refetch
                }
              }}
            >
              Play Again
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setGameMode(null);
                setGameId((id) => id + 1); // Refetch countries for next time
              }}
            >
              Back to Menu
            </Button>
          </div>
        </CardContent>
      );
    }

    const currentQuestion = activeGameData[currentIndex];
    let questionText = "";
    let options: string[] | null = null;

    if (gameMode === "ai-quiz") {
      const aiQuestion = currentQuestion as AIQuestion;
      questionText = aiQuestion.question;
      options = aiQuestion.options;
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
              onClick={() => {
                setGameMode(null);
                setGameId((id) => id + 1); // Refetch countries for next time
              }}
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
        {gameMode === "ai-quiz" && (
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 -mt-4 mb-4">
            Disclaimer: Answers to AI-generated questions may be inaccurate.
          </p>
        )}
        {/* Answer Form */}
        <form onSubmit={(e) => handleSubmit(e, activeGameData)}>
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
                    handleAiQuizAnswer(option, activeGameData);
                  }}
                >
                  {option}
                </Button>
              ))}
            </div>
          )}

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

          {!isAnswered && gameMode !== "ai-quiz" && (
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={() => handleSkipQuestion(activeGameData)} // <-- Pass activeGameData
              >
                I don't know!🤷🏽
              </Button>
              <Button type="submit" size="lg" fullWidth>
                Submit
              </Button>
            </div>
          )}
        </form>

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

        {/* This will now be correctly cleared on "Next Question" */}
        <ResultDisplay type={result.type} message={result.message} />

        {funFact && (
          <div
            className={cn(
              "mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-center italic",
              "text-gray-900 dark:text-gray-300"
            )}
          >
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
        <div>
          {" "}
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 -mt-4 -mb-2">
            Disclaimer: Answers to AI-generated questions may be inaccurate
          </p>
        </div>
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
          onClick={() =>
            startAiQuiz(
              "Caribbean History (Politics, CARICOM, OECS, Emblems, Mottos, Food, Current Prime Ministers & Presidents)"
            )
          }
        >
          Caribbean History Trivia 🏖️
        </Button>
      </div>
    </CardContent>
  );

  // --- GAME WRAPPER COMPONENT ---
  const GameWrapper = () => {
    // Render AI Quiz loader/error
    if (gameMode === "ai-quiz") {
      if (isLoadingAiQuiz) {
        return (
          <Card className="max-w-xl mx-auto shadow-xl">
            <CardContent>
              <div className="flex flex-col justify-center items-center py-12 min-h-[300px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                <p>Generating your quiz...</p>
              </div>
            </CardContent>
          </Card>
        );
      }
      if (aiQuizError) {
        return (
          <Card className="max-w-xl mx-auto shadow-xl">
            <CardContent>
              <ResultDisplay type="incorrect" message={aiQuizError} />
              <Button
                variant="outline"
                fullWidth
                className="mt-4"
                onClick={() => setGameMode(null)}
              >
                Back to Menu
              </Button>
            </CardContent>
          </Card>
        );
      }

      return (
        <Card className="max-w-xl mx-auto shadow-xl">
          {renderGameInterface(gameData)}
        </Card>
      );
    }

    // Render Standard Game (Menu or Interface)
    // If gameMode is null, show menu. If it's set, show game.
    return (
      <Card className="max-w-xl mx-auto shadow-xl">
        {!gameMode
          ? renderModeSelection()
          : renderGameInterface(gameData.length ? gameData : countries || [])}
      </Card>
    );
  };

  // --- MAIN COMPONENT RETURN ---
  return (
    <Section id="game">
      {/* This DataLoader now *only* worries about the initial country load. */}
      <DataLoader<Country>
        isLoading={isLoadingCountries}
        error={countriesError}
        data={countries} // This is the fix for the "Could not load..." error
        emptyMessage="Could not load trivia questions. Please try again later."
      >
        {() => (
          // Render the Game Wrapper which handles all game modes
          <GameWrapper />
        )}
      </DataLoader>
    </Section>
  );
};

export default Game;
