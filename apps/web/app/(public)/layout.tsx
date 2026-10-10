import { AppRuntime } from '@/components/layout/app-runtime';
import { PublicShell } from '@/components/layout/public-shell';

/**
 * The pages a signed-out person sees: login, the emailed links. Same
 * providers as the app (the forms are translated and call the API), no gate
 * and no app chrome.
 */
export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <AppRuntime>
            <PublicShell>{children}</PublicShell>
        </AppRuntime>
    );
}
