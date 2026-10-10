'use client';

import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { googleLoginUrl } from '@/lib/api/auth';

/**
 * A plain link styled as a button: the API answers with a redirect to Google,
 * so this has to be a real navigation, not a fetch.
 */
export function GoogleButton({ returnTo }: { returnTo?: string }) {
    const { t } = useTranslation();

    return (
        <Button
            size="lg"
            variant="outline"
            className="w-full"
            render={<a href={googleLoginUrl(returnTo)} />}
        >
            <GoogleMark />
            {t('login.google')}
        </Button>
    );
}

function GoogleMark() {
    return (
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
            <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z"
            />
            <path
                fill="#34A853"
                d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.2v3.1A12 12 0 0 0 12 24z"
            />
            <path
                fill="#FBBC05"
                d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.2a12 12 0 0 0 0 10.8l4.1-3.1z"
            />
            <path
                fill="#EA4335"
                d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.2 6.6l4.1 3.1c.9-2.9 3.6-4.9 6.7-4.9z"
            />
        </svg>
    );
}
