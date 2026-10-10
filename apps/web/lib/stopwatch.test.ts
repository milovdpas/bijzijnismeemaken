import { describe, expect, it } from 'vitest';

import {
    elapsed,
    idleStopwatch,
    isRunning,
    lap,
    parseStopwatch,
    splits,
    start,
    stop,
} from './stopwatch';

describe('stopwatch', () => {
    it('counts while running, keeps the count while stopped, and resumes on top of it', () => {
        const running = start(idleStopwatch, 1000);
        expect(isRunning(running)).toBe(true);
        expect(elapsed(running, 1500)).toBe(500);
        const stopped = stop(running, 1500);
        expect(isRunning(stopped)).toBe(false);
        expect(elapsed(stopped, 9999)).toBe(500);
        expect(elapsed(start(stopped, 2000), 2250)).toBe(750);
    });

    it('ignores a start while running and a stop or lap while stopped', () => {
        const running = start(idleStopwatch, 1000);
        expect(start(running, 2000)).toBe(running);
        expect(stop(idleStopwatch, 2000)).toBe(idleStopwatch);
        expect(lap(idleStopwatch, 2000)).toBe(idleStopwatch);
    });

    it('records laps as totals and reads their splits back', () => {
        const state = lap(lap(start(idleStopwatch, 0), 1200), 3000);
        expect(state.laps).toEqual([1200, 3000]);
        expect(splits(state.laps)).toEqual([1200, 1800]);
    });

    it('reads stored state and falls back to idle for anything else', () => {
        expect(parseStopwatch('{"startedAt":5,"accumulated":10,"laps":[3]}')).toEqual({
            startedAt: 5,
            accumulated: 10,
            laps: [3],
        });
        expect(parseStopwatch(null)).toBe(idleStopwatch);
        expect(parseStopwatch('nope')).toBe(idleStopwatch);
        expect(parseStopwatch('{"accumulated":"x"}')).toBe(idleStopwatch);
    });
});
