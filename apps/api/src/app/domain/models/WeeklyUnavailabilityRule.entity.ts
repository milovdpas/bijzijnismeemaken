import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import type { Daypart, UnavailabilityRuleDto, Weekday } from '@bzim/types';

import User from './User.entity';

/**
 * "Never on Tuesday evenings", optionally only between two dates (a course,
 * a season). Applies to every matching date inside the validity range.
 */
@Entity('weekly_unavailability_rules')
export default class WeeklyUnavailabilityRule extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id', type: 'char', length: 36 })
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'tinyint' })
    weekday!: Weekday;

    @Column({ type: 'varchar', length: 9 })
    daypart!: Daypart;

    @Column({ name: 'valid_from', type: 'date', nullable: true })
    validFrom!: string | null;

    @Column({ name: 'valid_until', type: 'date', nullable: true })
    validUntil!: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
    updatedAt!: Date;

    /** Whether the rule covers this calendar date: right weekday, inside the range. */
    appliesOn(date: string, weekday: Weekday): boolean {
        return (
            this.weekday === weekday &&
            (this.validFrom === null || this.validFrom <= date) &&
            (this.validUntil === null || this.validUntil >= date)
        );
    }

    toDto(): UnavailabilityRuleDto {
        return {
            id: this.id,
            weekday: this.weekday,
            daypart: this.daypart,
            validFrom: this.validFrom,
            validUntil: this.validUntil,
        };
    }
}
