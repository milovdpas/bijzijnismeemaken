import { AppRuntime } from '@/components/layout/app-runtime';

/**
 * Everything under `(app)` is the signed-in application. The providers it
 * needs (i18n, TanStack Query, later auth) are mounted here and nowhere else,
 * so the login page does not pay for them.
 */
export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <AppRuntime>
            <main className="mx-auto w-full max-w-5xl px-4 pb-(--h-bottomnav) pt-4 md:px-6">
                {children}
            </main>
        </AppRuntime>
    );
}
