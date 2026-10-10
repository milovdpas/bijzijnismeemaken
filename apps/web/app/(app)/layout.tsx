import { AppRuntime } from '@/components/layout/app-runtime';
import { AppShell } from '@/components/layout/app-shell';
import { AuthGate } from '@/components/layout/auth-gate';

/**
 * Everything under `(app)` is the signed-in application. The providers it
 * needs (i18n, TanStack Query) are mounted here, the gate decides who may be
 * here before anything else paints, and the shell gives every page the same
 * top bar and bottom nav.
 */
export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <AppRuntime>
            <AuthGate>
                <AppShell>{children}</AppShell>
            </AuthGate>
        </AppRuntime>
    );
}
