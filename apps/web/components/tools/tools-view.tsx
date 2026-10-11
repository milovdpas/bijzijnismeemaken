'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { useMounted } from '@/hooks/use-mounted';
import { readStored } from '@/lib/stored';
import { TOOLS, toolHref, toolStorageKey } from '@/lib/tools';

/** The tools tab: every helper, and which of them has a game going on this device. */
export function ToolsView({ groupId }: { groupId: string }) {
    const { t } = useTranslation();
    const mounted = useMounted();

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('tools.intro')}</p>
            <div className="grid gap-3 md:grid-cols-2">
                {TOOLS.map(({ key, icon: Icon, labelKey, descriptionKey, inProgress }) => {
                    const busy =
                        mounted &&
                        readStored(toolStorageKey(groupId, key), (stored) => inProgress(stored)) ===
                            true;
                    return (
                        <Link
                            key={key}
                            href={toolHref(groupId, key)}
                            className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-ink/40"
                        >
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                                <Icon className="size-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                    <span className="text-base font-bold">{t(labelKey)}</span>
                                    {busy && (
                                        <Badge variant="secondary">{t('tools.inProgress')}</Badge>
                                    )}
                                </span>
                                <span className="mt-0.5 block text-sm text-muted-foreground">
                                    {t(descriptionKey)}
                                </span>
                            </span>
                            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
