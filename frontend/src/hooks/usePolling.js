import { useEffect, useRef } from 'react';

/**
 * Custom hook for live 5-second polling of queue and status data
 * @param {Function} callback - Function to execute on each tick
 * @param {number} delay - Interval in ms (defaults to 5000)
 * @param {boolean} enabled - Whether polling is active
 */
export function usePolling(callback, delay = 5000, enabled = true) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || delay === null) return;

    // Run callback immediately on mount
    savedCallback.current();

    const id = setInterval(() => {
      savedCallback.current();
    }, delay);

    return () => clearInterval(id);
  }, [delay, enabled]);
}
