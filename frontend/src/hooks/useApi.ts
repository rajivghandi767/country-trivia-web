import { useState, useEffect, useRef } from 'react';
import { ApiResponse } from '@/types';

// Simple in-memory cache
const apiCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: React.DependencyList = [],
  cacheKey?: string, // Optional cache key
  cacheTTL: number = CACHE_TTL // Optional TTL override
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const apiCallRef = useRef(apiCall);

  const fetchData = async (skipCache = false) => {
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
      
      if (result.data && (result.data as any).results) {
        setData((result.data as any).results as T);
      } else {
        setData(result.data as T);
      }
      
      // Store in cache if we have a cache key
      if (cacheKey) {
        apiCache[cacheKey] = {
          data: result.data,
          timestamp: Date.now(),
        };
      }
    } catch (err) {
      console.error('Error in API call:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    apiCallRef.current = apiCall;
  }, [apiCall]);

  useEffect(() => {
    let isMounted = true;
    
    const execute = async () => {
      if (!isMounted) return;

      try {
        await fetchData();
      } catch (err) {
        if (isMounted) {
          console.error('Error in API call setup:', err);
        }
      }
    };

    execute();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies]);

  return { 
    data, 
    error, 
    isLoading, 
    refetch: (skipCache = true) => fetchData(skipCache) 
  };
}

export default useApi;