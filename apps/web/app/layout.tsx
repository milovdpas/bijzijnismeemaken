import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { APP_NAME, APP_TAGLINE, APP_URL } from '@/lib/site';

const geistSans = Geist({
    variable: '--font-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    // Without this, every relative canonical URL silently resolves against
    // localhost in production.
    metadataBase: new URL(APP_URL),
    title: {
        default: APP_NAME,
        template: `%s · ${APP_NAME}`,
    },
    description: APP_TAGLINE,
    applicationName: APP_NAME,
    // Installed to a home screen, this should open chromeless like the manifest
    // asks for; iOS reads it from here rather than the manifest.
    appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: 'default' },
    // A friends-only app has nothing to gain from being indexed.
    robots: { index: false, follow: false },
};

export const viewport: Viewport = {
    // The literal value of --brand in globals.css. Keep the two in step: this is
    // the browser/OS chrome colour and a mismatch shows as a seam above the app.
    themeColor: '#2f9e6a',
};

/**
 * The one provider every page genuinely needs, and nothing else.
 *
 * Theming applies to the login page as much as the app. Everything else the
 * app needs (i18n, TanStack Query, auth) lives in
 * `components/layout/app-runtime.tsx`, which mounts under `(app)` only, so the
 * login page stays light.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html
            lang="nl"
            suppressHydrationWarning
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
            <body className="min-h-dvh">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
