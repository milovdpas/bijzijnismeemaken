'use client';

import { useTranslation } from 'react-i18next';

import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

/**
 * "Are you sure?" for the actions that cannot be undone: removing someone,
 * leaving, deleting a group, replacing an invite link. Controlled by the
 * caller, which owns the mutation; this only renders the question, the two
 * buttons and whatever went wrong on the last try.
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    destructive = false,
    pending = false,
    error,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    confirmLabel: string;
    destructive?: boolean;
    pending?: boolean;
    error?: string | null;
    onConfirm: () => void;
}) {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description !== undefined && (
                        <DialogDescription>{description}</DialogDescription>
                    )}
                </DialogHeader>
                {error ? <FormMessage tone="error">{error}</FormMessage> : null}
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={pending}
                        onClick={() => onOpenChange(false)}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="button"
                        variant={destructive ? 'destructive' : 'default'}
                        disabled={pending}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
