import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import type { Daypart, UnavailabilityDto } from '@bzim/types';

import User from './User.entity';

/**
 * "Not that morning", or with `free`, "that morning after all": a weekly
 * rule's busy daypart freed for one date. One row per person, date and
 * daypart, so a daypart is blocked or freed by hand, never both.
 */
@Entity('manual_unavailability')
export default class ManualUnavailability extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id', type: 'char', length: 36 })
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'date' })
    date!: string;

    @Column({ type: 'varchar', length: 9 })
    daypart!: Daypart;

    @Column({ type: 'boolean', default: false })
    free!: boolean;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    toDto(): UnavailabilityDto {
        return { date: this.date, daypart: this.daypart, free: this.free };
    }
}
