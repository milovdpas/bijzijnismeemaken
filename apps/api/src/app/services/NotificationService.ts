import { NotificationChannel, NotificationType } from '@bzim/types';

import { env } from '../../config/app';
import { deliver } from '../modules/mail';
import type { MailMessage } from '../modules/mail';
import { renderActivityCreated, renderGroupInvite } from '../modules/mail/templates';
import type Activity from '../models/Activity.entity';
import type Group from '../models/Group.entity';
import type GroupInvite from '../models/GroupInvite.entity';
import GroupMember from '../models/GroupMember.entity';
import type User from '../models/User.entity';
import { NotificationSettingService } from './NotificationSettingService';

/**
 * Who gets told about what, and through which channel.
 *
 * Stateless: there is no notifications table. Each event resolves its
 * recipients, drops the ones who switched that type off for the channel,
 * renders the email in the recipient's language and hands it to the mailer.
 * Push (phase 3) becomes a second channel inside `dispatch`, not a second
 * service.
 */
export class NotificationService {
    /** The invitee hears about a new invitation. */
    static async groupInvited(invite: GroupInvite): Promise<void> {
        const inviter = invite.invitedBy?.displayName ?? invite.group.name;
        await NotificationService.dispatch(
            NotificationType.GROUP_INVITE,
            [invite.invitedUser],
            (user) =>
                renderGroupInvite(user.locale, user.email, {
                    inviter,
                    group: invite.group.name,
                    link: `${env.appUrl}/invites`,
                }),
        );
    }

    /** Every other member hears about a new idea; the person who had it does not. */
    static async activityCreated(activity: Activity, group: Group, creator: User): Promise<void> {
        const members = await GroupMember.find({
            where: { groupId: group.id },
            relations: { user: true },
        });
        const others = members
            .map((member) => member.user)
            .filter((user) => user.id !== creator.id);
        await NotificationService.dispatch(NotificationType.ACTIVITY_CREATED, others, (user) =>
            renderActivityCreated(user.locale, user.email, {
                creator: creator.displayName ?? creator.handle ?? group.name,
                group: group.name,
                title: activity.title,
                link: `${env.appUrl}/groups/${group.id}/activities/${activity.id}`,
            }),
        );
    }

    /**
     * One pass over the recipients: settings check, render, deliver. The
     * sends run together; a failure for one person never blocks another.
     */
    private static async dispatch(
        type: NotificationType,
        recipients: User[],
        render: (user: User) => MailMessage,
    ): Promise<void> {
        const byEmail = await NotificationSettingService.subscribers(
            recipients,
            type,
            NotificationChannel.EMAIL,
        );
        await Promise.all(byEmail.map((user) => deliver(render(user))));
    }
}
