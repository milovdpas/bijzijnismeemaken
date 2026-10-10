'use client';

import { CalendarIgnoreRuleKind } from '@bzim/types';
import { Repeat, Type, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useIgnoreRules, useRemoveIgnoreRule } from '@/hooks/queries/use-calendar';
import { errorKey } from '@/lib/api/errors';

/** The events kept out of the count: by title or by series, each with a way back in. */
export function IgnoreRulesCard() {
    const { t } = useTranslation();
    const rules = useIgnoreRules();
    const remove = useRemoveIgnoreRule();

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('calendarSettings.rulesTitle')}</CardTitle>
                <CardDescription>{t('calendarSettings.rulesDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
                {rules.isPending && <div className="h-12 animate-pulse rounded-xl bg-muted" />}
                {rules.isError && (
                    <FormMessage tone="error">{t(errorKey(rules.error))}</FormMessage>
                )}
                {rules.data !== undefined &&
                    (rules.data.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {t('calendarSettings.noRules')}
                        </p>
                    ) : (
                        <ul className="divide-y">
                            {rules.data.map((rule) => (
                                <li key={rule.id} className="flex items-center gap-3 py-2">
                                    {rule.kind === CalendarIgnoreRuleKind.SERIES ? (
                                        <Repeat className="size-4 shrink-0 text-muted-foreground" />
                                    ) : (
                                        <Type className="size-4 shrink-0 text-muted-foreground" />
                                    )}
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold">
                                            {rule.label}
                                        </span>
                                        <span className="block text-xs text-muted-foreground">
                                            {t(`calendarSettings.ruleKinds.${rule.kind}`)}
                                        </span>
                                    </span>
                                    <Button
                                        size="icon-xs"
                                        variant="ghost"
                                        disabled={remove.isPending}
                                        aria-label={t('calendarSettings.removeRule', {
                                            label: rule.label,
                                        })}
                                        onClick={() => remove.mutate(rule.id)}
                                    >
                                        <X />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    ))}
                {remove.isError && (
                    <FormMessage tone="error">{t(errorKey(remove.error))}</FormMessage>
                )}
            </CardContent>
        </Card>
    );
}
