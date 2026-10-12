import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { CalendarEventDto, CalendarEventType } from '@bzim/types';

import CalendarFeed from './CalendarFeed.entity';
import CalendarSource from './CalendarSource.entity';
import User from './User.entity';

/**
 * One synced event (docs/03 `calendar_events`): a window in time, plus what
 * the availability algorithm needs to decide whether it blocks. It comes
 * from a Google calendar (`sourceId`) or a calendar link (`feedId`), never
 * both, and is replaced wholesale on every sync of that. The title is only
 * ever shown to its owner, for the ignore rules.
 */
@Entity('calendar_events')
export default class CalendarEvent extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id', type: 'char', length: 36 })
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ name: 'source_id', type: 'char', length: 36, nullable: true })
    sourceId!: string | null;

    @ManyToOne(() => CalendarSource, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'source_id' })
    source!: CalendarSource | null;

    @Column({ name: 'feed_id', type: 'char', length: 36, nullable: true })
    feedId!: string | null;

    @ManyToOne(() => CalendarFeed, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'feed_id' })
    feed!: CalendarFeed | null;

    @Column({ name: 'provider_event_id', type: 'varchar', length: 255 })
    providerEventId!: string;

    /** The series this instance belongs to, for "ignore this series". */
    @Column({ name: 'recurring_event_id', type: 'varchar', length: 255, nullable: true })
    recurringEventId!: string | null;

    @Column({ type: 'varchar', length: 255 })
    title!: string;

    @Column({ name: 'start_at', type: 'datetime', precision: 3 })
    startAt!: Date;

    @Column({ name: 'end_at', type: 'datetime', precision: 3 })
    endAt!: Date;

    @Column({ name: 'all_day', type: 'boolean', default: false })
    allDay!: boolean;

    @Column({ name: 'start_date', type: 'date', nullable: true })
    startDate!: string | null;

    /** Exclusive, as the provider gives it. */
    @Column({ name: 'end_date', type: 'date', nullable: true })
    endDate!: string | null;

    /** Marked "Free" at the provider: never blocks. */
    @Column({ type: 'boolean', default: false })
    transparent!: boolean;

    @Column({ name: 'event_type', type: 'varchar', length: 24 })
    eventType!: CalendarEventType;

    @Column({ name: 'synced_at', type: 'datetime', precision: 3 })
    syncedAt!: Date;

    toDto(): CalendarEventDto {
        return {
            id: this.id,
            sourceId: this.sourceId,
            feedId: this.feedId,
            recurringEventId: this.recurringEventId,
            title: this.title,
            startAt: this.startAt.toISOString(),
            endAt: this.endAt.toISOString(),
            allDay: this.allDay,
            transparent: this.transparent,
            eventType: this.eventType,
        };
    }
}
