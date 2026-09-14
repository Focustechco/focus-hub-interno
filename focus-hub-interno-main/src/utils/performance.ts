/**
 * Performance Optimization Utilities for Focus Hub
 * Re-render optimization and memoization helpers
 */

import { useMemo, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for deep comparison memoization
 */
export function useDeepMemo<T>(value: T, deps: React.DependencyList): T {
    const ref = useRef<T>(value);
    const signalRef = useRef<number>(0);

    if (!deepEqual(value, ref.current)) {
        ref.current = value;
        signalRef.current += 1;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => ref.current, [signalRef.current, ...deps]);
}

/**
 * Deep equality check for objects
 */
export function deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return a === b;
    if (typeof a !== 'object') return a === b;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!deepEqual(a[key], b[key])) return false;
    }

    return true;
}

/**
 * Debounce hook - delays execution until after the delay has passed
 */
export function useDebounce<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
): (...args: Parameters<T>) => void {
    const timeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return useCallback((...args: Parameters<T>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay]);
}

/**
 * Throttle hook - limits execution to once per interval
 */
export function useThrottle<T extends (...args: any[]) => any>(
    callback: T,
    interval: number
): (...args: Parameters<T>) => void {
    const lastCall = useRef<number>(0);
    const timeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return useCallback((...args: Parameters<T>) => {
        const now = Date.now();
        const timeSinceLastCall = now - lastCall.current;

        if (timeSinceLastCall >= interval) {
            lastCall.current = now;
            callback(...args);
        } else {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                lastCall.current = Date.now();
                callback(...args);
            }, interval - timeSinceLastCall);
        }
    }, [callback, interval]);
}

/**
 * Use previous value hook
 */
export function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T>();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}

/**
 * Stable callback hook - maintains reference stability
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    return useCallback((...args: Parameters<T>) => {
        return callbackRef.current(...args);
    }, []) as T;
}

/**
 * Memoized selector for derived state
 */
export function createSelector<T, R>(
    selector: (state: T) => R
): (state: T) => R {
    let lastState: T;
    let lastResult: R;

    return (state: T) => {
        if (state !== lastState) {
            lastState = state;
            lastResult = selector(state);
        }
        return lastResult;
    };
}

export default {
    useDeepMemo,
    deepEqual,
    useDebounce,
    useThrottle,
    usePrevious,
    useStableCallback,
    createSelector,
};
