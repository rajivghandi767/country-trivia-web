import { useState } from "react";
import { Country, AIQuestion, GameMode } from "@/types";
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
} as const;

const CARD_BASE_CLASSES =
  "max-w-xl mx-auto shadow-xl bg-bg-light dark:bg-bg-dark text-brand-light dark:text-brand-dark border-2 border-gray-200 dark:border-neutral-800 transition-colors duration-200";

function loadInitialHighScores(): { capital: number; country: number } {
  if (typeof window === "undefined") {
    return { capital: 0, country: 0 };
  }
  const capitalScore = localStorage.getItem(HIGH_SCORE_KEYS.capital);
  const countryScore = localStorage.getItem(HIGH_SCORE_KEYS.country);
  return {
    capital: capitalScore ? parseInt(capitalScore, 10) : 0,
    country: countryScore ? parseInt(countryScore, 10) : 0,
  };
}

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
  const [highScores, setHighScores] = useState(loadInitialHighScores);
  const [funFact, setFunFact] = useState<string | null>(null);
  const [revealedCountryName, setRevealedCountryName] = useState<
    string | undefined
  >(undefined);
  const [aiQuizParams, setAiQuizParams] = useState<{
    topic: string;
    runId: number;
  } | null>(null);
  const [gameId, setGameId] = useState(0);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const {
    data: countries,
    isLoading: isLoadingCountries,
    error: countriesError,
  } = useApi<Country[]>(
    () => apiService.trivia.getShuffledCountries(gameMode),
    [gameId, gameMode],
    { skip: gameMode === "ai-quiz" },
  );

  const {
    data: aiQuizData,
    isLoading: isLoadingAiQuiz,
    error: aiQuizError,
  } = useApi<AIQuestion[]>(
    () => apiService.aiQuiz.generate(aiQuizParams?.topic ?? ""),
    [aiQuizParams],
    { skip: !aiQuizParams },
  );

  const activeGameData: GameQuestion[] =
    gameMode === "ai-quiz" ? (aiQuizData ?? []) : (countries ?? []);

  const resetTurnState = () => {
    setCurrentIndex(0);
    setScore(0);
    setUserAnswer("");
    setResult({ type: null, message: null });
    setIsAnswered(false);
    setFunFact(null);
    setRevealedCountryName(undefined);
  };

  const startGame = (mode: GameMode) => {
    resetTurnState();
    setGameMode(mode);
    setAiQuizParams(null);
    if (mode === "capital" || mode === "country") {
      setGameId((id) => id + 1);
    }
  };

  const startAiQuiz = (topic: string) => {
    resetTurnState();
    setGameMode("ai-quiz");
    setAiQuizParams((prev) => ({ topic, runId: (prev?.runId ?? 0) + 1 }));
  };

  const handleAiQuizAnswer = async (
    option: string,
    questions: GameQuestion[],
  ) => {
    if (isAnswered) return;
    setIsAnswered(true);

    const q = questions[currentIndex] as AIQuestion;
    setFunFact("Loading result...");

    try {
      const response = await apiService.aiQuiz.checkAnswer(q.id, option);
      if (response.error || !response.data) {
        throw new Error(response.error ?? "Failed to grade");
      }

      const { is_correct, correct_answer, fun_fact } = response.data;

      setResult({
        type: is_correct ? "correct" : "incorrect",
        message: is_correct
          ? "Correct!"
          : `Incorrect 😔, the correct answer was ${correct_answer}`,
      });

      if (is_correct) setScore((s) => s + 1);
      setFunFact(fun_fact || null);
    } catch {
      setResult({
        type: "incorrect",
        message: "Error connecting to the grading server. Please try again.",
      });
      setFunFact(null);
    }
  };

  /**
   * Core Game Logic: Processing a user's answer via a single Smart-Server round-trip.
   *
   * Delegates both answer evaluation (or skip reveal) and fun-fact retrieval to a single
   * POST `/api/trivia/{id}/check-answer/` request, keeping the client dumb and eliminating
   * answer-key exposure in the browser.
   */
  const processAnswer = async (
    answerToSubmit: string,
    questions: GameQuestion[],
  ) => {
    if (isAnswered) return;
    setIsAnswered(true);

    const isSkipped = answerToSubmit.trim() === "";
    const countryQuestion = questions[currentIndex] as Country;
    setFunFact("Loading fun fact...");

    try {
      const answerResult = await apiService.trivia.checkAnswer(
        countryQuestion.id,
        answerToSubmit,
        gameMode,
        isSkipped,
      );

      if (answerResult.error || !answerResult.data) {
        throw new Error(answerResult.error ?? "Failed to grade answer");
      }

      const aiResponse = answerResult.data;
      if (aiResponse.country_name) {
        setRevealedCountryName(aiResponse.country_name);
      }

      if (aiResponse.is_skipped || isSkipped) {
        setResult({
          type: null,
          message: aiResponse.feedback_message,
        });
      } else if (aiResponse.is_correct) {
        setResult({ type: "correct", message: aiResponse.feedback_message });
        setScore((s) => s + (aiResponse.points_awarded ?? 1));
      } else {
        setResult({
          type: "incorrect",
          message: aiResponse.feedback_message || "Incorrect 😔",
        });
      }

      setFunFact(aiResponse.fun_fact ?? null);
    } catch {
      setResult({
        type: "incorrect",
        message: "Error connecting to the grading server. Please try again.",
      });
      setFunFact(null);
    }
  };

  const handleNextQuestion = (questions: GameQuestion[]) => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length && gameMode) {
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
    setRevealedCountryName(undefined);
    setCurrentIndex(nextIndex);
  };

  const renderGameInterface = (questions: GameQuestion[]) => {
    const isGameOver = currentIndex >= questions.length;
    if (isGameOver) {
      return (
        <CardContent>
          <CardTitle as="h2" className="text-center mb-4">
            Game Over!
          </CardTitle>
          <div className="text-center mb-6">
            <p className="text-2xl mb-2 text-brand-light dark:text-brand-dark">
              Your final score is: {score} / {questions.length}
            </p>
            {(gameMode === "capital" || gameMode === "country") && (
              <p className="text-lg opacity-60 text-brand-light dark:text-brand-dark">
                High Score: {highScores[gameMode]}
              </p>
            )}
          </div>
          <div className="flex flex-col space-y-4">
            <Button
              size="lg"
              fullWidth
              onClick={() => {
                if (gameMode === "ai-quiz" && aiQuizParams) {
                  startAiQuiz(aiQuizParams.topic);
                } else {
                  startGame(gameMode);
                }
              }}
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

    const currentQuestion = questions[currentIndex];
    const questionText =
      gameMode === "ai-quiz"
        ? (currentQuestion as AIQuestion).question
        : gameMode === "capital"
          ? `What is the capital of ${(currentQuestion as Country).name}?`
          : `${(currentQuestion as Country).capital} is the capital of which country?`;

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
        <div className="flex justify-between items-center mb-4 text-sm opacity-60 text-brand-light dark:text-brand-dark">
          <span className="font-semibold">Score: {score}</span>
          <span>
            Question: {currentIndex + 1} / {questions.length}
          </span>
        </div>
        <CardTitle as="h3" className="text-center mb-6 text-xl">
          {questionText}
        </CardTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isAnswered && userAnswer.trim()) {
              void processAnswer(userAnswer, questions);
            }
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
                    onClick={() => void handleAiQuizAnswer(option, questions)}
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
              "w-full p-3 border rounded-lg bg-bg-light dark:bg-bg-dark text-brand-light dark:text-brand-dark border-gray-300 dark:border-neutral-700 focus:outline-none focus:border-brand-light dark:focus:border-brand-dark focus:ring-1 focus:ring-brand-light dark:focus:ring-brand-dark transition-colors",
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
                variant="secondary"
                onClick={() => void processAnswer("", questions)}
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
            className="mt-4 animate-fade-in"
            onClick={() => handleNextQuestion(questions)}
          >
            Next Question
          </Button>
        )}
        <ResultDisplay type={result.type} message={result.message} />
        {funFact && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-neutral-900 rounded-lg text-sm text-center italic border border-gray-200 dark:border-neutral-800 text-brand-light dark:text-brand-dark animate-fade-in-up">
            {funFact}
          </div>
        )}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="text-xs text-brand-light dark:text-brand-dark opacity-50 hover:opacity-100 underline transition-opacity duration-200"
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
          <div className="text-xs font-normal opacity-60 ml-2">
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
          <div className="text-xs font-normal opacity-60 ml-2">
            (High Score: {highScores.country})
          </div>
        </Button>
        <CardTitle
          as="h3"
          className="text-center pt-4 border-t border-gray-200 dark:border-neutral-800 flex items-center justify-center gap-2 mt-2"
        >
          AI-Generated Quizzes
          <ToolTip text="Trivia is based on historical data available up to January 2025." />
        </CardTitle>
        <Button
          size="lg"
          variant="outline"
          fullWidth
          onClick={() => startAiQuiz("Formula 1")}
        >
          F1 🏎️
        </Button>
        <Button
          size="lg"
          variant="outline"
          fullWidth
          onClick={() => startAiQuiz("English Premier League")}
        >
          English Premier League ⚽
        </Button>
        <Button
          size="lg"
          variant="outline"
          fullWidth
          onClick={() => startAiQuiz("Caribbean History")}
        >
          Caribbean History 🏖️
        </Button>
      </div>
    </CardContent>
  );

  const currentQuestionContext = activeGameData[currentIndex] as
    | GameQuestion
    | undefined;
  const reportCountryName =
    gameMode === "capital" || gameMode === "country"
      ? (currentQuestionContext as Country | undefined)?.name ||
        revealedCountryName
      : undefined;
  const reportQuestionId =
    gameMode === "ai-quiz"
      ? (currentQuestionContext as AIQuestion | undefined)?.id
      : undefined;

  return (
    <Section id="game">
      <DataLoader
        isLoading={isLoadingCountries}
        error={countriesError}
        data={countries}
        emptyMessage="Could not load trivia questions."
      >
        {() => {
          if (gameMode === "ai-quiz" && isLoadingAiQuiz) {
            return (
              <Card className={CARD_BASE_CLASSES}>
                <CardContent>
                  <div className="flex flex-col justify-center items-center py-12 min-h-75">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-light dark:border-brand-dark mb-4"></div>
                    <p className="text-brand-light dark:text-brand-dark font-medium animate-pulse">
                      Generating your quiz...
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          }

          if (gameMode === "ai-quiz" && aiQuizError) {
            return (
              <Card className={CARD_BASE_CLASSES}>
                <CardContent>
                  <div className="flex flex-col justify-center items-center py-12 min-h-75 text-center">
                    <div className="text-red-500 mb-4 text-5xl">⚠️</div>
                    <CardTitle as="h3" className="mb-2 text-xl font-bold">
                      AI Quizzes Currently Unavailable
                    </CardTitle>
                    <p className="opacity-70 mb-6 text-brand-light dark:text-brand-dark">
                      The AI service is currently down or rate-limited. Please
                      try again later.
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

          return (
            <>
              <Card className={CARD_BASE_CLASSES}>
                {!gameMode
                  ? renderModeSelection()
                  : renderGameInterface(activeGameData)}
              </Card>
              <ReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                countryName={reportCountryName}
                questionId={reportQuestionId}
              />
            </>
          );
        }}
      </DataLoader>
    </Section>
  );
};

export default Game;

