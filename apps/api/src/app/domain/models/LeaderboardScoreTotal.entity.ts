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

import { decimalTransformer } from '../../infrastructure/utils/ColumnTransformers';
import Leaderboard from './Leaderboard.entity';
import LeaderboardMember from './LeaderboardMember.entity';
import User from './User.entity';

/**
 * One member's score for one period of one board. Written through from a
 * single entry (docs/03), so a ranking is one indexed read on this table.
 * Numbers carry three decimals; times are whole milliseconds.
 */
@Entity('leaderboard_scores_total')
export default class LeaderboardScoreTotal extends BaseEntity {
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

    @Column({
        type: 'decimal',
        precision: 16,
        scale: 3,
        transformer: decimalTransformer,
    })
    score!: number;

    @Column({ name: 'updated_by_id', type: 'char', length: 36, nullable: true })
    updatedById!: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'updated_by_id' })
    updatedBy!: User | null;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
    updatedAt!: Date;
}
