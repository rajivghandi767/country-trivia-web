import { useState, useEffect, useRef } from "react";
import { ApiResponse } from "@/types";

// Simple in-memory cache
const apiCache: Record<string, { data: unknown; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

function isPaginatedResponse<T>(val: unknown): val is { results: T } {
  return (
    typeof val === "object" &&
    val !== null &&
    "results" in val &&
    Array.isArray(val.results)
  );
}

function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: React.DependencyList = [],
  options: { cacheKey?: string; cacheTTL?: number; skip?: boolean } = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!options.skip);
  const apiCallRef = useRef(apiCall);

  const fetchData = async (skipCache = false) => {
    const { cacheKey, cacheTTL = CACHE_TTL } = options;

    setIsLoading(true);
    setError(null);

    // Check cache if we have a cache key and aren't skipping cache
    if (cacheKey && !skipCache) {
      const cached = apiCache[cacheKey];
      if (cached && Date.now() - cached.timestamp < cacheTTL) {
        setData(cached.data as T);
        setIsLoading(false);
        return;
      }
    }

    try {
      const result = await apiCallRef.current();

      if (result.error) {
        throw new Error(result.error);
      }

      const payload: unknown = result.data;
      const resolvedData = isPaginatedResponse<T>(payload)
        ? payload.results
        : (result.data as T);
      setData(resolvedData);

      // Store in cache if we have a cache key
      if (cacheKey) {
        apiCache[cacheKey] = {
          data: resolvedData,
          timestamp: Date.now(),
        };
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Error in API call:", err);
      }
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    apiCallRef.current = apiCall;
  }, [apiCall]);

  useEffect(() => {
    // If skip is true, don't fetch
    if (options.skip) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    
    const execute = async () => {
      if (!isMounted) return;

      try {
        await fetchData();
      } catch (err) {
        if (isMounted && import.meta.env.DEV) {
          console.error('Error in API call setup:', err);
        }
      }
    };

    void execute();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps, @eslint-react/exhaustive-deps
  }, [...dependencies, options.skip]);

  return { 
    data, 
    error, 
    isLoading, 
    refetch: (skipCache = true) => fetchData(skipCache) 
  };
}

export default useApi;