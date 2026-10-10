import { AppRuntime } from '@/components/layout/app-runtime';
import { AppShell } from '@/components/layout/app-shell';
import { AuthGate } from '@/components/layout/auth-gate';

/**
 * Everything under `(app)` is the signed-in application. The providers it
 * needs (i18n, TanStack Query) are mounted here, the gate decides who may be
 * here, and the shell gives every page the same top bar and bottom nav.
 */
export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <AppRuntime>
            <AppShell>
                <AuthGate>{children}</AuthGate>
            </AppShell>
        </AppRuntime>
    );
}
