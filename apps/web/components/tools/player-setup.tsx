'use client';

import type { AvatarKey } from '@bzim/types';
import { ArrowUp, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common/avatar';
import { FormMessage } from '@/components/common/form-message';
import { PlayerAvatar } from '@/components/tools/player-avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMembers } from '@/hooks/queries/use-members';
import { PLAYER_NAME_MAX, addPlayer, movePlayerUp, removePlayer } from '@/lib/tools/players';
import type { AddPlayerProblem, ToolPlayer } from '@/lib/tools/players';
import { cn } from '@/lib/utils';

/**
 * Who plays: group members with one tap, anyone else by name. When the
 * order matters (darts, Yahtzee) the list is the order of play and a player
 * can move up.
 */
export function PlayerSetup({
    groupId,
    players,
    max,
    ordered = false,
    onChange,
    className,
}: {
    groupId: string;
    players: ToolPlayer[];
    max: number;
    ordered?: boolean;
    onChange: (players: ToolPlayer[]) => void;
    className?: string;
}) {
    const { t } = useTranslation();
    const members = useMembers(groupId);
    const [name, setName] = useState('');
    const [problem, setProblem] = useState<AddPlayerProblem | null>(null);
    const playing = new Set(players.map((player) => player.name.toLowerCase()));
    const suggestions = (members.data ?? [])
        .map((member) => member.user)
        .filter((user) => !playing.has(user.displayName.toLowerCase()));

    const add = (raw: string, avatarKey: AvatarKey | null): boolean => {
        const result = addPlayer(players, raw, avatarKey, max);
        if (!result.ok) {
            setProblem(result.problem);
            return false;
        }
        setProblem(null);
        onChange(result.players);
        return true;
    };

    return (
        <section className={cn('space-y-3', className)}>
            <h3 className="text-sm font-bold">{t('tools.players.title')}</h3>
            {players.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('tools.players.none')}</p>
            ) : (
                <ol className="divide-y rounded-2xl border bg-card">
                    {players.map((player, index) => (
                        <li key={player.id} className="flex items-center gap-3 px-3 py-2">
                            {ordered && (
                                <span className="w-4 shrink-0 text-center text-xs font-bold text-muted-foreground tabular-nums">
                                    {index + 1}
                                </span>
                            )}
                            <PlayerAvatar player={player} />
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                {player.name}
                            </span>
                            {ordered && index > 0 && (
                                <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    aria-label={t('tools.players.moveUp', { name: player.name })}
                                    onClick={() => onChange(movePlayerUp(players, player.id))}
                                >
                                    <ArrowUp />
                                </Button>
                            )}
                            <Button
                                size="icon-xs"
                                variant="ghost"
                                aria-label={t('tools.players.remove', { name: player.name })}
                                onClick={() => onChange(removePlayer(players, player.id))}
                            >
                                <X />
                            </Button>
                        </li>
                    ))}
                </ol>
            )}
            {ordered && players.length > 1 && (
                <p className="text-xs text-muted-foreground">{t('tools.players.orderHint')}</p>
            )}

            <form
                className="flex gap-2"
                noValidate
                onSubmit={(event) => {
                    event.preventDefault();
                    if (add(name, null)) setName('');
                }}
            >
                <Input
                    value={name}
                    maxLength={PLAYER_NAME_MAX}
                    placeholder={t('tools.players.name')}
                    aria-label={t('tools.players.name')}
                    onChange={(event) => {
                        setName(event.target.value);
                        setProblem(null);
                    }}
                />
                <Button type="submit" variant="outline" disabled={name.trim() === ''}>
                    <Plus />
                    {t('tools.players.add')}
                </Button>
            </form>
            {problem !== null && (
                <FormMessage tone="error">{t(`tools.players.${problem}`)}</FormMessage>
            )}

            {suggestions.length > 0 && players.length < max && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                        {t('tools.players.fromGroup')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {suggestions.map((user) => (
                            <button
                                key={user.id}
                                type="button"
                                onClick={() => add(user.displayName, user.avatarKey)}
                                className="inline-flex items-center gap-1.5 rounded-full border bg-card py-1 pr-3 pl-1 text-sm font-semibold transition-colors hover:bg-accent"
                            >
                                <Avatar
                                    avatarKey={user.avatarKey}
                                    size="sm"
                                    className="size-6 rounded-full [&_svg]:size-3.5"
                                />
                                {user.displayName}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
