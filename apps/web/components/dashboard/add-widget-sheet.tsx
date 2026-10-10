'use client';

import type { WidgetType } from '@bzim/types';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { WIDGET_ICONS } from '@/components/dashboard/widget-icons';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { WIDGET_TYPES } from '@/lib/dashboard';

/** The six kinds of widget, each a row; picking one opens its settings. */
export function AddWidgetSheet({
    open,
    onOpenChange,
    onPick,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onPick: (type: WidgetType) => void;
}) {
    const { t } = useTranslation();

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-2xl">
                <SheetHeader>
                    <SheetTitle>{t('dashboard.addWidget')}</SheetTitle>
                    <SheetDescription>{t('dashboard.addWidgetHelp')}</SheetDescription>
                </SheetHeader>
                <ul className="divide-y px-4 pb-6">
                    {WIDGET_TYPES.map((type) => {
                        const Icon = WIDGET_ICONS[type];
                        return (
                            <li key={type}>
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-3 py-3 text-left hover:text-ink"
                                    onClick={() => onPick(type)}
                                >
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                                        <Icon className="size-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold">
                                            {t(`widgets.${type}.name`)}
                                        </span>
                                        <span className="block text-xs text-muted-foreground">
                                            {t(`widgets.${type}.description`)}
                                        </span>
                                    </span>
                                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </SheetContent>
        </Sheet>
    );
}
