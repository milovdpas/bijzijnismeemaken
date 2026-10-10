import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import type { AvatarKey, LeaderboardMemberDto } from '@bzim/types';

import Leaderboard from './Leaderboard.entity';
import User from './User.entity';

/**
 * A person on a board. Scores and history point at this row, not at the
 * user, so they survive the person leaving the group: `userId` becomes null
 * and the snapshots keep the name and avatar on the ranking. Removal sets
 * `removedAt` and keeps the row for its history.
 */
@Entity('leaderboard_members')
export default class LeaderboardMember extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'leaderboard_id', type: 'char', length: 36 })
    leaderboardId!: string;

    @ManyToOne(() => Leaderboard, (leaderboard) => leaderboard.members, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'leaderboard_id' })
    leaderboard!: Leaderboard;

    @Column({ name: 'user_id', type: 'char', length: 36, nullable: true })
    userId!: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'user_id' })
    user!: User | null;

    @Column({ name: 'display_name_snapshot', type: 'varchar', length: 40 })
    displayNameSnapshot!: string;

    @Column({ name: 'avatar_key_snapshot', type: 'varchar', length: 32 })
    avatarKeySnapshot!: AvatarKey;

    @Column({ name: 'added_by_id', type: 'char', length: 36, nullable: true })
    addedById!: string | null;

    @Column({ name: 'removed_at', type: 'datetime', precision: 3, nullable: true })
    removedAt!: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    isActive(): boolean {
        return this.removedAt === null;
    }

    /** The live name while the person is around, the snapshot afterwards. Needs `user` loaded. */
    toDto(): LeaderboardMemberDto {
        if (this.user === undefined) {
            throw new Error(`Leaderboard member ${this.id} was loaded without its user`);
        }
        const user = this.user?.toSummary() ?? null;
        return {
            id: this.id,
            user,
            displayName: user?.displayName ?? this.displayNameSnapshot,
            avatarKey: user?.avatarKey ?? this.avatarKeySnapshot,
            addedAt: this.createdAt.toISOString(),
            removedAt: this.removedAt?.toISOString() ?? null,
        };
    }
}
