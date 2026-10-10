'use client';

import { GROUP, GroupAccess } from '@bzim/types';
import type { GroupDetailResponse } from '@bzim/types';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Field } from '@/components/common/field';
import { FormMessage } from '@/components/common/form-message';
import { ImageField } from '@/components/common/image-field';
import { AccessPicker } from '@/components/groups/access-picker';
import { InviteByHandle } from '@/components/groups/invite-by-handle';
import { InviteLinkBox } from '@/components/groups/invite-link-box';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateGroup } from '@/hooks/queries/use-groups';
import { errorKey } from '@/lib/api/errors';
import { groupHref } from '@/lib/group-navigation';

interface FormState {
    name: string;
    description: string;
    imageUrl: string;
    imageCreditName: string;
    imageCreditUrl: string;
    access: GroupAccess;
}

const blank: FormState = {
    name: '',
    description: '',
    imageUrl: '',
    imageCreditName: '',
    imageCreditUrl: '',
    access: GroupAccess.INVITE_LINK,
};

/**
 * Two steps in one dialog. First the form; then, once the group exists, the
 * one thing a fresh group needs: people. What that step shows depends on
 * access (the link to copy, the handle search, or just a note that it is
 * public). Closing it, by any route, opens the group.
 */
export function CreateGroupDialog({ className }: { className?: string }) {
    const { t } = useTranslation();
    const router = useRouter();
    const create = useCreateGroup();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<FormState>(blank);
    const [created, setCreated] = useState<GroupDetailResponse | null>(null);

    const name = form.name.trim();
    const canSave =
        name.length >= GROUP.NAME_MIN_LENGTH &&
        name.length <= GROUP.NAME_MAX_LENGTH &&
        !create.isPending;

    const submit = () => {
        if (!canSave) return;
        const description = form.description.trim();
        create.mutate(
            {
                name,
                description: description === '' ? null : description,
                imageUrl: form.imageUrl.trim() === '' ? null : form.imageUrl.trim(),
                imageCreditName: form.imageCreditName === '' ? null : form.imageCreditName,
                imageCreditUrl: form.imageCreditUrl === '' ? null : form.imageCreditUrl,
                access: form.access,
            },
            { onSuccess: setCreated },
        );
    };

    const close = () => {
        setOpen(false);
        create.reset();
        if (created !== null) {
            router.push(groupHref(created.id));
            setCreated(null);
            setForm(blank);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (next) setOpen(true);
                else close();
            }}
        >
            <DialogTrigger render={<Button className={className} />}>
                <Plus className="size-4" />
                {t('groups.create')}
            </DialogTrigger>
            <DialogContent>
                {created === null ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>{t('createGroup.title')}</DialogTitle>
                            <DialogDescription>{t('createGroup.description')}</DialogDescription>
                        </DialogHeader>
                        <form
                            className="grid gap-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                submit();
                            }}
                        >
                            <Field
                                label={t('createGroup.name')}
                                help={t('createGroup.nameLength', {
                                    min: GROUP.NAME_MIN_LENGTH,
                                    max: GROUP.NAME_MAX_LENGTH,
                                })}
                            >
                                <Input
                                    autoFocus
                                    maxLength={GROUP.NAME_MAX_LENGTH}
                                    value={form.name}
                                    onChange={(event) =>
                                        setForm({ ...form, name: event.target.value })
                                    }
                                />
                            </Field>
                            <Field
                                label={t('createGroup.descriptionLabel')}
                                help={t('createGroup.descriptionHelp')}
                            >
                                <Textarea
                                    rows={3}
                                    maxLength={GROUP.DESCRIPTION_MAX_LENGTH}
                                    value={form.description}
                                    onChange={(event) =>
                                        setForm({ ...form, description: event.target.value })
                                    }
                                />
                            </Field>
                            <ImageField
                                value={form.imageUrl}
                                credit={
                                    form.imageCreditName === ''
                                        ? null
                                        : { name: form.imageCreditName, url: form.imageCreditUrl }
                                }
                                onChange={(imageUrl, credit) =>
                                    setForm({
                                        ...form,
                                        imageUrl,
                                        imageCreditName: credit?.name ?? '',
                                        imageCreditUrl: credit?.url ?? '',
                                    })
                                }
                                suggestedQuery={form.name.trim()}
                            />
                            <Field label={t('access.label')}>
                                <AccessPicker
                                    value={form.access}
                                    onChange={(access) => setForm({ ...form, access })}
                                />
                            </Field>
                            {create.isError && (
                                <FormMessage tone="error">{t(errorKey(create.error))}</FormMessage>
                            )}
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={close}>
                                    {t('common.cancel')}
                                </Button>
                                <Button type="submit" disabled={!canSave}>
                                    {t('createGroup.submit')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>
                                {t('createGroup.createdTitle', { name: created.name })}
                            </DialogTitle>
                            <DialogDescription>
                                {t(`createGroup.created_${created.access}`)}
                            </DialogDescription>
                        </DialogHeader>
                        {created.access === GroupAccess.INVITE_LINK &&
                            created.inviteLink !== null && (
                                <InviteLinkBox link={created.inviteLink} />
                            )}
                        {created.access === GroupAccess.INVITE_ONLY && (
                            <InviteByHandle groupId={created.id} />
                        )}
                        <DialogFooter>
                            <Button type="button" onClick={close}>
                                {t('createGroup.openGroup')}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
