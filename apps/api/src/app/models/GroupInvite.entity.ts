import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import type { GroupInviteDto } from '@bzim/types';

import Group from './Group.entity';
import User from './User.entity';

/**
 * A pending invitation to an invite-only group. The row exists while the
 * answer is open and is deleted by whichever of accept, decline or cancel
 * comes first.
 */
@Entity('group_invites')
export default class GroupInvite extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'group_id', type: 'char', length: 36 })
    groupId!: string;

    @ManyToOne(() => Group, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'group_id' })
    group!: Group;

    @Column({ name: 'invited_user_id', type: 'char', length: 36 })
    invitedUserId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'invited_user_id' })
    invitedUser!: User;

    /** Null once the inviter has left or deleted their account. */
    @Column({ name: 'invited_by_id', type: 'char', length: 36, nullable: true })
    invitedById!: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'invited_by_id' })
    invitedBy!: User | null;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    /**
     * Needs the `group`, `invitedUser` and `invitedBy` relations loaded; a row
     * fetched without them is a programming error, not a missing inviter.
     * Only onboarded people can be invited, so the invitee always has a summary.
     */
    toDto(): GroupInviteDto {
        if (
            this.group === undefined ||
            this.invitedUser === undefined ||
            this.invitedBy === undefined
        ) {
            throw new Error(`Invite ${this.id} was loaded without its relations`);
        }
        const invitedUser = this.invitedUser.toSummary();
        if (invitedUser === null) {
            throw new Error(`Invitee ${this.invitedUserId} has no finished profile`);
        }
        return {
            id: this.id,
            group: { id: this.group.id, name: this.group.name },
            invitedUser,
            invitedBy: this.invitedBy?.toSummary() ?? null,
            createdAt: this.createdAt.toISOString(),
        };
    }
}
