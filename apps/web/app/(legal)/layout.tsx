import Link from 'next/link';

import { AppLogo } from '@/components/layout/app-logo';
import { APP_NAME } from '@/lib/site';

/**
 * The legal pages: plain, wide, readable, in English, and reachable without
 * signing in, since Google's consent screen links to them and a reviewer
 * has no account. No i18n provider: the text is static.
 */
export default function LegalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <div className="min-h-dvh">
            <header className="border-b">
                <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
                    <Link href="/" className="flex items-center gap-2.5">
                        <AppLogo size="sm" />
                        <span className="text-base font-bold text-ink">{APP_NAME}</span>
                    </Link>
                </div>
            </header>
            <main className="mx-auto max-w-3xl px-4 py-8 [&_h1]:mb-2 [&_h1]:text-3xl [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-xl [&_li]:my-1 [&_p]:my-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6">
                {children}
            </main>
            <footer className="mx-auto flex max-w-3xl gap-4 px-4 py-8 text-xs text-muted-foreground">
                <Link href="/privacy_policy" className="hover:text-foreground">
                    Privacy policy
                </Link>
                <Link href="/terms_of_service" className="hover:text-foreground">
                    Terms of service
                </Link>
                <Link href="/login" className="ml-auto hover:text-foreground">
                    Sign in
                </Link>
            </footer>
        </div>
    );
}
