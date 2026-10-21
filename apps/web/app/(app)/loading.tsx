/**
 * The same for the app's own pages (groups, invites, settings): the shell
 * and its navigation stay, and this stands in until the page is there.
 */
export default function AppPageLoading() {
    return (
        <div className="space-y-4" aria-busy="true">
            <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
            <div className="h-24 animate-pulse rounded-2xl bg-muted" />
            <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        </div>
    );
}
