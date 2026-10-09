import { AppRuntime } from '@/components/layout/app-runtime';
import { AppShell } from '@/components/layout/app-shell';

/**
 * Everything under `(app)` is the signed-in application. The providers it
 * needs (i18n, TanStack Query, later auth) are mounted here and nowhere else,
 * so the login page does not pay for them, and the shell gives every page the
 * same top bar and bottom nav.
 */
export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <AppRuntime>
            <AppShell>{children}</AppShell>
        </AppRuntime>
    );
}
