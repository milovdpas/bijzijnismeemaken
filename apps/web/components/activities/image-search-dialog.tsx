'use client';

import { ERROR_CODES } from '@bzim/types';
import type { ImageResultDto } from '@bzim/types';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormMessage } from '@/components/common/form-message';
import { Pagination } from '@/components/common/pagination';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useImageSearch } from '@/hooks/queries/use-images';
import { markImageUsed } from '@/lib/api/images';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { errorKey, isApiError } from '@/lib/api/errors';

/**
 * Find a free photo (Unsplash, through the API). Picking one hands its URL
 * back and closes; the photographer stays credited under each thumbnail and
 * the provider is told about the pick, which is what Unsplash asks in return.
 */
export function ImageSearchDialog({
    open,
    onOpenChange,
    initialQuery,
    onPick,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialQuery: string;
    onPick: (image: ImageResultDto) => void;
}) {
    const { t } = useTranslation();
    const [query, setQuery] = useState(initialQuery);
    const [page, setPage] = useState(1);
    const q = useDebouncedValue(query.trim(), 400);
    const results = useImageSearch(q, page);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t('imageField.dialogTitle')}</DialogTitle>
                    <DialogDescription>{t('imageField.dialogDescription')}</DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        autoFocus
                        type="search"
                        className="pl-9"
                        placeholder={t('imageField.queryPlaceholder')}
                        aria-label={t('imageField.dialogTitle')}
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setPage(1);
                        }}
                    />
                </div>

                {results.isError && (
                    <FormMessage tone="error">
                        {isApiError(results.error, ERROR_CODES.PROVIDER_ERROR)
                            ? t('imageField.unavailable')
                            : t(errorKey(results.error))}
                    </FormMessage>
                )}
                {results.data !== undefined && results.data.items.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t('imageField.noResults')}</p>
                )}
                {results.data !== undefined && results.data.items.length > 0 && (
                    <ul
                        className={
                            results.isPlaceholderData
                                ? 'grid grid-cols-2 gap-2 opacity-60 sm:grid-cols-3'
                                : 'grid grid-cols-2 gap-2 sm:grid-cols-3'
                        }
                    >
                        {results.data.items.map((image) => (
                            <li key={image.id}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        // Unsplash counts this as the download; nothing waits on it.
                                        void markImageUsed(image.useToken).catch(() => undefined);
                                        onPick(image);
                                    }}
                                    aria-label={image.alt || image.photographer}
                                    className="group block w-full overflow-hidden rounded-t-xl border border-b-0 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary remote host; next/image needs a fixed allow-list */}
                                    <img
                                        src={image.previewUrl}
                                        alt={image.alt}
                                        loading="lazy"
                                        className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105"
                                    />
                                </button>
                                {/* Outside the button: a link may not sit inside one, and Unsplash wants both names linked. */}
                                <p className="truncate rounded-b-xl border border-t-0 px-2 py-1 text-[11px] text-muted-foreground">
                                    {t('imageField.creditBy')}{' '}
                                    <a
                                        href={image.photographerUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="underline"
                                    >
                                        {image.photographer}
                                    </a>{' '}
                                    {t('imageField.creditOn')}{' '}
                                    <a
                                        href="https://unsplash.com/?utm_source=bij_zijn_is_meemaken&utm_medium=referral"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="underline"
                                    >
                                        Unsplash
                                    </a>
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
                {results.data !== undefined && (
                    <Pagination page={page} hasMore={results.data.hasMore} onPageChange={setPage} />
                )}
                <p className="text-center text-xs text-muted-foreground">
                    <a
                        href="https://unsplash.com/?utm_source=bij_zijn_is_meemaken&utm_medium=referral"
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                    >
                        {t('imageField.poweredBy')}
                    </a>
                </p>
            </DialogContent>
        </Dialog>
    );
}
