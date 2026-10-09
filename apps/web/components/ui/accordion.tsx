'use client';

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

function Accordion({ className, multiple = true, ...props }: AccordionPrimitive.Root.Props) {
    return (
        <AccordionPrimitive.Root
            data-slot="accordion"
            // Base UI defaults `multiple` to false, which makes opening one section
            // close the last. That is right for an FAQ and wrong for a settings page:
            // someone comparing two settings should not have to close one to see the
            // other. Overridden here rather than at the call site so it is the
            // behaviour of *our* accordion, not a flag every user has to remember.
            multiple={multiple}
            className={cn('flex flex-col gap-3', className)}
            {...props}
        />
    );
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
    return (
        <AccordionPrimitive.Item
            data-slot="accordion-item"
            className={cn('overflow-hidden rounded-xl border bg-card', className)}
            {...props}
        />
    );
}

function AccordionTrigger({ className, children, ...props }: AccordionPrimitive.Trigger.Props) {
    return (
        <AccordionPrimitive.Header data-slot="accordion-header">
            <AccordionPrimitive.Trigger
                data-slot="accordion-trigger"
                className={cn(
                    'flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring',
                    className,
                )}
                {...props}
            >
                {children}
                {/* Rotates rather than swapping glyphs, so the direction of travel is
            visible during the transition instead of only at the ends. */}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 data-panel-open:rotate-180" />
            </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
    );
}

function AccordionPanel({ className, children, ...props }: AccordionPrimitive.Panel.Props) {
    return (
        <AccordionPrimitive.Panel
            data-slot="accordion-panel"
            // Base UI measures the panel and exposes its height as a CSS variable, so
            // the open/close transition animates to a real height rather than to an
            // arbitrary max-height that has to be guessed above the tallest content.
            className={cn(
                'h-[var(--accordion-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0',
                className,
            )}
            {...props}
        >
            <div className="border-t p-4">{children}</div>
        </AccordionPrimitive.Panel>
    );
}

export { Accordion, AccordionItem, AccordionPanel, AccordionTrigger };
