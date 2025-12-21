import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';

interface UseLocalStorageSyncOptions {
  debounce?: number;
}

/**
 * Custom hook for syncing state with localStorage
 * Automatically loads initial value from localStorage and saves changes
 *
 * @param key - localStorage key
 * @param initialValue - Default value if localStorage is empty
 * @param options - Optional configuration (debounce)
 * @returns [value, setValue] tuple similar to useState
 */
export function useLocalStorageSync<T>(
  key: string,
  initialValue: T,
  options?: UseLocalStorageSyncOptions
): [T, Dispatch<SetStateAction<T>>] {
  // Initialize state from localStorage or use initial value
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return initialValue;
      }

      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as T;
      }
    } catch (error) {
      console.error(`Error loading from localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Track if this is the initial render to skip saving on mount
  const isInitialMount = useRef(true);
  const debounceTimer = useRef<number | undefined>();

  // Save to localStorage when value changes
  useEffect(() => {
    // Skip saving on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const saveToLocalStorage = () => {
      try {
        const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, valueToStore);
      } catch (error) {
        console.error(`Error saving to localStorage key "${key}":`, error);
      }
    };

    // Apply debounce if specified
    if (options?.debounce) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = window.setTimeout(saveToLocalStorage, options.debounce);
    } else {
      saveToLocalStorage();
    }

    // Cleanup debounce timer
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [key, value, options?.debounce]);

  return [value, setValue];
}
