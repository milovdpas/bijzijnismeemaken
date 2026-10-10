'use client';

import { ImageOff, Images, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ImageCredit } from '@/components/activities/image-credit';
import { ImageSearchDialog } from '@/components/activities/image-search-dialog';
import { Field } from '@/components/common/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface PhotoCredit {
    name: string;
    url: string;
}

/**
 * The activity image: a link field with a live preview, so a pasted URL is
 * proven to show a picture before it is saved, plus the stock photo search.
 * A picked photo carries its photographer; typing a link drops the credit,
 * because it no longer describes what is shown.
 */
export function ImageField({
    value,
    credit,
    onChange,
    suggestedQuery,
}: {
    value: string;
    credit: PhotoCredit | null;
    onChange: (url: string, credit: PhotoCredit | null) => void;
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
            <div className="grid gap-2">
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
                            onClick={() => onChange('', null)}
                        >
                            <X />
                        </Button>
                    </div>
                )}
                {showsImage && credit !== null && <ImageCredit credit={credit} />}
                <div className="flex gap-2">
                    <Input
                        type="url"
                        inputMode="url"
                        placeholder="https://"
                        value={value}
                        onChange={(event) => onChange(event.target.value, null)}
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
                        onChange(image.url, {
                            name: image.photographer,
                            url: image.photographerUrl,
                        });
                        setSearching(false);
                    }}
                />
            )}
        </Field>
    );
}
