import type { Metadata } from 'next';
import { CalendarDays, Lightbulb, Trophy, Users } from 'lucide-react';
import Link from 'next/link';

import { AppLogo } from '@/components/layout/app-logo';
import { APP_NAME, APP_TAGLINE } from '@/lib/site';

export const metadata: Metadata = { title: { absolute: APP_NAME }, description: APP_TAGLINE };

const POINTS = [
    {
        icon: Lightbulb,
        title: 'Collect ideas',
        text: 'Everyone drops activities into the group: a game night, a hike, a weekend away. Members say "I\'m in".',
    },
    {
        icon: CalendarDays,
        title: 'See when everyone is free',
        text: 'Members mark when they are busy, or connect their Google Calendar. The group sees busy or free per morning, afternoon and evening, never the details.',
    },
    {
        icon: Users,
        title: 'Plan the date',
        text: 'The app suggests the dates most people are free. Pick one, choose who is in, and everyone gets an invitation they can add to their own calendar.',
    },
    {
        icon: Trophy,
        title: 'Keep score',
        text: 'Leaderboards per group for the card game, the darts, the fastest lap: by month, by year, all time.',
    },
];

/**
 * The front door, visible without an account: what the app is for, where to
 * sign in, and the legal pages. Plain and static, so a reviewer and a friend
 * who got a link both get the same answer.
 */
export default function HomePage() {
    return (
        <div className="min-h-dvh">
            <main className="mx-auto max-w-3xl px-4 py-12">
                <div className="flex flex-col items-center gap-4 text-center">
                    <AppLogo size="lg" />
                    <h1 className="text-3xl md:text-4xl">{APP_NAME}</h1>
                    <p className="max-w-xl text-lg text-muted-foreground">
                        Be there or be square. A small, free web app for a group of friends to plan
                        things together: collect ideas, see when everyone is free, pick a date and
                        keep score.
                    </p>
                    <p className="max-w-xl text-sm text-muted-foreground">
                        Een kleine, gratis app voor een vriendengroep: ideeën verzamelen, zien
                        wanneer iedereen vrij is, een datum prikken en de stand bijhouden.
                    </p>
                    <div className="mt-2 flex gap-3">
                        <Link
                            href="/login"
                            className="rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-ink-foreground hover:opacity-90"
                        >
                            Sign in
                        </Link>
                        <Link
                            href="/login?register=1"
                            className="rounded-lg border px-5 py-2.5 text-sm font-semibold hover:bg-accent"
                        >
                            Create an account
                        </Link>
                    </div>
                </div>

                <ul className="mt-12 grid gap-4 md:grid-cols-2">
                    {POINTS.map(({ icon: Icon, title, text }) => (
                        <li key={title} className="rounded-2xl border bg-card p-5 shadow-sm">
                            <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                                <Icon className="size-5" />
                            </span>
                            <h2 className="text-base font-bold">{title}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                        </li>
                    ))}
                </ul>

                <section className="mt-12 rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
                    <h2 className="text-base font-bold text-foreground">About Google Calendar</h2>
                    <p className="mt-1">
                        Connecting a Google Calendar is optional. The app reads the calendars you
                        choose to show your groups whether you are busy or free in a daypart. Your
                        friends never see what an appointment is, and you can disconnect at any
                        time. How your data is handled is in the{' '}
                        <Link href="/privacy_policy" className="underline">
                            privacy policy
                        </Link>
                        .
                    </p>
                </section>
            </main>
            <footer className="mx-auto flex max-w-3xl gap-4 px-4 py-8 text-xs text-muted-foreground">
                <Link href="/privacy_policy" className="hover:text-foreground">
                    Privacy policy
                </Link>
                <Link href="/terms_of_service" className="hover:text-foreground">
                    Terms of service
                </Link>
                <span className="ml-auto">Milo van der Pas</span>
            </footer>
        </div>
    );
}
