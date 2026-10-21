/**
 * A tab switches at once: the group's header and tab row stay, and this
 * stands in for the tab until its page is there. On a slow connection the
 * tap is answered straight away instead of after the server replies.
 */
export default function GroupTabLoading() {
    return (
        <div className="space-y-4" aria-busy="true">
            <div className="h-24 animate-pulse rounded-2xl bg-muted" />
            <div className="h-24 animate-pulse rounded-2xl bg-muted" />
            <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        </div>
    );
}
