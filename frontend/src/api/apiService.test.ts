import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import apiService from "./apiService";

const mockFetch = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", mockFetch);

describe("apiService.aiQuiz", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_URL", "http://localhost");
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("generate does not contain sensitive answers", async () => {
    const mockData = [{ id: 1, question: "Q1", options: ["A", "B"] }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await apiService.aiQuiz.generate("History");
    expect(result.data).toEqual(mockData);
  });

  it("checkAnswer submits user answer", async () => {
    const mockData = {
      is_correct: true,
      correct_answer: "A",
      fun_fact: "Fact",
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await apiService.aiQuiz.checkAnswer(1, "A");
    expect(result.data).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ai-quiz/1/check-answer/"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ user_answer: "A" }),
      }),
    );
  });
});

describe("apiService.trivia", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_URL", "http://localhost");
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("getShuffledCountries appends mode query when provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    } as Response);

    await apiService.trivia.getShuffledCountries("capital");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/trivia/?shuffle=true&mode=capital"),
      expect.any(Object),
    );
  });

  it("checkAnswer sends is_skipped flag and returns fun_fact in single call", async () => {
    const mockResponse = {
      is_correct: false,
      is_skipped: true,
      feedback_message: "The capital of France is Paris",
      fun_fact: "Did you know Paris has a museum inside a train station?",
      country_name: "France",
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await apiService.trivia.checkAnswer(1, "", "capital", true);
    expect(result.data).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/trivia/1/check-answer/"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          user_answer: "",
          game_mode: "capital",
          is_skipped: true,
        }),
      }),
    );
  });
});

