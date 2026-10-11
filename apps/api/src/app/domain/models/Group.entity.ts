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
import { GroupAccess } from '@bzim/types';
import type { GroupResponse } from '@bzim/types';

import { env } from '../../../config/app';
import GroupMember from './GroupMember.entity';
import User from './User.entity';

/**
 * A circle of friends. Everything else (activities, availability views,
 * leaderboards) hangs off one of these.
 *
 * `ownerId` is denormalised beside the `owner` membership row so "who owns
 * this" is one column read and the RESTRICT foreign key can protect it.
 */
@Entity('groups')
export default class Group extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 60 })
    name!: string;

    /** Derived from the name for the invite link; regenerated on rename. */
    @Column({ type: 'varchar', length: 80 })
    slug!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ type: 'varchar', length: 16 })
    access!: GroupAccess;

    /** Set for public and invite-link groups; null for invite-only. */
    @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
    imageUrl!: string | null;

    @Column({ name: 'image_credit_name', type: 'varchar', length: 80, nullable: true })
    imageCreditName!: string | null;

    @Column({ name: 'image_credit_url', type: 'varchar', length: 500, nullable: true })
    imageCreditUrl!: string | null;

    @Column({ name: 'invite_token', type: 'varchar', length: 43, nullable: true, unique: true })
    inviteToken!: string | null;

    @Column({ name: 'owner_id', type: 'char', length: 36 })
    ownerId!: string;

    @ManyToOne(() => User, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'owner_id' })
    owner!: User;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
    updatedAt!: Date;

    /** The access modes that carry an invite link: open groups share one too, so nobody has to search. */
    static readonly LINK_ACCESS: readonly GroupAccess[] = [
        GroupAccess.PUBLIC,
        GroupAccess.INVITE_LINK,
    ];

    static usesInviteLink(access: GroupAccess): boolean {
        return Group.LINK_ACCESS.includes(access);
    }

    isPublic(): boolean {
        return this.access === GroupAccess.PUBLIC;
    }

    /** The group as any member sees it. The invite token is not here; admins get it separately. */
    toDto(): GroupResponse {
        return {
            id: this.id,
            name: this.name,
            slug: this.slug,
            description: this.description,
            imageUrl: this.imageUrl,
            imageCreditName: this.imageCreditName,
            imageCreditUrl: this.imageCreditUrl,
            access: this.access,
            createdAt: this.createdAt.toISOString(),
        };
    }

    memberCount(): Promise<number> {
        return GroupMember.countBy({ groupId: this.id });
    }

    /** `APP_URL/join/<slug>-<token>`, or null while link access is off. The web page reads the last 43 characters. */
    inviteLink(): string | null {
        return this.inviteToken === null
            ? null
            : `${env.appUrl}/join/${this.slug}-${this.inviteToken}`;
    }

    /** How many groups a person owns; a non-zero answer blocks their account deletion and leaving. */
    static countOwnedBy(user: User): Promise<number> {
        return Group.countBy({ ownerId: user.id });
    }

    /** Member counts for many groups in one query, for lists. Missing ids count zero. */
    static async memberCounts(groupIds: string[]): Promise<Map<string, number>> {
        if (groupIds.length === 0) {
            return new Map();
        }
        const rows = await GroupMember.createQueryBuilder('m')
            .select('m.group_id', 'groupId')
            .addSelect('COUNT(*)', 'count')
            .where('m.group_id IN (:...groupIds)', { groupIds })
            .groupBy('m.group_id')
            .getRawMany<{ groupId: string; count: string }>();
        return new Map(rows.map((row) => [row.groupId, Number(row.count)]));
    }
}
