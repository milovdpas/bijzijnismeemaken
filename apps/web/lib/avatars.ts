import {
    Bird,
    Bot,
    Bug,
    Cat,
    Dog,
    Fish,
    Ghost,
    Panda,
    Rabbit,
    Rat,
    Rocket,
    Shrimp,
    Snail,
    Squirrel,
    Star,
    Turtle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AVATAR_KEYS } from '@bzim/types';
import type { AvatarKey } from '@bzim/types';

/**
 * The built-in avatars: a lucide icon on a coloured tile, one per key in
 * `AVATAR_KEYS`. Drawn rather than image files, so they follow the theme and
 * need no assets. The tile colours are chosen to read on both schemes and
 * never clash with the brand yellow.
 */
export const AVATARS: Record<AvatarKey, { icon: LucideIcon; tile: string }> = {
    bird: { icon: Bird, tile: 'oklch(0.78 0.14 220)' },
    bot: { icon: Bot, tile: 'oklch(0.8 0.03 260)' },
    bug: { icon: Bug, tile: 'oklch(0.78 0.16 140)' },
    cat: { icon: Cat, tile: 'oklch(0.8 0.12 60)' },
    dog: { icon: Dog, tile: 'oklch(0.76 0.12 40)' },
    fish: { icon: Fish, tile: 'oklch(0.78 0.13 200)' },
    ghost: { icon: Ghost, tile: 'oklch(0.85 0.06 300)' },
    panda: { icon: Panda, tile: 'oklch(0.82 0.02 90)' },
    rabbit: { icon: Rabbit, tile: 'oklch(0.82 0.1 340)' },
    rat: { icon: Rat, tile: 'oklch(0.78 0.05 280)' },
    rocket: { icon: Rocket, tile: 'oklch(0.76 0.15 20)' },
    shrimp: { icon: Shrimp, tile: 'oklch(0.8 0.14 30)' },
    snail: { icon: Snail, tile: 'oklch(0.8 0.1 110)' },
    squirrel: { icon: Squirrel, tile: 'oklch(0.76 0.13 70)' },
    star: { icon: Star, tile: 'oklch(0.82 0.12 160)' },
    turtle: { icon: Turtle, tile: 'oklch(0.76 0.14 150)' },
};

export function isAvatarKey(value: unknown): value is AvatarKey {
    return typeof value === 'string' && (AVATAR_KEYS as readonly string[]).includes(value);
}
