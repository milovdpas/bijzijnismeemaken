/**
 * A stopwatch as data: when it was started (null while stopped), what it
 * had counted before that, and the total at each lap. Pure, so it can be
 * kept in storage and ticked from anywhere; `now` is always passed in.
 */
export interface StopwatchState {
    startedAt: number | null;
    accumulated: number;
    laps: number[];
}

export const idleStopwatch: StopwatchState = { startedAt: null, accumulated: 0, laps: [] };

export function isRunning(state: StopwatchState): boolean {
    return state.startedAt !== null;
}

export function elapsed(state: StopwatchState, now: number): number {
    return state.accumulated + (state.startedAt === null ? 0 : Math.max(0, now - state.startedAt));
}

export function start(state: StopwatchState, now: number): StopwatchState {
    return state.startedAt === null ? { ...state, startedAt: now } : state;
}

export function stop(state: StopwatchState, now: number): StopwatchState {
    return state.startedAt === null
        ? state
        : { ...state, startedAt: null, accumulated: elapsed(state, now) };
}

export function lap(state: StopwatchState, now: number): StopwatchState {
    return state.startedAt === null
        ? state
        : { ...state, laps: [...state.laps, elapsed(state, now)] };
}

/** Each lap's own time: the total at that lap minus the total at the one before. */
export function splits(laps: number[]): number[] {
    return laps.map((total, index) => total - (laps[index - 1] ?? 0));
}

/** Whatever storage held, if it is a stopwatch; anything else is an idle one. */
export function parseStopwatch(raw: string | null): StopwatchState {
    if (raw === null) return idleStopwatch;
    try {
        const value: unknown = JSON.parse(raw);
        if (
            typeof value === 'object' &&
            value !== null &&
            'accumulated' in value &&
            typeof value.accumulated === 'number' &&
            'laps' in value &&
            Array.isArray(value.laps) &&
            value.laps.every((entry) => typeof entry === 'number') &&
            'startedAt' in value &&
            (value.startedAt === null || typeof value.startedAt === 'number')
        ) {
            return {
                startedAt: value.startedAt,
                accumulated: value.accumulated,
                laps: value.laps as number[],
            };
        }
    } catch {
        // Not JSON: fall through to idle.
    }
    return idleStopwatch;
}
