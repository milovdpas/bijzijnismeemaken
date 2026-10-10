import type { Metadata } from 'next';
import Link from 'next/link';

import { APP_NAME, APP_URL, LEGAL_CONTACT_EMAIL, LEGAL_UPDATED } from '@/lib/site';

export const metadata: Metadata = { title: 'Terms of service' };

export default function TermsOfServicePage() {
    return (
        <article>
            <h1>Terms of service</h1>
            <p className="text-sm text-muted-foreground">Last updated {LEGAL_UPDATED}.</p>
            <p>
                {APP_NAME} ({APP_URL}) is a free, privately run web app for groups of friends to
                plan things together. By creating an account or using the app you agree to these
                terms. They are short because the app is simple.
            </p>

            <h2>The service</h2>
            <p>
                The app lets you create and join groups, collect activity ideas, see when members
                are free, plan dates, keep leaderboards and, if you choose, connect a Google
                Calendar. It is offered as it is, as a hobby project, without any promise of
                availability, support or that it will keep existing. We may change or stop it at any
                time.
            </p>

            <h2>Your account</h2>
            <ul>
                <li>You need to be at least 16 years old.</li>
                <li>One account per person; keep your sign-in to yourself.</li>
                <li>
                    You are responsible for what you post. Keep it to things your friends would be
                    fine seeing.
                </li>
                <li>You can delete your account at any time from the settings page.</li>
            </ul>

            <h2>Acceptable use</h2>
            <p>Do not use the app to:</p>
            <ul>
                <li>harass, threaten or impersonate anyone;</li>
                <li>post content that is illegal, or that you have no right to share;</li>
                <li>
                    scrape, overload or break the service, or access other people&rsquo;s data in
                    ways the app does not offer.
                </li>
            </ul>
            <p>We may remove content or close accounts that do.</p>

            <h2>Groups and content</h2>
            <p>
                Group owners and admins manage their groups and members. What you put in a group is
                visible to its members. If you leave a group or delete your account, activities and
                scores you created stay in the group under your name as it was, as described in the{' '}
                <Link href="/privacy_policy" className="underline">
                    privacy policy
                </Link>
                .
            </p>

            <h2>Google Calendar</h2>
            <p>
                Connecting a calendar is optional. The app only reads your calendars to show your
                groups whether you are busy or free, and writes to your calendar only if you turn
                that on. How that data is handled is in the privacy policy. Google&rsquo;s own terms
                apply to your Google account.
            </p>

            <h2>Liability</h2>
            <p>
                The app is provided without warranty of any kind. To the extent the law allows, we
                are not liable for any damage arising from using it, from it being unavailable, or
                from data loss. Keep anything important somewhere else as well.
            </p>

            <h2>Changes and contact</h2>
            <p>
                We may update these terms; the date at the top says when. Questions go to{' '}
                <a className="underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
                    {LEGAL_CONTACT_EMAIL}
                </a>
                . Dutch law applies.
            </p>
        </article>
    );
}
