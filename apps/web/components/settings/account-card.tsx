'use client';

import type { MeResponse } from '@bzim/types';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common/avatar';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useLogout } from '@/hooks/queries/use-me';

/** Who is signed in, how, and the way out. Deleting the account is its own card below. */
export function AccountCard({ me }: { me: MeResponse }) {
    const { t } = useTranslation();
    const router = useRouter();
    const logout = useLogout();

    const methods = [
        me.hasGoogle ? t('settings.viaGoogle') : null,
        me.hasPassword ? t('settings.viaPassword') : null,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('settings.account')}</CardTitle>
                <CardDescription>{t('settings.accountDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
                {me.avatarKey !== null && <Avatar avatarKey={me.avatarKey} size="md" />}
                <div className="min-w-0 text-sm">
                    <p className="truncate font-semibold">{me.displayName ?? me.email}</p>
                    <p className="truncate text-muted-foreground">{me.email}</p>
                    <p className="text-xs text-muted-foreground">{methods}</p>
                </div>
            </CardContent>
            <CardFooter className="justify-end">
                <Button
                    variant="outline"
                    disabled={logout.isPending}
                    onClick={() =>
                        logout.mutate(undefined, { onSettled: () => router.replace('/login') })
                    }
                >
                    <LogOut className="size-4" />
                    {t('settings.signOut')}
                </Button>
            </CardFooter>
        </Card>
    );
}
