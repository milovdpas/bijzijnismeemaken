import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import type { AvatarKey, TournamentMemberDto } from '@bzim/types';

import TournamentEntry from './TournamentEntry.entity';
import User from './User.entity';

/**
 * A person in an entry. The name and avatar are snapshots from the start,
 * because a guest has nothing else; `userId` only says who may enter the
 * results of the entry's matches, and goes when the account does.
 */
@Entity('tournament_entry_members')
export default class TournamentEntryMember extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'entry_id', type: 'char', length: 36 })
    entryId!: string;

    @ManyToOne(() => TournamentEntry, (entry) => entry.members, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'entry_id' })
    entry!: TournamentEntry;

    @Column({ name: 'user_id', type: 'char', length: 36, nullable: true })
    userId!: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'user_id' })
    user!: User | null;

    @Column({ name: 'display_name_snapshot', type: 'varchar', length: 40 })
    displayNameSnapshot!: string;

    /** Null for a guest. */
    @Column({ name: 'avatar_key_snapshot', type: 'varchar', length: 32, nullable: true })
    avatarKeySnapshot!: AvatarKey | null;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    /** The live name and avatar while the person is around, the snapshots for a guest or a leaver. Needs `user` loaded. */
    toDto(): TournamentMemberDto {
        if (this.user === undefined) {
            throw new Error(`Tournament member ${this.id} was loaded without its user`);
        }
        const user = this.user?.toSummary() ?? null;
        return {
            id: this.id,
            user,
            displayName: user?.displayName ?? this.displayNameSnapshot,
            avatarKey: user?.avatarKey ?? this.avatarKeySnapshot,
        };
    }
}
