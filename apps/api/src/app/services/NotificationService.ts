import { NotificationChannel, NotificationType } from '@bzim/types';

import { env } from '../../config/app';
import { deliver } from '../modules/mail';
import type { MailMessage } from '../modules/mail';
import {
    describeWhen,
    renderActivityCancelled,
    renderActivityCreated,
    renderActivityPlanned,
    renderActivityRescheduled,
    renderGroupInvite,
} from '../modules/mail/templates';
import type { OccurrenceMailValues } from '../modules/mail/templates';
import type Activity from '../models/Activity.entity';
import type ActivityOccurrence from '../models/ActivityOccurrence.entity';
import type Group from '../models/Group.entity';
import type GroupInvite from '../models/GroupInvite.entity';
import GroupMember from '../models/GroupMember.entity';
import type OccurrenceParticipant from '../models/OccurrenceParticipant.entity';
import type User from '../models/User.entity';
import { googleCalendarUrl } from '../utils/CalendarLinks';
import { NotificationSettingService } from './NotificationSettingService';
import { OccurrenceService } from './OccurrenceService';

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
                link: OccurrenceService.activityLink(activity),
            }),
        );
    }

    /** The people just picked for a planned moment. Both calendar links ride along. */
    static async occurrencePlanned(
        group: Group,
        activity: Activity,
        occurrence: ActivityOccurrence,
        planner: User,
        rows: OccurrenceParticipant[],
    ): Promise<void> {
        await NotificationService.dispatch(
            NotificationType.ACTIVITY_PLANNED,
            rows.map((row) => row.user),
            (user) =>
                renderActivityPlanned(
                    user.locale,
                    user.email,
                    NotificationService.occurrenceValues(
                        group,
                        activity,
                        occurrence,
                        planner,
                        user,
                    ),
                ),
        );
    }

    /** The people who had been told one date and now get another. */
    static async occurrenceRescheduled(
        group: Group,
        activity: Activity,
        occurrence: ActivityOccurrence,
        editor: User,
        rows: OccurrenceParticipant[],
    ): Promise<void> {
        await NotificationService.dispatch(
            NotificationType.ACTIVITY_RESCHEDULED,
            rows.map((row) => row.user),
            (user) =>
                renderActivityRescheduled(
                    user.locale,
                    user.email,
                    NotificationService.occurrenceValues(group, activity, occurrence, editor, user),
                ),
        );
    }

    /** The people who had been told it was on. */
    static async occurrenceCancelled(
        group: Group,
        activity: Activity,
        occurrence: ActivityOccurrence,
        rows: OccurrenceParticipant[],
    ): Promise<void> {
        await NotificationService.dispatch(
            NotificationType.ACTIVITY_CANCELLED,
            rows.map((row) => row.user),
            (user) =>
                renderActivityCancelled(user.locale, user.email, {
                    group: group.name,
                    title: activity.title,
                    when: describeWhen(
                        user.locale,
                        occurrence.date,
                        occurrence.daypart,
                        occurrence.startTime,
                    ),
                    link: OccurrenceService.activityLink(activity),
                }),
        );
    }

    /** The facts the planned and rescheduled emails share, in the recipient's language. */
    private static occurrenceValues(
        group: Group,
        activity: Activity,
        occurrence: ActivityOccurrence,
        actor: User,
        recipient: User,
    ): OccurrenceMailValues {
        return {
            planner: actor.displayName ?? actor.handle ?? group.name,
            group: group.name,
            title: activity.title,
            when: describeWhen(
                recipient.locale,
                occurrence.date,
                occurrence.daypart,
                occurrence.startTime,
            ),
            location: activity.locationText,
            icsLink: OccurrenceService.icsLink(occurrence),
            googleLink: googleCalendarUrl(OccurrenceService.calendarEvent(activity, occurrence)),
        };
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
