'use client';

import { useTranslation } from 'react-i18next';

import { InstallInstructions } from '@/components/common/install-instructions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useInstallApp } from '@/hooks/use-install-app';

/** Settings: install the app, or a note that it already is. */
export function InstallAppCard() {
    const { t } = useTranslation();
    const install = useInstallApp();

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('install.title')}</CardTitle>
                <CardDescription>
                    {install.installed ? t('install.alreadyInstalled') : t('install.description')}
                </CardDescription>
            </CardHeader>
            {!install.installed && (
                <CardContent>
                    <InstallInstructions
                        method={install.method}
                        onPrompt={() => void install.prompt()}
                    />
                </CardContent>
            )}
        </Card>
    );
}
