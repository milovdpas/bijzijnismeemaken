'use client';

import { NotificationChannel, NotificationType } from '@bzim/types';
import type { NotificationSettingDto } from '@bzim/types';
import { Bell, BellOff, BellRing, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
    useDeletePushSubscription,
    useNotificationSettings,
    usePushSubscriptions,
    useUpdateNotificationSetting,
} from '@/hooks/queries/use-notifications';
import { usePush } from '@/hooks/use-push';
import { formatDate } from '@/lib/format-date';
import { describeDevice } from '@/lib/push';

/** Settings: push on this device, the other devices, and which type goes where. */
export function NotificationsCard() {
    const { t, i18n } = useTranslation();
    const settings = useNotificationSettings();
    const update = useUpdateNotificationSetting();
    const subscriptions = usePushSubscriptions();
    const removeDevice = useDeletePushSubscription();
    const device = usePush();

    const publicKey = subscriptions.data?.publicKey ?? null;
    const rows = subscriptions.data?.subscriptions ?? [];
    const mine = rows.find((row) => row.endpoint === device.endpoint);
    const others = rows.filter((row) => row.endpoint !== device.endpoint);

    const toggle = (row: NotificationSettingDto, channel: NotificationChannel, on: boolean) => {
        update.mutate({ type: row.type, channels: { ...row, [channel]: on } });
    };

    // One line that says where this device stands, and whether a button belongs beside it.
    const status = (() => {
        if (device.support === 'needs-install') return { key: 'notifications.needsInstall' };
        if (device.support === 'unsupported') return { key: 'notifications.unsupported' };
        if (subscriptions.isSuccess && publicKey === null) {
            return { key: 'notifications.unavailable' };
        }
        if (device.permission === 'denied') return { key: 'notifications.blocked' };
        if (device.endpoint !== null) return { key: 'notifications.deviceOn', action: 'off' };
        return { key: 'notifications.deviceOff', action: 'on' };
    })();

    return (
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="size-4 text-muted-foreground" />
                    {t('notifications.title')}
                </CardTitle>
                <CardDescription>{t('notifications.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <section className="space-y-3 rounded-xl border bg-muted/30 p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="flex items-center gap-2">
                            {device.endpoint !== null ? (
                                <BellRing className="size-4 text-brand" />
                            ) : (
                                <BellOff className="size-4 text-muted-foreground" />
                            )}
                            {t(status.key)}
                        </p>
                        {status.action === 'on' && (
                            <Button
                                size="sm"
                                disabled={device.busy || publicKey === null}
                                onClick={() => void device.enable(publicKey ?? '')}
                            >
                                {t('notifications.turnOn')}
                            </Button>
                        )}
                        {status.action === 'off' && (
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={device.busy}
                                onClick={() => void device.disable(mine?.id)}
                            >
                                {t('notifications.turnOff')}
                            </Button>
                        )}
                    </div>
                    {device.error !== null && (
                        <FormMessage tone="error">{t(device.error)}</FormMessage>
                    )}
                    {others.length > 0 && (
                        <ul className="space-y-1 border-t pt-3">
                            <li className="text-xs font-semibold text-muted-foreground uppercase">
                                {t('notifications.otherDevices')}
                            </li>
                            {others.map((row) => (
                                <li
                                    key={row.id}
                                    className="flex items-center justify-between gap-2"
                                >
                                    <span className="truncate">
                                        {describeDevice(row.userAgent) ||
                                            t('notifications.unknownDevice')}
                                        <span className="text-muted-foreground">
                                            {' · '}
                                            {formatDate(row.createdAt, i18n.language)}
                                        </span>
                                    </span>
                                    <Button
                                        size="icon-sm"
                                        variant="ghost"
                                        aria-label={t('notifications.removeDevice')}
                                        disabled={removeDevice.isPending}
                                        onClick={() => removeDevice.mutate(row.id)}
                                    >
                                        <X />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section>
                    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 gap-y-3 text-sm">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">
                            {t('notifications.typesTitle')}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground uppercase">
                            {t('notifications.email')}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground uppercase">
                            {t('notifications.push')}
                        </span>
                        {Object.values(NotificationType).map((type) => {
                            const row = settings.data?.find((item) => item.type === type);
                            return (
                                <RowSwitches
                                    key={type}
                                    row={row}
                                    label={t(`notifications.types.${type}`)}
                                    onToggle={toggle}
                                />
                            );
                        })}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                        {t('notifications.pushHint')}
                    </p>
                </section>
            </CardContent>
        </Card>
    );
}

function RowSwitches({
    row,
    label,
    onToggle,
}: {
    row: NotificationSettingDto | undefined;
    label: string;
    onToggle: (row: NotificationSettingDto, channel: NotificationChannel, on: boolean) => void;
}) {
    return (
        <>
            <span>{label}</span>
            <Switch
                checked={row?.email ?? false}
                disabled={row === undefined}
                onCheckedChange={(on) => row && onToggle(row, NotificationChannel.EMAIL, on)}
            />
            <Switch
                checked={row?.push ?? false}
                disabled={row === undefined}
                onCheckedChange={(on) => row && onToggle(row, NotificationChannel.PUSH, on)}
            />
        </>
    );
}
