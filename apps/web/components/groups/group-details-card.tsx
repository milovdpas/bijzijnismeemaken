'use client';

import { GROUP } from '@bzim/types';
import type { GroupAccess, GroupDetailResponse } from '@bzim/types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Field } from '@/components/common/field';
import { ImageField } from '@/components/common/image-field';
import { FormMessage } from '@/components/common/form-message';
import { AccessPicker } from '@/components/groups/access-picker';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateGroup } from '@/hooks/queries/use-groups';
import { errorKey } from '@/lib/api/errors';

interface FormState {
    name: string;
    description: string;
    imageUrl: string;
    imageCreditName: string;
    imageCreditUrl: string;
    access: GroupAccess;
}

/** Name, description and access. Saves only what changed, like the profile card. */
export function GroupDetailsCard({ group }: { group: GroupDetailResponse }) {
    const { t } = useTranslation();
    const update = useUpdateGroup(group.id);
    const [form, setForm] = useState<FormState>({
        name: group.name,
        description: group.description ?? '',
        imageUrl: group.imageUrl ?? '',
        imageCreditName: group.imageCreditName ?? '',
        imageCreditUrl: group.imageCreditUrl ?? '',
        access: group.access,
    });
    const [saved, setSaved] = useState(false);

    const name = form.name.trim();
    const description = form.description.trim();
    const imageUrl = form.imageUrl.trim();
    const imageChanged =
        imageUrl !== (group.imageUrl ?? '') ||
        form.imageCreditName !== (group.imageCreditName ?? '') ||
        form.imageCreditUrl !== (group.imageCreditUrl ?? '');
    const dirty =
        name !== group.name ||
        description !== (group.description ?? '') ||
        imageChanged ||
        form.access !== group.access;
    const canSave =
        dirty &&
        name.length >= GROUP.NAME_MIN_LENGTH &&
        name.length <= GROUP.NAME_MAX_LENGTH &&
        !update.isPending;

    const save = () => {
        if (!canSave) return;
        setSaved(false);
        update.mutate(
            {
                ...(name !== group.name ? { name } : {}),
                ...(description !== (group.description ?? '')
                    ? { description: description === '' ? null : description }
                    : {}),
                ...(imageChanged
                    ? {
                          imageUrl: imageUrl === '' ? null : imageUrl,
                          imageCreditName:
                              form.imageCreditName === '' ? null : form.imageCreditName,
                          imageCreditUrl: form.imageCreditUrl === '' ? null : form.imageCreditUrl,
                      }
                    : {}),
                ...(form.access !== group.access ? { access: form.access } : {}),
            },
            { onSuccess: () => setSaved(true) },
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('groupSettings.detailsTitle')}</CardTitle>
                <CardDescription>{t('groupSettings.detailsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Field label={t('createGroup.name')}>
                    <Input
                        maxLength={GROUP.NAME_MAX_LENGTH}
                        value={form.name}
                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                    />
                </Field>
                <Field label={t('createGroup.descriptionLabel')}>
                    <Textarea
                        rows={3}
                        maxLength={GROUP.DESCRIPTION_MAX_LENGTH}
                        value={form.description}
                        onChange={(event) => setForm({ ...form, description: event.target.value })}
                    />
                </Field>
                <ImageField
                    value={form.imageUrl}
                    credit={
                        form.imageCreditName === ''
                            ? null
                            : { name: form.imageCreditName, url: form.imageCreditUrl }
                    }
                    onChange={(url, credit) =>
                        setForm({
                            ...form,
                            imageUrl: url,
                            imageCreditName: credit?.name ?? '',
                            imageCreditUrl: credit?.url ?? '',
                        })
                    }
                    suggestedQuery={group.name}
                />
                <Field label={t('access.label')}>
                    <AccessPicker
                        value={form.access}
                        onChange={(access) => setForm({ ...form, access })}
                    />
                </Field>
                {update.isError && (
                    <FormMessage tone="error">{t(errorKey(update.error))}</FormMessage>
                )}
                {saved && !dirty && <FormMessage tone="success">{t('common.saved')}</FormMessage>}
            </CardContent>
            <CardFooter className="justify-end">
                <Button onClick={save} disabled={!canSave}>
                    {t('common.save')}
                </Button>
            </CardFooter>
        </Card>
    );
}
