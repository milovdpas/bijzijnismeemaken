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
import { MatchStatus } from '@bzim/types';
import type { MatchSlot, MatchStage } from '@bzim/types';

import Tournament from './Tournament.entity';

/**
 * One match. A group match belongs to a group and a round of its round
 * robin; a knockout match to a round of the bracket, with the match its
 * winner goes on to (`nextMatchId`, `nextSlot`). A bye is a knockout match
 * with one side empty and its winner set at the start. The final is the
 * knockout match without a next one; a third-place match sits beside it at
 * position 1 of the last round.
 */
@Entity('tournament_matches')
export default class TournamentMatch extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'tournament_id', type: 'char', length: 36 })
    tournamentId!: string;

    @ManyToOne(() => Tournament, (tournament) => tournament.matches, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tournament_id' })
    tournament!: Tournament;

    @Column({ type: 'varchar', length: 8 })
    stage!: MatchStage;

    @Column({ name: 'group_no', type: 'tinyint', unsigned: true, nullable: true })
    groupNo!: number | null;

    /** 1-based, per stage. */
    @Column({ type: 'smallint', unsigned: true })
    round!: number;

    /** 0-based within the round, top to bottom of the bracket. */
    @Column({ type: 'smallint', unsigned: true })
    position!: number;

    @Column({ name: 'home_entry_id', type: 'char', length: 36, nullable: true })
    homeEntryId!: string | null;

    @Column({ name: 'away_entry_id', type: 'char', length: 36, nullable: true })
    awayEntryId!: string | null;

    @Column({ name: 'home_score', type: 'smallint', unsigned: true, nullable: true })
    homeScore!: number | null;

    @Column({ name: 'away_score', type: 'smallint', unsigned: true, nullable: true })
    awayScore!: number | null;

    @Column({ name: 'winner_entry_id', type: 'char', length: 36, nullable: true })
    winnerEntryId!: string | null;

    @Column({ type: 'varchar', length: 8, default: MatchStatus.PENDING })
    status!: MatchStatus;

    @Column({ name: 'next_match_id', type: 'char', length: 36, nullable: true })
    nextMatchId!: string | null;

    @Column({ name: 'next_slot', type: 'varchar', length: 4, nullable: true })
    nextSlot!: MatchSlot | null;

    @Column({ name: 'reported_by_id', type: 'char', length: 36, nullable: true })
    reportedById!: string | null;

    @Column({ name: 'played_at', type: 'datetime', precision: 3, nullable: true })
    playedAt!: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
    updatedAt!: Date;
}
