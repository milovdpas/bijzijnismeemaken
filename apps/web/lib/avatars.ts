import {
    Beer,
    Bird,
    Bot,
    Bug,
    Cat,
    Crown,
    Dog,
    Fish,
    Flame,
    Gamepad2,
    Ghost,
    Guitar,
    IceCreamCone,
    Mountain,
    Origami,
    Panda,
    Pizza,
    Rabbit,
    Rat,
    Rocket,
    Shrimp,
    Snail,
    Squirrel,
    Star,
    Trophy,
    Turtle,
    Volleyball,
    Wine,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import { AVATAR_KEYS } from '@bzim/types';
import type { AvatarStyle, IconAvatarKey, ParsedAvatar } from '@bzim/types';

import {
    ButterflyIcon,
    FootballIcon,
    LadybirdIcon,
    MonkeyIcon,
} from '@/components/icons/avatar-extras';

/** A Lucide icon or one of our own drawn in the same idiom. */
export type AvatarIcon = ComponentType<SVGProps<SVGSVGElement> & { strokeWidth?: number }>;

/**
 * The built-in avatars: an icon on a coloured tile, one per key in
 * `AVATAR_KEYS`, in that order (the picker shows them sixteen to a page).
 * Drawn rather than image files, so they follow the theme and need no
 * assets. The tile colours are chosen to read on both schemes and never
 * clash with the brand yellow.
 */
export const AVATARS: Record<IconAvatarKey, { icon: AvatarIcon; tile: string }> = {
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
    // Second page.
    monkey: { icon: MonkeyIcon, tile: 'oklch(0.74 0.11 60)' },
    butterfly: { icon: ButterflyIcon, tile: 'oklch(0.82 0.12 320)' },
    ladybird: { icon: LadybirdIcon, tile: 'oklch(0.74 0.17 25)' },
    football: { icon: FootballIcon, tile: 'oklch(0.84 0.02 120)' },
    volleyball: { icon: Volleyball, tile: 'oklch(0.8 0.13 210)' },
    beer: { icon: Beer, tile: 'oklch(0.85 0.14 95)' },
    wine: { icon: Wine, tile: 'oklch(0.72 0.14 350)' },
    pizza: { icon: Pizza, tile: 'oklch(0.78 0.14 45)' },
    icecream: { icon: IceCreamCone, tile: 'oklch(0.86 0.08 330)' },
    guitar: { icon: Guitar, tile: 'oklch(0.76 0.1 50)' },
    gamepad: { icon: Gamepad2, tile: 'oklch(0.78 0.1 270)' },
    crown: { icon: Crown, tile: 'oklch(0.84 0.12 80)' },
    flame: { icon: Flame, tile: 'oklch(0.76 0.16 35)' },
    trophy: { icon: Trophy, tile: 'oklch(0.82 0.1 100)' },
    mountain: { icon: Mountain, tile: 'oklch(0.8 0.08 190)' },
    origami: { icon: Origami, tile: 'oklch(0.84 0.07 240)' },
};

/** The icon keys sixteen at a time: one page of the picker. */
export function avatarPages(perPage = 16): IconAvatarKey[][] {
    const pages: IconAvatarKey[][] = [];
    for (let start = 0; start < AVATAR_KEYS.length; start += perPage) {
        pages.push(AVATAR_KEYS.slice(start, start + perPage));
    }
    return pages;
}

/** A face for somebody added by name only: always an icon tile. */
export function randomAvatarKey(): IconAvatarKey {
    return AVATAR_KEYS[Math.floor(Math.random() * AVATAR_KEYS.length)] ?? AVATAR_KEYS[0];
}

const TILES = Object.values(AVATARS).map((avatar) => avatar.tile);

/** A stable number for a string (FNV-1a), to pick colours and seeds without randomness. */
function hash(text: string): number {
    let value = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
        value = Math.imul(value ^ text.charCodeAt(index), 0x01000193) >>> 0;
    }
    return value;
}

/**
 * The tile behind an avatar: an icon's own colour, or for a generated face
 * one of the same colours, picked by its seed so it never changes.
 */
export function avatarTile(avatar: ParsedAvatar): string {
    return avatar.kind === 'icon'
        ? AVATARS[avatar.key].tile
        : (TILES[hash(avatar.seed) % TILES.length] ?? AVATARS.bird.tile);
}

/** Where a generated avatar is drawn: the app's own route, `app/avatars/[style]/[seed]`. */
export function generatedAvatarUrl(style: AvatarStyle, seed: string): string {
    return `/avatars/${style}/${seed}`;
}

/**
 * A page of seeds for the picker. Round 0 is the same for everybody, so the
 * server and the browser render the same first page; the shuffle button
 * moves to a random round.
 */
export function candidateSeeds(round: number, count: number): string[] {
    return Array.from({ length: count }, (_, index) =>
        hash(`${String(round)}:${String(index)}`).toString(36),
    );
}

export function randomRound(): number {
    return 1 + Math.floor(Math.random() * 1_000_000_000);
}
