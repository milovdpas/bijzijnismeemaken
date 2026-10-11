import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import type { Daypart, OccurrenceDto, OccurrenceStatus } from '@bzim/types';

import { timeTransformer } from '../../infrastructure/utils/ColumnTransformers';
import Activity from './Activity.entity';
import OccurrenceParticipant from './OccurrenceParticipant.entity';
import User from './User.entity';

/**
 * One planned moment of an activity: a date, optionally a daypart and a start
 * time, and the people who count for it. A one-off activity has at most one
 * open occurrence; a recurring one collects them.
 */
@Entity('activity_occurrences')
export default class ActivityOccurrence extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'activity_id', type: 'char', length: 36 })
    activityId!: string;

    @ManyToOne(() => Activity, (activity) => activity.occurrences, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'activity_id' })
    activity!: Activity;

    @Column({ type: 'date' })
    date!: string;

    @Column({ type: 'varchar', length: 9, nullable: true })
    daypart!: Daypart | null;

    @Column({ name: 'start_time', type: 'time', nullable: true, transformer: timeTransformer })
    startTime!: string | null;

    @Column({ type: 'varchar', length: 9 })
    status!: OccurrenceStatus;

    @Column({ name: 'planned_by_id', type: 'char', length: 36, nullable: true })
    plannedById!: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'planned_by_id' })
    plannedBy!: User | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    notes!: string | null;

    @OneToMany(() => OccurrenceParticipant, (participant) => participant.occurrence)
    participants!: OccurrenceParticipant[];

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
    updatedAt!: Date;

    /** Needs `plannedBy` and `participants.user` loaded. */
    toDto(): OccurrenceDto {
        if (this.plannedBy === undefined || this.participants === undefined) {
            throw new Error(`Occurrence ${this.id} was loaded without its relations`);
        }
        return {
            id: this.id,
            activityId: this.activityId,
            date: this.date,
            daypart: this.daypart,
            startTime: this.startTime,
            status: this.status,
            notes: this.notes,
            plannedBy: this.plannedBy?.toSummary() ?? null,
            participants: this.participants.flatMap((participant) => {
                const summary = participant.user.toSummary();
                return summary === null ? [] : [summary];
            }),
            createdAt: this.createdAt.toISOString(),
        };
    }
}
