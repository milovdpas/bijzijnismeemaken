'use client';

import { ImageOff, Images, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ImageSearchDialog } from '@/components/activities/image-search-dialog';
import { Field } from '@/components/common/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * The activity image: a link field with a live preview, so a pasted URL is
 * proven to show a picture before it is saved, plus the stock photo search.
 * The preview is keyed on the URL, so a corrected link gets a fresh try.
 */
export function ImageField({
    value,
    onChange,
    suggestedQuery,
}: {
    value: string;
    onChange: (url: string) => void;
    suggestedQuery: string;
}) {
    const { t } = useTranslation();
    const [searching, setSearching] = useState(false);
    const [broken, setBroken] = useState<string | null>(null);
    const url = value.trim();
    const showsImage = url !== '' && broken !== url;

    return (
        <Field
            label={t('imageField.label')}
            help={t('imageField.help')}
            error={broken === url && url !== '' ? t('imageField.invalid') : null}
        >
            <div className="grid gap-3">
                {url !== '' && (
                    <div className="relative overflow-hidden rounded-xl border bg-muted">
                        {showsImage ? (
                            /* eslint-disable-next-line @next/next/no-img-element -- arbitrary remote host; next/image needs a fixed allow-list */
                            <img
                                key={url}
                                src={url}
                                alt=""
                                className="aspect-[2/1] w-full object-cover"
                                onError={() => setBroken(url)}
                            />
                        ) : (
                            <div className="flex aspect-[2/1] w-full items-center justify-center text-muted-foreground">
                                <ImageOff className="size-8" />
                            </div>
                        )}
                        <Button
                            type="button"
                            size="icon-sm"
                            variant="secondary"
                            className="absolute top-2 right-2"
                            aria-label={t('imageField.remove')}
                            onClick={() => onChange('')}
                        >
                            <X />
                        </Button>
                    </div>
                )}
                <div className="flex gap-2">
                    <Input
                        type="url"
                        inputMode="url"
                        placeholder="https://"
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                    />
                    <Button type="button" variant="outline" onClick={() => setSearching(true)}>
                        <Images />
                        {t('imageField.search')}
                    </Button>
                </div>
            </div>
            {searching && (
                <ImageSearchDialog
                    open
                    onOpenChange={(open) => {
                        if (!open) setSearching(false);
                    }}
                    initialQuery={suggestedQuery}
                    onPick={(image) => {
                        onChange(image.url);
                        setSearching(false);
                    }}
                />
            )}
        </Field>
    );
}
