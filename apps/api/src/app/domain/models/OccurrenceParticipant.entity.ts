import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import type { Daypart } from '@bzim/types';

import { timeTransformer } from '../../infrastructure/utils/ColumnTransformers';
import ActivityOccurrence from './ActivityOccurrence.entity';
import CalendarConnection from './CalendarConnection.entity';
import User from './User.entity';

/**
 * One person counted in for one occurrence, and what they were last told.
 *
 * The `notifiedFor*` columns are the date, daypart and time the last email
 * described. On an edit the service compares them with the occurrence and
 * mails only the people for whom something changed.
 */
@Entity('occurrence_participants')
export default class OccurrenceParticipant extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'occurrence_id', type: 'char', length: 36 })
    occurrenceId!: string;

    @ManyToOne(() => ActivityOccurrence, (occurrence) => occurrence.participants, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'occurrence_id' })
    occurrence!: ActivityOccurrence;

    @Column({ name: 'user_id', type: 'char', length: 36 })
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ name: 'notified_at', type: 'datetime', precision: 3, nullable: true })
    notifiedAt!: Date | null;

    @Column({ name: 'notified_for_date', type: 'date', nullable: true })
    notifiedForDate!: string | null;

    @Column({ name: 'notified_for_daypart', type: 'varchar', length: 9, nullable: true })
    notifiedForDaypart!: Daypart | null;

    @Column({
        name: 'notified_for_start_time',
        type: 'time',
        nullable: true,
        transformer: timeTransformer,
    })
    notifiedForStartTime!: string | null;

    /** When the day-before reminder went out; cleared whenever the moment changes. */
    @Column({ name: 'reminded_at', type: 'datetime', precision: 3, nullable: true })
    remindedAt!: Date | null;

    /** The provider's event id once auto-added to this person's calendar (M2). */
    @Column({ name: 'calendar_event_id', type: 'varchar', length: 255, nullable: true })
    calendarEventId!: string | null;

    /** Which connection that event was written through; null again when the connection goes. */
    @Column({ name: 'calendar_connection_id', type: 'char', length: 36, nullable: true })
    calendarConnectionId!: string | null;

    @ManyToOne(() => CalendarConnection, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'calendar_connection_id' })
    calendarConnection!: CalendarConnection | null;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;
}
