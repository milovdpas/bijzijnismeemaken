'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useMounted } from '@/hooks/use-mounted';

export function ThemeToggle() {
    const { t } = useTranslation();
    const { resolvedTheme, setTheme } = useTheme();
    const mounted = useMounted();

    const isDark = resolvedTheme === 'dark';

    return (
        <Button
            variant="ghost"
            size="icon"
            aria-label={t('common.toggleTheme')}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
        >
            {/* The server does not know the theme, so the moon is the stable
                first paint and the sun only appears once mounted. */}
            {mounted && isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </Button>
    );
}
