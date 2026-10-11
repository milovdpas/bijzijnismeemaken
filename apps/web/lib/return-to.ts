/**
 * Only an in-app path may be a place to go back to after signing in. The
 * same rule as the API's `safeReturnTo`: it starts with one slash, not two
 * (protocol-relative), carries no backslash (browsers read `/\evil.com` as
 * `//evil.com`) and no control characters.
 */
export function safeReturnTo(value: string | null | undefined): string | undefined {
    if (
        value === null ||
        value === undefined ||
        value.length > 255 ||
        !value.startsWith('/') ||
        value.startsWith('//') ||
        value.includes('\\') ||
        // eslint-disable-next-line no-control-regex
        /[\u0000-\u001f\u007f]/.test(value)
    ) {
        return undefined;
    }
    return value;
}
