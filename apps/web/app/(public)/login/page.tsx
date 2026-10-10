import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LoginView } from '@/components/auth/login-view';

export const metadata: Metadata = { title: 'Login' };

/** Suspense because the view reads the query string (`returnTo`, `error`). */
export default function LoginPage() {
    return (
        <Suspense>
            <LoginView />
        </Suspense>
    );
}
