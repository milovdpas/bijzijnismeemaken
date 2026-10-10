import type { Metadata } from 'next';

import { APP_NAME, APP_URL, LEGAL_CONTACT_EMAIL, LEGAL_UPDATED } from '@/lib/site';

export const metadata: Metadata = { title: 'Privacy policy' };

export default function PrivacyPolicyPage() {
    return (
        <article>
            <h1>Privacy policy</h1>
            <p className="text-sm text-muted-foreground">Last updated {LEGAL_UPDATED}.</p>
            <p>
                {APP_NAME} (&ldquo;the app&rdquo;, available at {APP_URL}) is a small web app for
                groups of friends to collect activity ideas, see when everyone is free, plan dates
                and keep leaderboards. It is run privately by Milo van der Pas (&ldquo;we&rdquo;).
                This page explains what the app stores, why, and what happens to it.
            </p>

            <h2>What we store</h2>
            <ul>
                <li>
                    <strong>Account:</strong> your e-mail address, and either a Google account
                    identifier (when you sign in with Google) or a password hash. Your e-mail
                    address is stored encrypted.
                </li>
                <li>
                    <strong>Profile:</strong> a handle, a display name, a chosen avatar and your
                    language.
                </li>
                <li>
                    <strong>What you do in the app:</strong> the groups you are in, the activities,
                    plans, interests, leaderboard scores and widgets you create or take part in, and
                    the dayparts you mark yourself as unavailable.
                </li>
                <li>
                    <strong>Technical:</strong> session tokens so you stay signed in, and server
                    logs with request errors.
                </li>
            </ul>

            <h2>Google user data</h2>
            <p>
                Signing in with Google gives the app your Google account id, your e-mail address and
                whether Google has verified it. That is used to create and find your account and for
                nothing else.
            </p>
            <p>
                If you choose to connect a Google Calendar, the app asks for the Google Calendar
                scopes <code>calendar.readonly</code> and, only if you turn on &ldquo;add planned
                activities to my calendar&rdquo;, <code>calendar.events</code>. In plain words:
            </p>
            <ul>
                <li>
                    <strong>What is accessed:</strong> the list of your calendars; the events of the
                    calendars you switch on, for the coming 180 days (start, end, title, all-day or
                    not, whether it is marked &ldquo;free&rdquo;, and its series id); the e-mail
                    address of the connected Google account.
                </li>
                <li>
                    <strong>How it is used:</strong> to show the other members of your groups
                    whether you are busy or free in a morning, afternoon or evening, and, with the
                    write permission, to put activities you are planned in for into your own
                    calendar. Nothing else.
                </li>
                <li>
                    <strong>How it is stored:</strong> the events are copied to the app&rsquo;s
                    database and refreshed nightly; the access and refresh tokens Google issues are
                    stored encrypted with a key kept separate from the rest of the data; the account
                    e-mail is stored encrypted.
                </li>
                <li>
                    <strong>Who it is shared with:</strong> nobody. Other members only ever see
                    &ldquo;busy&rdquo; or &ldquo;free&rdquo;. The titles and details of your
                    appointments are shown to you alone, on your own settings page. No calendar data
                    goes to any third party.
                </li>
                <li>
                    <strong>How long it is kept:</strong> until you disconnect the calendar or
                    delete your account, whichever comes first. Disconnecting revokes the app at
                    Google and deletes the copied events and the tokens at once.
                </li>
            </ul>
            <p>
                The events are used for one thing: to show the other members of your groups whether
                you are busy or free in a morning, afternoon or evening.{' '}
                <strong>
                    Nobody but you ever sees the titles or details of your appointments.
                </strong>{' '}
                Other members only see &ldquo;busy&rdquo; or &ldquo;free&rdquo;. Events you mark as
                &ldquo;free&rdquo; in Google, and events you tell the app to ignore, never make you
                busy.
            </p>
            <p>
                The app&rsquo;s use of information received from Google APIs adheres to the{' '}
                <a
                    className="underline"
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    rel="noreferrer"
                    target="_blank"
                >
                    Google API Services User Data Policy
                </a>
                , including the Limited Use requirements. Calendar data is not used for advertising,
                not sold, not shared with anyone outside the app, and not used to train models.
            </p>
            <p>
                You can disconnect the calendar at any time on your settings page. Disconnecting
                revokes the app&rsquo;s access at Google and deletes the copied events and the
                tokens. You can also revoke access from your Google account&rsquo;s security
                settings.
            </p>

            <h2>Why we store it</h2>
            <p>
                Only to run the app for you and your friends: to sign you in, to show your groups
                what you plan and when you are free, and to send the e-mails below. There is no
                advertising, no tracking across other sites, and no selling of data.
            </p>

            <h2>E-mail</h2>
            <p>
                The app sends e-mail for sign-up verification, password resets, group invitations,
                new activities in your groups and activities you are planned in for. You can switch
                the group e-mails off per type in your notification settings. E-mail is sent through
                Brevo, which processes your address and the message for delivery.
            </p>

            <h2>Other services</h2>
            <ul>
                <li>
                    <strong>Google</strong> for sign-in and, if you connect it, your calendar, as
                    described above.
                </li>
                <li>
                    <strong>Unsplash</strong> when a member searches for a photo for an activity or
                    group. The search words go to Unsplash; the chosen photo is shown from
                    Unsplash&rsquo;s servers.
                </li>
                <li>
                    <strong>Brevo</strong> for sending e-mail.
                </li>
            </ul>
            <p>
                The app is hosted on a server in the European Union. Nothing else receives your
                data.
            </p>

            <h2>Who can see what</h2>
            <p>
                Members of a group see each other&rsquo;s handle, display name, avatar, and
                everything created inside that group. Your availability is shown to your groups as
                busy or free only. A public group&rsquo;s name and description are visible to every
                signed-in user.
            </p>

            <h2>How long</h2>
            <ul>
                <li>Your account and everything in it: until you delete the account.</li>
                <li>Copied calendar events: replaced on every sync; past events are removed.</li>
                <li>
                    Sign-in sessions: 60 days, or until you sign out; expired ones are removed
                    within a month.
                </li>
            </ul>
            <p>
                Deleting your account (Settings → Delete account) removes your account, your
                sessions, your calendar connection and events, and takes you out of every group.
                Scores you entered on leaderboards and activities you created stay in those groups
                with your display name as it was, so the group&rsquo;s history keeps making sense;
                they are no longer linked to an account.
            </p>

            <h2>Your rights</h2>
            <p>
                You can see and change your data in the app, export nothing yet (ask us), and delete
                your account yourself. For anything else, or to object to how data is handled, write
                to{' '}
                <a className="underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
                    {LEGAL_CONTACT_EMAIL}
                </a>
                .
            </p>

            <h2>Changes</h2>
            <p>
                When this page changes in a way that matters, the date at the top changes with it.
            </p>
        </article>
    );
}
