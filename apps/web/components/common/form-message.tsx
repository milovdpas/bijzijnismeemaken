import { CheckCircle2, CircleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * An inline notice under a form: an error the person has to act on, or a
 * success they should notice. Inline rather than a toast, because it belongs
 * to the form and should still be there after a glance away.
 */
export function FormMessage({
    tone,
    children,
    className,
}: {
    tone: 'error' | 'success';
    children: React.ReactNode;
    className?: string;
}) {
    const Icon = tone === 'error' ? CircleAlert : CheckCircle2;

    return (
        <div
            role={tone === 'error' ? 'alert' : 'status'}
            className={cn(
                'flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm',
                tone === 'error'
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-free/25 text-foreground',
                className,
            )}
        >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <div>{children}</div>
        </div>
    );
}
