/**
 * Pure text helpers both apps need to agree on. Anything here has no
 * dependencies and no side effects, so it can run in the browser and in the
 * API alike.
 */

/**
 * A URL-safe form of a group name for the invite link: lowercase ASCII
 * letters and digits, runs of anything else collapsed to one dash, at most
 * 80 characters. Cosmetic only; the token beside it is what the API resolves.
 * Shared so the create form previews exactly the slug the API will store.
 */
export function slugify(name: string): string {
    const slug = name
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
    return slug === '' ? 'groep' : slug;
}
