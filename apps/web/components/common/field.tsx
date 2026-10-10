'use client';

import { cloneElement, isValidElement, useId } from 'react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** HTML elements a `<label for>` may legally point at. */
const LABELABLE_TAGS = new Set([
    'input',
    'select',
    'textarea',
    'button',
    'meter',
    'output',
    'progress',
]);

/**
 * A labelled form control. An app convention rather than a shadcn primitive,
 * so it lives here and not in components/ui.
 *
 * One control (an `Input`) gets an id and a matching `htmlFor`; a caller's own
 * `id` always wins. Several children, or a group of buttons, have no single
 * control to point at, so they become a labelled `role="group"` instead.
 * Optional help text and an error line are associated through
 * `aria-describedby`, so a screen reader hears them with the field.
 */
export function Field({
    label,
    help,
    error,
    children,
    className,
}: {
    label: string;
    help?: string;
    error?: string | null;
    children: React.ReactNode;
    className?: string;
}) {
    const id = useId();
    const labelId = `${id}-label`;
    const controlId = `${id}-control`;
    const describedBy = [help ? `${id}-help` : null, error ? `${id}-error` : null]
        .filter(Boolean)
        .join(' ');

    const element = isValidElement<{ id?: string; 'aria-describedby'?: string }>(children)
        ? children
        : null;
    const single =
        element && (typeof element.type !== 'string' || LABELABLE_TAGS.has(element.type))
            ? element
            : null;
    const existingId = single?.props.id;

    return (
        <div className={cn('grid gap-1.5', className)}>
            <Label
                id={labelId}
                htmlFor={single ? (existingId ?? controlId) : undefined}
                className="text-xs font-semibold text-muted-foreground"
            >
                {label}
            </Label>
            {single ? (
                cloneElement(single, {
                    id: existingId ?? controlId,
                    'aria-describedby': describedBy || undefined,
                })
            ) : (
                <div role="group" aria-labelledby={labelId} className="grid gap-1.5">
                    {children}
                </div>
            )}
            {help !== undefined && !error && (
                <p id={`${id}-help`} className="text-xs text-muted-foreground">
                    {help}
                </p>
            )}
            {error ? (
                <p id={`${id}-error`} className="text-xs font-semibold text-destructive">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
