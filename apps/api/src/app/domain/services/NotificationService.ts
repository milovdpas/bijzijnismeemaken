import { NotificationChannel, NotificationType } from '@bzim/types';
import type { Locale } from '@bzim/types';

import { env } from '../../../config/app';
import { deliver } from '../../infrastructure/modules/mail';
import type { MailMessage } from '../../infrastructure/modules/mail';
import {
    describeWhen,
    renderActivityCancelled,
    renderActivityCreated,
    renderActivityPlanned,
    renderActivityReminder,
    renderActivityRescheduled,
    renderGroupInvite,
} from '../../infrastructure/modules/mail/templates';
import type { OccurrenceMailValues } from '../../infrastructure/modules/mail/templates';
import type { PushMessage } from '../../infrastructure/modules/push';
import {
    pushActivityCreated,
    pushGroupInvite,
    pushOccurrence,
} from '../../infrastructure/modules/push/templates';
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
import { PushService } from './PushService';

/**
 * Who gets told about what, and through which channel.
 *
 * Stateless: there is no notifications table. Each event resolves its
 * recipients, drops the ones who switched that type off for the channel,
 * renders the email in the recipient's language and hands it to the mailer.
 * Push is the second channel inside `dispatch`: the same recipients, the
 * same settings check, a shorter text.
 */
export class NotificationService {
    /** The invitee hears about a new invitation. */
    static async groupInvited(invite: GroupInvite): Promise<void> {
        const values = {
            inviter: invite.invitedBy?.displayName ?? invite.group.name,
            group: invite.group.name,
            link: `${env.appUrl}/invites`,
        };
        await NotificationService.dispatch(
            NotificationType.GROUP_INVITE,
            [invite.invitedUser],
            (user) => renderGroupInvite(user.locale, user.email, values),
            (locale) => pushGroupInvite(locale, values),
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
        const values = {
            creator: creator.displayName ?? creator.handle ?? group.name,
            group: group.name,
            title: activity.title,
            link: OccurrenceService.activityLink(activity),
        };
        await NotificationService.dispatch(
            NotificationType.ACTIVITY_CREATED,
            others,
            (user) => renderActivityCreated(user.locale, user.email, values),
            (locale) => pushActivityCreated(locale, { ...values, activityId: activity.id }),
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
            (locale) =>
                pushOccurrence(
                    'planned',
                    locale,
                    NotificationService.occurrencePushValues(activity, occurrence, locale),
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
            (locale) =>
                pushOccurrence(
                    'rescheduled',
                    locale,
                    NotificationService.occurrencePushValues(activity, occurrence, locale),
                ),
        );
    }

    /** The evening before: everyone still in, once. */
    static async occurrenceReminder(
        group: Group,
        activity: Activity,
        occurrence: ActivityOccurrence,
        rows: OccurrenceParticipant[],
    ): Promise<void> {
        await NotificationService.dispatch(
            NotificationType.ACTIVITY_REMINDER,
            rows.map((row) => row.user),
            (user) =>
                renderActivityReminder(user.locale, user.email, {
                    group: group.name,
                    title: activity.title,
                    when: describeWhen(
                        user.locale,
                        occurrence.date,
                        occurrence.daypart,
                        occurrence.startTime,
                    ),
                    location: activity.locationText,
                    link: OccurrenceService.activityLink(activity),
                }),
            (locale) =>
                pushOccurrence(
                    'reminder',
                    locale,
                    NotificationService.occurrencePushValues(activity, occurrence, locale),
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
            (locale) =>
                pushOccurrence(
                    'cancelled',
                    locale,
                    NotificationService.occurrencePushValues(activity, occurrence, locale),
                ),
        );
    }

    /** What a push about a planned moment says: the title, the moment, where to tap to. */
    private static occurrencePushValues(
        activity: Activity,
        occurrence: ActivityOccurrence,
        locale: Locale,
    ): { title: string; when: string; link: string; occurrenceId: string } {
        return {
            title: activity.title,
            when: describeWhen(locale, occurrence.date, occurrence.daypart, occurrence.startTime),
            link: OccurrenceService.activityLink(activity),
            occurrenceId: occurrence.id,
        };
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
     * One pass over the recipients: settings check, render, deliver, on both
     * channels. The sends run together; a failure for one person never
     * blocks another. A push is rendered per language, not per person: it
     * carries nothing personal.
     */
    private static async dispatch(
        type: NotificationType,
        recipients: User[],
        render: (user: User) => MailMessage,
        renderPush: (locale: Locale) => PushMessage,
    ): Promise<void> {
        const channels = await NotificationSettingService.split(recipients, type);
        await Promise.all([
            ...channels[NotificationChannel.EMAIL].map((user) => deliver(render(user))),
            PushService.send(channels[NotificationChannel.PUSH], (user) => renderPush(user.locale)),
        ]);
    }
}
