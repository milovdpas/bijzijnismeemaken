import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import type { TournamentEntryDto } from '@bzim/types';

import Tournament from './Tournament.entity';
import TournamentEntryMember from './TournamentEntryMember.entity';

/**
 * What plays in a tournament: a team, or a player as a team of one. Its
 * seed is its place in the draw (1 is the top seed) and, with a group
 * stage, its group. Both are fixed once the tournament starts.
 */
@Entity('tournament_entries')
export default class TournamentEntry extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'tournament_id', type: 'char', length: 36 })
    tournamentId!: string;

    @ManyToOne(() => Tournament, (tournament) => tournament.entries, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tournament_id' })
    tournament!: Tournament;

    /** The team's name, or the player's own. */
    @Column({ type: 'varchar', length: 60 })
    name!: string;

    @Column({ type: 'smallint', unsigned: true })
    seed!: number;

    @Column({ name: 'group_no', type: 'tinyint', unsigned: true, nullable: true })
    groupNo!: number | null;

    @OneToMany(() => TournamentEntryMember, (member) => member.entry)
    members!: TournamentEntryMember[];

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
    updatedAt!: Date;

    /** Needs `members.user` loaded. People by name: a team saved at once has no order of its own. */
    toDto(): TournamentEntryDto {
        return {
            id: this.id,
            name: this.name,
            seed: this.seed,
            groupNo: this.groupNo,
            members: this.members
                .map((member) => member.toDto())
                .sort((a, b) => a.displayName.localeCompare(b.displayName)),
        };
    }
}
