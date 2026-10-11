import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';

import { decimalTransformer } from '../../infrastructure/utils/ColumnTransformers';
import Leaderboard from './Leaderboard.entity';
import LeaderboardMember from './LeaderboardMember.entity';
import User from './User.entity';

/**
 * Who changed whose score, from what to what, when. `oldScore` is the
 * all-time value before the change (null if none); `newScore` null means
 * cleared or removed. `year` and `month` name the period written.
 */
@Entity('leaderboard_score_history')
export default class LeaderboardScoreHistory extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'leaderboard_id', type: 'char', length: 36 })
    leaderboardId!: string;

    @ManyToOne(() => Leaderboard, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'leaderboard_id' })
    leaderboard!: Leaderboard;

    @Column({ name: 'member_id', type: 'char', length: 36 })
    memberId!: string;

    @ManyToOne(() => LeaderboardMember, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'member_id' })
    member!: LeaderboardMember;

    @Column({ name: 'changed_by_id', type: 'char', length: 36, nullable: true })
    changedById!: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'changed_by_id' })
    changedBy!: User | null;

    @Column({ name: 'changed_by_name_snapshot', type: 'varchar', length: 40 })
    changedByNameSnapshot!: string;

    @Column({
        name: 'old_score',
        type: 'decimal',
        precision: 16,
        scale: 3,
        nullable: true,
        transformer: decimalTransformer,
    })
    oldScore!: number | null;

    @Column({
        name: 'new_score',
        type: 'decimal',
        precision: 16,
        scale: 3,
        nullable: true,
        transformer: decimalTransformer,
    })
    newScore!: number | null;

    @Column({ type: 'smallint' })
    year!: number;

    @Column({ type: 'tinyint' })
    month!: number;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;
}
