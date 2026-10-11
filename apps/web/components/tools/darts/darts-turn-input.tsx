'use client';

import { CornerDownLeft, Delete } from 'lucide-react';
import { useEffect, useEffectEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import type { StoredUpdate } from '@/hooks/use-stored-state';
import { launchConfetti } from '@/lib/confetti';
import {
    checkout,
    clockMaxHits,
    clockTarget,
    clockThrow,
    currentPlayer,
    legWinner,
    x01Check,
    x01Remaining,
    x01Throw,
} from '@/lib/tools/darts';
import type { DartsState } from '@/lib/tools/darts';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const HITS = [0, 1, 2, 3];

/**
 * The turn being entered. For x01 a keypad takes the turn's total (a
 * keyboard works too), with the checkout from here above it; a total that
 * ends the leg on a double-out game asks whether the last dart was a double.
 * Around the clock is one tap: how many targets this turn hit.
 */
export function DartsTurnInput({
    state,
    update,
}: {
    state: DartsState;
    update: StoredUpdate<DartsState>;
}) {
    const { t } = useTranslation();
    const [typed, setTyped] = useState('');
    const [asking, setAsking] = useState<number | null>(null);
    const [problem, setProblem] = useState(false);
    const player = currentPlayer(state);
    const x01 = state.settings.mode === 'x01';

    const apply = (change: (current: DartsState) => DartsState) => {
        update(change);
        if (legWinner(change(state)) !== null) launchConfetti();
    };
    const press = (digit: string) => {
        setProblem(false);
        setTyped((current) => (current === '0' ? digit : current + digit).slice(0, 3));
    };
    const erase = () => {
        setProblem(false);
        setTyped((current) => current.slice(0, -1));
    };
    const submit = () => {
        if (typed === '') return;
        const value = Number(typed);
        const check = x01Check(state, value);
        if (check === 'invalid') {
            setProblem(true);
            return;
        }
        if (check === 'ask-double') {
            setAsking(value);
            return;
        }
        apply((current) => x01Throw(current, value, null));
        setTyped('');
    };
    const answer = (onDouble: boolean) => {
        if (asking === null) return;
        const value = asking;
        apply((current) => x01Throw(current, value, onDouble));
        setAsking(null);
        setTyped('');
    };

    // Digits, backspace and enter from a keyboard, unless a field or a dialog has it.
    const onKey = useEffectEvent((event: KeyboardEvent) => {
        if (!x01 || asking !== null || event.metaKey || event.ctrlKey || event.altKey) return;
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (target?.closest('input, textarea, select, [role="dialog"]')) return;
        if (/^\d$/.test(event.key)) press(event.key);
        else if (event.key === 'Backspace') erase();
        // On a focused keypad button, enter already presses that button.
        else if (event.key === 'Enter' && target?.tagName !== 'BUTTON') submit();
        else return;
        event.preventDefault();
    });
    useEffect(() => {
        const listener = (event: KeyboardEvent) => onKey(event);
        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
    }, []);

    if (player === null) return null;

    if (!x01) {
        const target = clockTarget(state, player.id);
        const max = clockMaxHits(state);
        return (
            <section className="space-y-3 rounded-2xl border bg-card p-4">
                <p className="text-sm font-semibold">
                    {t('tools.darts.aimsAt', {
                        name: player.name,
                        target: target === 25 ? t('tools.darts.bull') : String(target),
                    })}
                </p>
                <p className="text-xs text-muted-foreground">{t('tools.darts.hits')}</p>
                <div className="grid grid-cols-4 gap-2">
                    {HITS.map((hits) => (
                        <Button
                            key={hits}
                            variant="outline"
                            disabled={hits > max}
                            onClick={() => apply((current) => clockThrow(current, hits))}
                            className="h-14 text-xl font-bold tabular-nums"
                        >
                            {hits}
                        </Button>
                    ))}
                </div>
            </section>
        );
    }

    const remaining = x01Remaining(state, player.id);
    const route = checkout(remaining, state.settings.doubleOut);
    const finishable = remaining <= (state.settings.doubleOut ? 170 : 180);

    if (asking !== null) {
        return (
            <section className="space-y-3 rounded-2xl border-2 border-brand bg-card p-4 text-center">
                <p className="text-base font-bold">{t('tools.darts.askDouble')}</p>
                <div className="flex justify-center gap-2">
                    <Button variant="outline" size="lg" onClick={() => answer(false)}>
                        {t('tools.darts.noDouble')}
                    </Button>
                    <Button size="lg" onClick={() => answer(true)}>
                        {t('tools.darts.yesDouble')}
                    </Button>
                </div>
            </section>
        );
    }

    return (
        <section className="space-y-3 rounded-2xl border bg-card p-4">
            <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                        {t('tools.darts.toThrow', { name: player.name })}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                        {t('tools.darts.left', { remaining })}
                    </p>
                </div>
                <output
                    aria-label={t('tools.darts.turnTotal')}
                    className="text-4xl font-extrabold text-ink tabular-nums"
                >
                    {typed === '' ? '0' : typed}
                </output>
            </div>
            {route !== null ? (
                <p className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">
                        {t('tools.darts.checkout')}
                    </span>
                    {route.map((dart, index) => (
                        <span
                            key={index}
                            className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-brand-foreground"
                        >
                            {dart.label === 'Bull' ? t('tools.darts.bull') : dart.label}
                        </span>
                    ))}
                </p>
            ) : (
                finishable && (
                    <p className="text-xs text-muted-foreground">{t('tools.darts.noCheckout')}</p>
                )
            )}
            {problem && <FormMessage tone="error">{t('tools.darts.notPossible')}</FormMessage>}
            <div className="grid grid-cols-3 gap-2">
                {DIGITS.map((digit) => (
                    <Button
                        key={digit}
                        variant="outline"
                        onClick={() => press(digit)}
                        className="h-12 text-lg font-bold"
                    >
                        {digit}
                    </Button>
                ))}
                <Button
                    variant="ghost"
                    aria-label={t('tools.darts.backspace')}
                    disabled={typed === ''}
                    onClick={erase}
                    className="h-12"
                >
                    <Delete className="size-5" />
                </Button>
                <Button
                    variant="outline"
                    onClick={() => press('0')}
                    className="h-12 text-lg font-bold"
                >
                    0
                </Button>
                <Button
                    aria-label={t('tools.darts.enter')}
                    disabled={typed === ''}
                    onClick={submit}
                    className="h-12"
                >
                    <CornerDownLeft className="size-5" />
                </Button>
            </div>
        </section>
    );
}
