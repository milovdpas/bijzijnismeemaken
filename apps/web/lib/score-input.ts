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

/** A stored score as text for the input, the same way the ranking shows it but unlocalised for points. */
export function scoreToInput(score: number | null, scoreType: ScoreType): string {
    if (score === null) return '';
    return scoreType === ScoreType.NUMBER ? String(score) : formatScore(score, scoreType, 'en');
}
