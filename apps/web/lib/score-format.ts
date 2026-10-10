import { ScoreType } from '@bzim/types';

/**
 * A score for people. Points are a number in the person's locale with up to
 * three decimals; a time is stored as milliseconds and reads as
 * `1:02:03.450`, with the hours dropped while there are none and the
 * milliseconds dropped while they are zero.
 */
export function formatScore(score: number, scoreType: ScoreType, lang: string | undefined): string {
    if (scoreType === ScoreType.NUMBER) {
        return new Intl.NumberFormat(lang ?? 'nl', { maximumFractionDigits: 3 }).format(score);
    }
    const total = Math.round(score);
    const hours = Math.floor(total / 3_600_000);
    const minutes = Math.floor((total % 3_600_000) / 60_000);
    const seconds = Math.floor((total % 60_000) / 1000);
    const millis = total % 1000;
    const pad = (value: number) => String(value).padStart(2, '0');
    const clock =
        hours > 0
            ? `${String(hours)}:${pad(minutes)}:${pad(seconds)}`
            : `${String(minutes)}:${pad(seconds)}`;
    return millis === 0 ? clock : `${clock}.${String(millis).padStart(3, '0')}`;
}
