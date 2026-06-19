import { describe, it, expect, vi } from 'vitest';
import apiService from './apiService';

global.fetch = vi.fn();

describe('apiService.aiQuiz', () => {
  it('generate does not contain sensitive answers', async () => {
    const mockData = [
      { id: 1, question: 'Q1', options: ['A', 'B'] }
    ];
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockData
    });

    const result = await apiService.aiQuiz.generate('History');
    expect(result.data).toEqual(mockData);
  });

  it('checkAnswer submits user answer', async () => {
    const mockData = {
      is_correct: true,
      correct_answer: 'A',
      fun_fact: 'Fact'
    };
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockData
    });

    const result = await apiService.aiQuiz.checkAnswer(1, 'A');
    expect(result.data).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/ai-quiz/1/check-answer/'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ user_answer: 'A' })
      })
    );
  });
});
