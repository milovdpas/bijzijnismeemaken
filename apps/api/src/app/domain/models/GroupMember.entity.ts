import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { GroupRole } from '@bzim/types';
import type { GroupMemberResponse } from '@bzim/types';

import Group from './Group.entity';
import User from './User.entity';

/** Owner > admin > member, for "at least this role" checks. */
const RANK: Record<GroupRole, number> = {
    [GroupRole.MEMBER]: 0,
    [GroupRole.ADMIN]: 1,
    [GroupRole.OWNER]: 2,
};

export function roleRank(role: GroupRole): number {
    return RANK[role];
}

/** One person in one group, with their role. Exactly one row per pair. */
@Entity('group_members')
export default class GroupMember extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'group_id', type: 'char', length: 36 })
    groupId!: string;

    @ManyToOne(() => Group, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'group_id' })
    group!: Group;

    @Column({ name: 'user_id', type: 'char', length: 36 })
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'varchar', length: 8 })
    role!: GroupRole;

    @CreateDateColumn({ name: 'joined_at', type: 'datetime', precision: 3 })
    joinedAt!: Date;

    /** Whether this membership carries at least the given role. */
    hasRole(minimum: GroupRole): boolean {
        return roleRank(this.role) >= roleRank(minimum);
    }

    /**
     * The member as the group sees them. Needs the `user` relation loaded; a
     * member without a finished profile cannot exist (joining requires one),
     * so a missing summary is a bug, not a case.
     */
    toDto(): GroupMemberResponse {
        const user = this.user.toSummary();
        if (user === null) {
            throw new Error(`Member ${this.userId} has no finished profile`);
        }
        return { user, role: this.role, joinedAt: this.joinedAt.toISOString() };
    }
}
