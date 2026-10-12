'use client';

import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Field } from '@/components/common/field';
import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAddCalendarFeed } from '@/hooks/queries/use-calendar';
import { refusalKey, retryAfterSeconds } from '@/lib/api/errors';

/**
 * Paste a calendar link (Apple, Outlook, any feed) and add it. The API reads
 * it on the spot, so a link that does not work is refused right here, with
 * the reason, while it is still in the box.
 */
export function AddFeedForm() {
    const { t } = useTranslation();
    const add = useAddCalendarFeed();
    const [url, setUrl] = useState('');
    const [added, setAdded] = useState<string | null>(null);
    const waitSeconds = retryAfterSeconds(add.error);

    return (
        <form
            className="space-y-2"
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                if (url.trim() === '') return;
                add.mutate(
                    { url: url.trim() },
                    {
                        onSuccess: (feed) => {
                            setUrl('');
                            setAdded(feed.name);
                        },
                    },
                );
            }}
        >
            <div className="flex items-end gap-2">
                <Field label={t('calendarFeeds.url')} className="min-w-0 flex-1">
                    <Input
                        inputMode="url"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={t('calendarFeeds.urlPlaceholder')}
                        value={url}
                        onChange={(event) => {
                            setUrl(event.target.value);
                            setAdded(null);
                        }}
                    />
                </Field>
                <Button type="submit" disabled={add.isPending || url.trim() === ''}>
                    {add.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
                    {t('calendarFeeds.add')}
                </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('calendarFeeds.secret')}</p>
            {add.isError && (
                <FormMessage tone="error">
                    {waitSeconds === null
                        ? t(refusalKey(add.error, 'calendarFeeds.problems'))
                        : t('calendarFeeds.addWait', { count: Math.ceil(waitSeconds / 60) })}
                </FormMessage>
            )}
            {added !== null && (
                <FormMessage tone="success">
                    {t('calendarFeeds.added', { name: added })}
                </FormMessage>
            )}
        </form>
    );
}
