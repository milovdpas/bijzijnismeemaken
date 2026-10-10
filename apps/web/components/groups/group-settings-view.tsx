'use client';

import { GroupRole } from '@bzim/types';
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/empty-state';
import { FormMessage } from '@/components/common/form-message';
import { DangerZoneCard } from '@/components/groups/danger-zone-card';
import { GroupDetailsCard } from '@/components/groups/group-details-card';
import { InviteLinkCard } from '@/components/groups/invite-link-card';
import { useGroup } from '@/hooks/queries/use-groups';
import { errorKey } from '@/lib/api/errors';

/**
 * Details, the invite link when there is one, and for the owner the delete
 * button. The shell hides the tab from members; a typed URL lands on a
 * polite refusal instead of a form that would fail on save.
 */
export function GroupSettingsView({ groupId }: { groupId: string }) {
    const { t } = useTranslation();
    const group = useGroup(groupId);

    if (group.isError) {
        return <FormMessage tone="error">{t(errorKey(group.error))}</FormMessage>;
    }
    if (group.data === undefined) {
        return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;
    }
    if (group.data.role === GroupRole.MEMBER) {
        return <EmptyState icon={Lock} titleKey="groupSettings.forbidden" />;
    }

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <GroupDetailsCard key={group.data.id} group={group.data} />
            <div className="grid gap-4 content-start">
                {group.data.inviteLink !== null && (
                    <InviteLinkCard groupId={groupId} link={group.data.inviteLink} />
                )}
                {group.data.role === GroupRole.OWNER && <DangerZoneCard group={group.data} />}
            </div>
        </div>
    );
}
