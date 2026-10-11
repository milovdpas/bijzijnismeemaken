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

/** "Not that morning." One row per person, date and daypart; the row is the block. */
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

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    toDto(): UnavailabilityDto {
        return { date: this.date, daypart: this.daypart };
    }
}
