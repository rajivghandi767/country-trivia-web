import { ApiResponse, Country } from "@/types";

// Base URL for the API from environment variables, without a fallback.
const API_URL = import.meta.env.VITE_API_URL + '/api/';

/**
 * A robust fetch function to handle API requests, returning a standardized response.
 * @param endpoint The API endpoint to call (e.g., 'trivia/')
 * @param options Standard RequestInit options for fetch.
 */
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  if (!import.meta.env.VITE_API_URL) {
    const errorMessage = "API URL is not configured. Please set VITE_API_URL in your environment file.";
    console.error(errorMessage);
    return { data: null, error: errorMessage, status: 0 };
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error: ${response.status} - ${errorText}`);
      return { data: null, error: `Failed to fetch: ${response.statusText}`, status: response.status };
    }

    const data = await response.json();
    return { data, error: null, status: response.status };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "A network error occurred.";
    console.error("Network or parsing error:", errorMessage);
    return { data: null, error: errorMessage, status: 0 };
  }
}

const apiService = {
  /**
   * Fetches a shuffled list of all countries for the trivia game.
   */
  trivia: {
    getShuffledCountries: (): Promise<ApiResponse<Country[]>> => {
      return fetchApi<Country[]>('trivia/?shuffle=true');
    },
  },
};

export default apiService;