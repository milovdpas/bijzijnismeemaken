import { AVATAR, AVATAR_KEYS, AVATAR_STYLES } from './constants';
import type { AvatarKey, AvatarStyle, GeneratedAvatarKey, IconAvatarKey } from './constants';

export type ParsedAvatar =
    { kind: 'icon'; key: IconAvatarKey } | { kind: 'generated'; style: AvatarStyle; seed: string };

const SEED = new RegExp(`^[a-z0-9]{1,${String(AVATAR.SEED_MAX_LENGTH)}}$`);

/**
 * What an avatar string means, or null when it is neither kind. The web app
 * draws by it and the API validates with it, so both read a key the same way.
 */
export function parseAvatarKey(value: string): ParsedAvatar | null {
    if ((AVATAR_KEYS as readonly string[]).includes(value)) {
        return { kind: 'icon', key: value as IconAvatarKey };
    }
    const separator = value.indexOf(':');
    const style = value.slice(0, separator);
    const seed = value.slice(separator + 1);
    if (separator === -1 || !(AVATAR_STYLES as readonly string[]).includes(style)) return null;
    return SEED.test(seed) ? { kind: 'generated', style: style as AvatarStyle, seed } : null;
}

export function isAvatarKey(value: unknown): value is AvatarKey {
    return typeof value === 'string' && parseAvatarKey(value) !== null;
}

export function generatedAvatarKey(style: AvatarStyle, seed: string): GeneratedAvatarKey {
    return `${style}:${seed}`;
}
