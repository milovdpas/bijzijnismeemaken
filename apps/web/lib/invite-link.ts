import { GROUP } from '@bzim/types';

/**
 * The token at the end of an invite link's last path segment.
 *
 * Links look like `/join/<slug>-<token>`. The slug is cosmetic and may itself
 * contain dashes, and the token is base64url (which also contains dashes), so
 * the only safe split is by length: the token is always the last
 * `GROUP.INVITE_TOKEN_LENGTH` characters. Anything shorter cannot be a link.
 */
export function inviteTokenFromSegment(segment: string): string | null {
    if (segment.length < GROUP.INVITE_TOKEN_LENGTH) return null;
    const token = segment.slice(-GROUP.INVITE_TOKEN_LENGTH);
    return /^[A-Za-z0-9_-]+$/.test(token) ? token : null;
}
