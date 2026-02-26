import { useEffect, useState } from "react";
import { Country, AIAnswerResponse, AIQuestion, GameMode } from "@/types";
import apiService from "@/api/apiService";
import useApi from "@/hooks/useApi";
import { cn } from "@/utils/styleUtils";

import { Button } from "./common/Button";
import { Card, CardContent, CardTitle } from "./common/Card";
import { ReportModal } from "./common/ReportModal";
import { ToolTip } from "./common/ToolTip";
import { Section } from "./common/Section";
import DataLoader from "./common/DataLoader";
import ResultDisplay from "./common/ResultDisplay";

type ResultType = "correct" | "incorrect" | null;
type GameQuestion = Country | AIQuestion;

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
  }>({ type: null, message: null });
  const [isAnswered, setIsAnswered] = useState(false);
  const [highScores, setHighScores] = useState({ capital: 0, country: 0 });
  const [funFact, setFunFact] = useState<string | null>(null);
  const [aiQuizParams, setAiQuizParams] = useState<{
    topic: string;
    fresh: boolean;
  } | null>(null);
  const [gameId, setGameId] = useState(0);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const {
    data: countries,
    isLoading: isLoadingCountries,
    error: countriesError,
  } = useApi<Country[]>(
    () => apiService.trivia.getShuffledCountries(),
    [gameId],
  );

  const {
    data: aiQuizData,
    isLoading: isLoadingAiQuiz,
    error: aiQuizError,
  } = useApi<AIQuestion[]>(
    () =>
      apiService.aiQuiz.generate(
        aiQuizParams?.topic || "",
        aiQuizParams?.fresh,
      ),
    [aiQuizParams],
    { skip: !aiQuizParams },
  );

  const [gameData, setGameData] = useState<GameQuestion[]>([]);

  useEffect(() => {
    const capitalScore = localStorage.getItem(HIGH_SCORE_KEYS.capital);
    const countryScore = localStorage.getItem(HIGH_SCORE_KEYS.country);
    setHighScores({
      capital: capitalScore ? parseInt(capitalScore, 10) : 0,
      country: countryScore ? parseInt(countryScore, 10) : 0,
    });
  }, []);

  const normalizeAnswer = (answer: string): string => {
    return answer
      .trim()
      .toLowerCase()
      .replace(/[',.-]/g, "");
  };

  const startGame = (mode: GameMode) => {
    setGameData([]);
    setGameMode(mode);
    setCurrentIndex(0);
    setScore(0);
    setUserAnswer("");
    setResult({ type: null, message: null });
    setIsAnswered(false);
    setFunFact(null);
    setAiQuizParams(null);
    if (mode === "capital" || mode === "country") setGameId((id) => id + 1);
  };

  useEffect(() => {
    if ((gameMode === "capital" || gameMode === "country") && countries)
      setGameData(countries);
  }, [countries, gameMode]);

  const startAiQuiz = (topic: string, fresh: boolean = false) => {
    setGameData([]);
    setGameMode("ai-quiz");
    setAiQuizParams({ topic, fresh });
  };

  useEffect(() => {
    if (gameMode === "ai-quiz" && aiQuizData && !aiQuizError) {
      setGameData(aiQuizData as AIQuestion[]);
      setCurrentIndex(0);
      setScore(0);
      setUserAnswer("");
      setResult({ type: null, message: null });
      setIsAnswered(false);
      setFunFact(null);
    }
  }, [aiQuizData, aiQuizError, gameMode]);

  const handleAiQuizAnswer = (
    option: string,
    activeGameData: GameQuestion[],
  ) => {
    if (isAnswered) return;
    setIsAnswered(true);
    const q = activeGameData[currentIndex] as AIQuestion;
    const isCorrect =
      normalizeAnswer(option) === normalizeAnswer(q.correctAnswer);

    setResult({
      type: isCorrect ? "correct" : "incorrect",
      message: isCorrect
        ? "Correct!"
        : `Incorrect 😔, the correct answer was ${q.correctAnswer}`,
    });
    if (isCorrect) setScore((s) => s + 1);
    setFunFact(q.funFact || null);
  };

  const processAnswer = async (
    answerToSubmit: string,
    activeGameData: GameQuestion[],
  ) => {
    if (isAnswered) return;
    setIsAnswered(true);

    const isSkipped = answerToSubmit.trim() === "";
    const countryQuestion = activeGameData[currentIndex] as Country;
    const capitalName = countryQuestion.capital.split("|")[0];
    const countryName = countryQuestion.name;
    setFunFact("Loading fun fact...");

    if (isSkipped) {
      setResult({
        type: null,
        message:
          gameMode === "capital"
            ? `The capital of ${countryName} is ${capitalName}`
            : `${capitalName} is the capital of ${countryName}`,
      });
      apiService.trivia
        .getFunFact(countryQuestion.id)
        .then((res) => {
          if (res.data) setFunFact(res.data.fact);
        })
        .catch(() => setFunFact(null));
      return;
    }

    try {
      const [answerResult, factResult] = await Promise.all([
        apiService.trivia.checkAnswer(
          countryQuestion.id,
          answerToSubmit,
          gameMode!,
        ),
        apiService.trivia.getFunFact(countryQuestion.id),
      ]);

      if (answerResult.error) {
        throw new Error(answerResult.error);
      }

      const aiResponse = answerResult.data as AIAnswerResponse;

      // Display the fully formatted response straight from the backend API
      if (aiResponse.is_correct) {
        setResult({ type: "correct", message: aiResponse.feedback_message });
        setScore((s) => s + (aiResponse.points_awarded || 1));
      } else {
        setResult({
          type: "incorrect",
          message: aiResponse.feedback_message || "Incorrect 😔",
        });
      }

      if (factResult.data) setFunFact(factResult.data.fact);
    } catch (err) {
      // Cleaned up: Only triggers if the Django backend is totally unreachable or returns a 500 error
      setResult({
        type: "incorrect",
        message: "Error connecting to the grading server. Please try again.",
      });
      setFunFact(null);
    }
  };

  const handleNextQuestion = (activeGameData: GameQuestion[]) => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= activeGameData.length && gameMode) {
      if (gameMode === "capital" || gameMode === "country") {
        if (score > highScores[gameMode]) {
          localStorage.setItem(HIGH_SCORE_KEYS[gameMode], score.toString());
          setHighScores((prev) => ({ ...prev, [gameMode]: score }));
        }
      }
    }
    setIsAnswered(false);
    setResult({ type: null, message: null });
    setUserAnswer("");
    setFunFact(null);
    setCurrentIndex(nextIndex);
  };

  const renderGameInterface = (activeGameData: GameQuestion[]) => {
    const isGameOver = currentIndex >= activeGameData.length;
    if (isGameOver) {
      return (
        <CardContent>
          <CardTitle as="h2" className="text-center mb-4">
            Game Over!
          </CardTitle>
          <div className="text-center mb-6">
            <p className="text-2xl mb-2">
              Your final score is: {score} / {activeGameData.length}
            </p>
            {(gameMode === "capital" || gameMode === "country") && (
              <p className="text-lg opacity-60">
                High Score: {highScores[gameMode]}
              </p>
            )}
          </div>
          <div className="flex flex-col space-y-4">
            <Button
              size="lg"
              fullWidth
              onClick={() =>
                gameMode === "ai-quiz"
                  ? startAiQuiz(aiQuizParams!.topic, true)
                  : startGame(gameMode)
              }
            >
              Play Again
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setGameMode(null);
                setGameId((id) => id + 1);
              }}
            >
              Back to Menu
            </Button>
          </div>
        </CardContent>
      );
    }

    const currentQuestion = activeGameData[currentIndex];
    let questionText =
      gameMode === "ai-quiz"
        ? (currentQuestion as AIQuestion).question
        : gameMode === "capital"
          ? `What is the capital of ${(currentQuestion as Country).name}?`
          : `${(currentQuestion as Country).capital.split("|")[0]} is the capital of which country?`;

    return (
      <CardContent>
        <div className="flex justify-center mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setGameMode(null);
              setGameId((id) => id + 1);
            }}
          >
            Back to Main Menu
          </Button>
        </div>
        <div className="flex justify-between items-center mb-4 text-sm opacity-60">
          <span className="font-semibold">Score: {score}</span>
          <span>
            Question: {currentIndex + 1} / {activeGameData.length}
          </span>
        </div>
        <CardTitle as="h3" className="text-center mb-6 text-xl">
          {questionText}
        </CardTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isAnswered && userAnswer.trim())
              processAnswer(userAnswer, activeGameData);
          }}
        >
          {gameMode === "ai-quiz" &&
            (currentQuestion as AIQuestion).options && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {(currentQuestion as AIQuestion).options.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant="outline"
                    fullWidth
                    disabled={isAnswered}
                    onClick={() => handleAiQuizAnswer(option, activeGameData)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            )}
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            disabled={isAnswered}
            className={cn(
              "w-full p-3 border rounded-lg bg-white text-black border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
              gameMode === "ai-quiz" ? "hidden" : "block",
            )}
            placeholder="Type your answer..."
            autoFocus
          />
          {!isAnswered && gameMode !== "ai-quiz" && (
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                fullWidth
                onClick={() => processAnswer("", activeGameData)}
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
        <ResultDisplay type={result.type} message={result.message} />
        {funFact && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-black rounded-lg text-sm text-center italic border border-gray-200 dark:border-neutral-800">
            {funFact}
          </div>
        )}
        {/* Report Issue Toggle */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="text-xs opacity-50 hover:opacity-100 underline transition-opacity duration-200"
          >
            Report an issue with this question
          </button>
        </div>
      </CardContent>
    );
  };

  const renderModeSelection = () => (
    <CardContent>
      <CardTitle as="h2" className="text-center mb-6">
        Choose a Game Mode
      </CardTitle>
      <div className="flex flex-col space-y-4">
        <Button
          size="lg"
          fullWidth
          onClick={() => startGame("capital")}
          disabled={!countries?.length}
        >
          <span>Guess the Capital </span>
          <div className="text-xs font-normal opacity-60">
            (High Score: {highScores.capital})
          </div>
        </Button>
        <Button
          size="lg"
          fullWidth
          onClick={() => startGame("country")}
          disabled={!countries?.length}
        >
          <span>Guess the Country </span>
          <div className="text-xs font-normal opacity-60">
            (High Score: {highScores.country})
          </div>
        </Button>
        <CardTitle
          as="h3"
          className="text-center pt-4 border-t border-gray-200 dark:border-neutral-800 flex items-center justify-center gap-2"
        >
          AI-Generated Quizzes
          <ToolTip text="Trivia is based on historical data available up to January 2025." />
        </CardTitle>
        <Button
          size="lg"
          variant="outline"
          fullWidth
          onClick={() => startAiQuiz("Formula 1", true)}
        >
          F1 🏎️
        </Button>
        <Button
          size="lg"
          variant="outline"
          fullWidth
          onClick={() => startAiQuiz("English Premier League", true)}
        >
          English Premier League ⚽
        </Button>
        <Button
          size="lg"
          variant="outline"
          fullWidth
          onClick={() => startAiQuiz("Caribbean History", true)}
        >
          Caribbean History 🏖️
        </Button>
      </div>
    </CardContent>
  );

  const GameWrapper = () => {
    const cardBase =
      "max-w-xl mx-auto shadow-xl bg-white dark:bg-black text-neutral-900 dark:text-white border-2 border-gray-200 dark:border-neutral-800";

    // 1. Loading State
    if (gameMode === "ai-quiz" && isLoadingAiQuiz) {
      return (
        <Card className={cardBase}>
          <CardContent>
            <div className="flex flex-col justify-center items-center py-12 min-h-75">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
              <p>Generating your quiz...</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    // 2. Error State (When AI is down or rate-limited for quizzes)
    if (gameMode === "ai-quiz" && aiQuizError) {
      return (
        <Card className={cardBase}>
          <CardContent>
            <div className="flex flex-col justify-center items-center py-12 min-h-75 text-center">
              <div className="text-red-500 mb-4 text-5xl">⚠️</div>
              <CardTitle as="h3" className="mb-2 text-xl font-bold">
                AI Quizzes Currently Unavailable
              </CardTitle>
              <p className="opacity-70 mb-6">
                The AI service is currently down or rate-limited. Please try
                again later.
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  setGameMode(null);
                  setAiQuizParams(null);
                }}
              >
                Back to Menu
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Extract context for the bug report based on game mode
    const currentQuestionContext = gameData[currentIndex];
    const reportCountryName =
      gameMode === "capital" || gameMode === "country"
        ? (currentQuestionContext as Country)?.name
        : undefined;
    const reportQuestionId =
      gameMode === "ai-quiz"
        ? (currentQuestionContext as AIQuestion)?.id
        : undefined;

    // 3. Normal Game State
    return (
      <>
        <Card className={cardBase}>
          {!gameMode
            ? renderModeSelection()
            : renderGameInterface(gameData.length ? gameData : countries || [])}
        </Card>

        {/* NEW: Render the Modal */}
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          countryName={reportCountryName}
          questionId={reportQuestionId}
        />
      </>
    );
  };

  return (
    <Section id="game">
      <DataLoader
        isLoading={isLoadingCountries}
        error={countriesError}
        data={countries}
        emptyMessage="Could not load trivia questions."
      >
        {() => <GameWrapper />}
      </DataLoader>
    </Section>
  );
};

export default Game;
