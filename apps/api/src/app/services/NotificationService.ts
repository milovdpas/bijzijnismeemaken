import { NotificationType } from '@bzim/types';

import { env } from '../../config/app';
import { deliver } from '../modules/mail';
import type { MailMessage } from '../modules/mail';
import { renderGroupInvite } from '../modules/mail/templates';
import type GroupInvite from '../models/GroupInvite.entity';
import type User from '../models/User.entity';

/**
 * Who gets told about what, and through which channel.
 *
 * Stateless: there is no notifications table. Each event resolves its
 * recipients, drops the ones who switched that type off, renders the email in
 * the recipient's language and hands it to the mailer. Push (phase 3) becomes a
 * second channel inside `dispatch`, not a second service.
 */
export class NotificationService {
    /** The invitee hears about a new invitation, if they want email for invites. */
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

    /**
     * One pass over the recipients: preference check, render, deliver. The
     * sends run together; a failure for one person never blocks another.
     */
    private static async dispatch(
        type: NotificationType,
        recipients: User[],
        render: (user: User) => MailMessage,
    ): Promise<void> {
        const wanted = recipients.filter((user) => NotificationService.wantsEmail(user, type));
        await Promise.all(wanted.map((user) => deliver(render(user))));
    }

    private static wantsEmail(user: User, type: NotificationType): boolean {
        switch (type) {
            case NotificationType.GROUP_INVITE:
                return user.notifyEmailInvites;
            case NotificationType.ACTIVITY_CREATED:
                return user.notifyEmailNewActivity;
            case NotificationType.ACTIVITY_PLANNED:
            case NotificationType.ACTIVITY_RESCHEDULED:
            case NotificationType.ACTIVITY_CANCELLED:
                return user.notifyEmailPlanned;
        }
    }
}
