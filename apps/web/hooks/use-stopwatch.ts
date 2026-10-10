'use client';

import { useEffect, useState } from 'react';

import {
    elapsed,
    idleStopwatch,
    isRunning,
    lap,
    parseStopwatch,
    start,
    stop,
} from '@/lib/stopwatch';
import type { StopwatchState } from '@/lib/stopwatch';

const TICK_MS = 50;

/**
 * A stopwatch that survives tab switches and reloads: its state lives in
 * local storage under the given key, with the start moment as a timestamp,
 * so a timer left running keeps counting while the page is away.
 */
export function useStopwatch(storageKey: string): {
    state: StopwatchState;
    running: boolean;
    elapsedMs: number;
    start: () => void;
    stop: () => void;
    lap: () => void;
    reset: () => void;
} {
    const [state, setState] = useState<StopwatchState>(() =>
        typeof window === 'undefined'
            ? idleStopwatch
            : parseStopwatch(window.localStorage.getItem(storageKey)),
    );
    const [now, setNow] = useState(() => Date.now());
    const running = isRunning(state);

    useEffect(() => {
        window.localStorage.setItem(storageKey, JSON.stringify(state));
    }, [state, storageKey]);

    useEffect(() => {
        if (!running) return;
        const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
        return () => window.clearInterval(timer);
    }, [running]);

    return {
        state,
        running,
        elapsedMs: elapsed(state, now),
        start: () => setState((current) => start(current, Date.now())),
        stop: () => setState((current) => stop(current, Date.now())),
        lap: () => setState((current) => lap(current, Date.now())),
        reset: () => setState(idleStopwatch),
    };
}
