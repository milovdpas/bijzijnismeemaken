'use client';

import { GroupRole } from '@bzim/types';
import type { GroupMemberResponse } from '@bzim/types';
import { Crown, ShieldCheck, ShieldOff, UserMinus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common/avatar';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useChangeRole, useRemoveMember, useTransferOwnership } from '@/hooks/queries/use-members';
import { errorKey } from '@/lib/api/errors';

/** What the actor may do to this member; the API enforces the same rules. */
export function memberActions(actor: GroupRole, target: GroupRole) {
    const owner = actor === GroupRole.OWNER;
    return {
        changeRole: owner && target !== GroupRole.OWNER,
        transfer: owner && target !== GroupRole.OWNER,
        remove: owner
            ? target !== GroupRole.OWNER
            : actor === GroupRole.ADMIN && target === GroupRole.MEMBER,
    };
}

/**
 * The actions on one member, as a bottom sheet so a phone can reach them
 * with a thumb. Role changes apply at once; transfer and remove ask first.
 */
export function MemberActionsSheet({
    groupId,
    actorRole,
    member,
    open,
    onOpenChange,
}: {
    groupId: string;
    actorRole: GroupRole;
    member: GroupMemberResponse;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { t } = useTranslation();
    const changeRole = useChangeRole(groupId);
    const remove = useRemoveMember(groupId);
    const transfer = useTransferOwnership(groupId);
    const [confirm, setConfirm] = useState<'remove' | 'transfer' | null>(null);

    const can = memberActions(actorRole, member.role);
    const name = member.user.displayName;
    const closeAll = () => {
        setConfirm(null);
        onOpenChange(false);
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent side="bottom" className="rounded-t-2xl">
                    <SheetHeader className="flex-row items-center gap-3">
                        <Avatar avatarKey={member.user.avatarKey} size="md" />
                        <div className="min-w-0">
                            <SheetTitle className="truncate">{name}</SheetTitle>
                            <SheetDescription>@{member.user.handle}</SheetDescription>
                        </div>
                    </SheetHeader>
                    <div className="grid gap-2 px-4 pb-6">
                        {can.changeRole && (
                            <Button
                                variant="outline"
                                className="justify-start"
                                disabled={changeRole.isPending}
                                onClick={() =>
                                    changeRole.mutate(
                                        {
                                            userId: member.user.id,
                                            role:
                                                member.role === GroupRole.ADMIN
                                                    ? GroupRole.MEMBER
                                                    : GroupRole.ADMIN,
                                        },
                                        { onSuccess: closeAll },
                                    )
                                }
                            >
                                {member.role === GroupRole.ADMIN ? <ShieldOff /> : <ShieldCheck />}
                                {member.role === GroupRole.ADMIN
                                    ? t('members.makeMember')
                                    : t('members.makeAdmin')}
                            </Button>
                        )}
                        {can.transfer && (
                            <Button
                                variant="outline"
                                className="justify-start"
                                onClick={() => setConfirm('transfer')}
                            >
                                <Crown />
                                {t('members.transfer')}
                            </Button>
                        )}
                        {can.remove && (
                            <Button
                                variant="destructive"
                                className="justify-start"
                                onClick={() => setConfirm('remove')}
                            >
                                <UserMinus />
                                {t('members.remove')}
                            </Button>
                        )}
                        {changeRole.isError && (
                            <FormMessage tone="error">{t(errorKey(changeRole.error))}</FormMessage>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <ConfirmDialog
                open={confirm === 'transfer'}
                onOpenChange={(next) => setConfirm(next ? 'transfer' : null)}
                title={t('members.transfer')}
                description={t('members.transferDescription', { name })}
                confirmLabel={t('members.transfer')}
                pending={transfer.isPending}
                error={transfer.isError ? t(errorKey(transfer.error)) : null}
                onConfirm={() => transfer.mutate(member.user.id, { onSuccess: closeAll })}
            />
            <ConfirmDialog
                open={confirm === 'remove'}
                onOpenChange={(next) => setConfirm(next ? 'remove' : null)}
                title={t('members.remove')}
                description={t('members.removeDescription', { name })}
                confirmLabel={t('members.remove')}
                destructive
                pending={remove.isPending}
                error={remove.isError ? t(errorKey(remove.error)) : null}
                onConfirm={() => remove.mutate(member.user.id, { onSuccess: closeAll })}
            />
        </>
    );
}
