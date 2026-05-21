import { useState, useEffect, useCallback } from 'react';
import { getLocalDateKey, isValidDateKey } from '../utils/dateUtils';

const STORAGE_DATE_KEY = 'lingodaily_dateKey';
const STORAGE_PUZZLE_PREFIX = 'lingodaily_puzzle_';
const STORAGE_PROGRESS_PREFIX = 'lingodaily_progress_';
const GAME_TYPES = ['pyramid', 'cryptic', 'scrabble'];

/**
 * Custom hook for managing daily puzzle state with hydration safety
 * 
 * Features:
 * - Fetches today's puzzle from API on mount
 * - Detects day boundaries in local timezone
 * - Automatically clears previous day's progress
 * - Caches puzzle and progress in localStorage
 * - Handles hydration safely (no SSR mismatches)
 * 
 * @returns {Object} { puzzle, isLoading, error, resetDaily, dateKey, clearProgress }
 */
export function useDailyGameState() {
  // Hydration-safe state: initialized with placeholders
  const [puzzle, setPuzzle] = useState(null);
  const [dateKey, setDateKey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);

  /**
   * Clears all game progress for a specific date
   * @param {string} targetDateKey - Date key to clear progress for
   */
  const clearProgressForDate = useCallback((targetDateKey) => {
    if (!isValidDateKey(targetDateKey)) return;
    
    GAME_TYPES.forEach(gameType => {
      const progressKey = `${STORAGE_PROGRESS_PREFIX}${gameType}_${targetDateKey}`;
      try {
        localStorage.removeItem(progressKey);
      } catch (err) {
        console.warn(`Failed to clear progress for ${gameType}`, err);
      }
    });
  }, []);

  /**
   * Fetches puzzle from API with retry logic
   * @param {string} todayDateKey - Today's date key
   * @returns {Promise<Object|null>} Puzzle object or null on failure
   */
  const fetchPuzzleFromAPI = useCallback(async (todayDateKey) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch('/api/daily-puzzle', {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Validate puzzle structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid puzzle format from API');
      }

      // Cache puzzle in localStorage
      try {
        const puzzleKey = `${STORAGE_PUZZLE_PREFIX}${todayDateKey}`;
        localStorage.setItem(puzzleKey, JSON.stringify(data));
        localStorage.setItem(STORAGE_DATE_KEY, todayDateKey);
      } catch (storageErr) {
        console.warn('Failed to cache puzzle', storageErr);
        // Continue anyway - we have the puzzle in memory
      }

      return data;
    } catch (err) {
      console.error('Failed to fetch puzzle from API:', err);
      return null;
    }
  }, []);

  /**
   * Attempts to get cached puzzle from localStorage
   * @param {string} targetDateKey - Date key to retrieve
   * @returns {Object|null} Cached puzzle or null
   */
  const getCachedPuzzle = useCallback((targetDateKey) => {
    if (!isValidDateKey(targetDateKey)) return null;

    try {
      const puzzleKey = `${STORAGE_PUZZLE_PREFIX}${targetDateKey}`;
      const cached = localStorage.getItem(puzzleKey);
      return cached ? JSON.parse(cached) : null;
    } catch (err) {
      console.warn('Failed to retrieve cached puzzle:', err);
      return null;
    }
  }, []);

  /**
   * Resets daily state - clears all progress for today
   */
  const resetDaily = useCallback(() => {
    if (dateKey) {
      clearProgressForDate(dateKey);
    }
  }, [dateKey, clearProgressForDate]);

  /**
   * Main hydration effect - runs after first render
   * Safely reads localStorage and handles day boundary logic
   */
  useEffect(() => {
    const initializeDailyState = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const todayDateKey = getLocalDateKey();
        setDateKey(todayDateKey);

        // Get previously stored date from localStorage
        let storedDateKey = null;
        try {
          storedDateKey = localStorage.getItem(STORAGE_DATE_KEY);
        } catch (err) {
          console.warn('Failed to read from localStorage:', err);
        }

        // Check if it's a new day
        const isNewDay = !storedDateKey || storedDateKey !== todayDateKey;

        if (isNewDay && storedDateKey) {
          // Clear progress from previous day
          clearProgressForDate(storedDateKey);
        }

        // Try to get cached puzzle for today
        let cachedPuzzle = getCachedPuzzle(todayDateKey);

        // If no cached puzzle or new day, fetch from API
        if (!cachedPuzzle) {
          const freshPuzzle = await fetchPuzzleFromAPI(todayDateKey);
          if (freshPuzzle) {
            setPuzzle(freshPuzzle);
          } else {
            // API failed, try cache as fallback
            cachedPuzzle = getCachedPuzzle(todayDateKey);
            if (cachedPuzzle) {
              setPuzzle(cachedPuzzle);
              setError('Using cached puzzle (offline mode)');
            } else {
              setError('Failed to load puzzle. Please refresh the page.');
            }
          }
        } else {
          setPuzzle(cachedPuzzle);
        }
      } catch (err) {
        console.error('Error initializing daily state:', err);
        setError('Failed to initialize game. Please refresh the page.');
      } finally {
        setIsLoading(false);
        setIsHydrated(true);
      }
    };

    initializeDailyState();
  }, [fetchPuzzleFromAPI, getCachedPuzzle, clearProgressForDate]);

  return {
    puzzle,
    isLoading,
    error,
    dateKey,
    isHydrated,
    resetDaily,
    clearProgressForDate,
  };
}
