/**
 * What kind of browser is asking to install, from what it tells us. iOS has
 * no install prompt at all: Safari (and every other iOS browser, which is
 * Safari underneath) installs through Share → Add to Home Screen, so the
 * app explains that instead of waiting for an event that never fires.
 */
export function isIos(userAgent: string): boolean {
    return /iPhone|iPad|iPod/i.test(userAgent);
}

/** Whether the page runs as an installed app rather than in a browser tab. */
export function isStandalone(
    matches: (query: string) => boolean,
    navigatorStandalone: boolean | undefined,
): boolean {
    return matches('(display-mode: standalone)') || navigatorStandalone === true;
}

/** The three ways to get the app onto a home screen; the UI picks the words by this. */
export type InstallMethod = 'prompt' | 'ios' | 'menu';

export function installMethod(canPrompt: boolean, ios: boolean): InstallMethod {
    if (canPrompt) return 'prompt';
    return ios ? 'ios' : 'menu';
}
