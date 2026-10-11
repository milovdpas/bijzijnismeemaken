import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import Leaderboard from './Leaderboard.entity';
import User from './User.entity';

/** Somebody allowed to enter scores on a board whose edit mode is `selected`. */
@Entity('leaderboard_editors')
export default class LeaderboardEditor extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'leaderboard_id', type: 'char', length: 36 })
    leaderboardId!: string;

    @ManyToOne(() => Leaderboard, (leaderboard) => leaderboard.editors, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'leaderboard_id' })
    leaderboard!: Leaderboard;

    @Column({ name: 'user_id', type: 'char', length: 36 })
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;
}
