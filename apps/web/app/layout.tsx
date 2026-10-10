import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Nunito } from 'next/font/google';
import './globals.css';
import { PaletteApplier } from '@/components/layout/palette-applier';
import { ServiceWorker } from '@/components/layout/service-worker';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { APP_NAME, APP_TAGLINE, APP_URL } from '@/lib/site';

/**
 * Nunito for everything: its rounded terminals are where the "playful" in the
 * brief comes from, and at weight 700 it still reads as a heading rather than a
 * toy. One family keeps the bundle small on a phone.
 */
const nunito = Nunito({
    variable: '--font-sans',
    subsets: ['latin'],
    weight: ['400', '600', '700', '800'],
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
    // Google Search Console's meta-tag method, for proving the domain is ours
    // (the OAuth app verification asks for it). Set at build time; absent locally.
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION === undefined
        ? {}
        : { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }),
};

export const viewport: Viewport = {
    // The literal value of --brand in globals.css. Keep the two in step: this is
    // the browser/OS chrome colour and a mismatch shows as a seam above the app.
    themeColor: '#ffc72c',
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
            className={`${nunito.variable} ${geistMono.variable} h-full antialiased`}
        >
            <body className="min-h-dvh">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <PaletteApplier />
                    <ServiceWorker />
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
