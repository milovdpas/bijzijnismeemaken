import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';

import Activity from './Activity.entity';
import User from './User.entity';

/**
 * "I'm in". One row per person per activity; the row's existence is the
 * mark. `addedById` differs from `userId` when an admin marked someone.
 */
@Entity('activity_interests')
export default class ActivityInterest extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'activity_id', type: 'char', length: 36 })
    activityId!: string;

    @ManyToOne(() => Activity, (activity) => activity.interests, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'activity_id' })
    activity!: Activity;

    @Column({ name: 'user_id', type: 'char', length: 36 })
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ name: 'added_by_id', type: 'char', length: 36, nullable: true })
    addedById!: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;
}
