import { LEADERBOARD, ScoreType } from '@bzim/types';

import { formatScore } from './score-format';

/**
 * What a person typed as a score, read back as the number the API takes.
 * Points accept a comma or a dot; a time reads `h:mm:ss.SSS`, `m:ss.SSS`,
 * `m:ss` or plain seconds, and becomes milliseconds. Undefined means the
 * text is not a score; null means it is empty.
 */
export function parseScore(raw: string, scoreType: ScoreType): number | null | undefined {
    const text = raw.trim();
    if (text === '') return null;
    if (scoreType === ScoreType.NUMBER) {
        if (!/^\d+([.,]\d{1,3})?$/.test(text)) return undefined;
        return Number(text.replace(',', '.'));
    }
    const match = /^(?:(\d+):)?(?:(\d{1,2}):)?(\d{1,2})(?:[.,](\d{1,3}))?$/.exec(text);
    if (match === null) return undefined;
    const [, first, second, secondsText, millisText] = match;
    const hours = second === undefined ? 0 : Number(first ?? 0);
    const minutes = second === undefined ? Number(first ?? 0) : Number(second);
    const seconds = Number(secondsText);
    const millis = millisText === undefined ? 0 : Number(millisText.padEnd(3, '0'));
    if (minutes > 59 || seconds > 59) return undefined;
    const total = ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
    return total > LEADERBOARD.SCORE_MAX ? undefined : total;
}

/**
 * A time as it is typed, tidied while typing: a phone's number pad has no
 * colon, so the digits are grouped from the right into seconds, minutes
 * and hours (`123` is `1:23`, `10203` is `1:02:03`), and the pad's dot or
 * comma starts the milliseconds. Colons typed by hand are redone the same
 * way, so deleting one never gets stuck. Leading zeros go.
 */
export function maskTimeInput(raw: string): string {
    const separator = raw.search(/[.,]/);
    const whole = (separator === -1 ? raw : raw.slice(0, separator))
        .replace(/\D/g, '')
        .replace(/^0+(?=\d)/, '')
        .slice(0, 7);
    const clock = [whole.slice(0, -4), whole.slice(-4, -2), whole.slice(-2)]
        .filter((part) => part !== '')
        .join(':');
    if (separator === -1) return clock;
    const fraction = raw
        .slice(separator + 1)
        .replace(/\D/g, '')
        .slice(0, 3);
    return `${clock === '' ? '0' : clock}.${fraction}`;
}

/** A stored score as text for the input, the same way the ranking shows it but unlocalised for points. */
export function scoreToInput(score: number | null, scoreType: ScoreType): string {
    if (score === null) return '';
    return scoreType === ScoreType.NUMBER ? String(score) : formatScore(score, scoreType, 'en');
}
