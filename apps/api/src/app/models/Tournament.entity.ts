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
import { GroupRole, TournamentStatus } from '@bzim/types';
import type { ParticipantMode, TournamentDto, TournamentFormat } from '@bzim/types';

import Activity from './Activity.entity';
import Group from './Group.entity';
import type GroupMember from './GroupMember.entity';
import TournamentEntry from './TournamentEntry.entity';
import TournamentMatch from './TournamentMatch.entity';
import User from './User.entity';

/**
 * A tournament in a group (docs/01 §1.5c): its format, who plays (players or
 * teams), the points of the group stage, and where it stands. Made by any
 * member, who is its organiser; optionally made from a `tournament`
 * activity, which then links to it.
 */
@Entity('tournaments')
export default class Tournament extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'group_id', type: 'char', length: 36 })
    groupId!: string;

    @ManyToOne(() => Group, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'group_id' })
    group!: Group;

    @Column({ name: 'activity_id', type: 'char', length: 36, nullable: true })
    activityId!: string | null;

    @ManyToOne(() => Activity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'activity_id' })
    activity!: Activity | null;

    @Column({ name: 'created_by_id', type: 'char', length: 36, nullable: true })
    createdById!: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'created_by_id' })
    createdBy!: User | null;

    @Column({ name: 'creator_name_snapshot', type: 'varchar', length: 40, nullable: true })
    creatorNameSnapshot!: string | null;

    @Column({ type: 'varchar', length: 60 })
    name!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ type: 'varchar', length: 16 })
    format!: TournamentFormat;

    @Column({ name: 'participant_mode', type: 'varchar', length: 8 })
    participantMode!: ParticipantMode;

    /** People per team; null when players play. */
    @Column({ name: 'team_size', type: 'tinyint', unsigned: true, nullable: true })
    teamSize!: number | null;

    @Column({ type: 'varchar', length: 8, default: TournamentStatus.DRAFT })
    status!: TournamentStatus;

    @Column({ name: 'win_points', type: 'tinyint', unsigned: true, default: 3 })
    winPoints!: number;

    @Column({ name: 'draw_points', type: 'tinyint', unsigned: true, default: 1 })
    drawPoints!: number;

    /** Groups in the group stage; null for a knockout from the start. */
    @Column({ name: 'group_count', type: 'tinyint', unsigned: true, nullable: true })
    groupCount!: number | null;

    @Column({ name: 'advance_per_group', type: 'tinyint', unsigned: true, nullable: true })
    advancePerGroup!: number | null;

    @Column({ name: 'third_place', type: 'boolean', default: false })
    thirdPlace!: boolean;

    @Column({ name: 'winner_entry_id', type: 'char', length: 36, nullable: true })
    winnerEntryId!: string | null;

    @Column({ name: 'started_at', type: 'datetime', precision: 3, nullable: true })
    startedAt!: Date | null;

    @Column({ name: 'finished_at', type: 'datetime', precision: 3, nullable: true })
    finishedAt!: Date | null;

    @OneToMany(() => TournamentEntry, (entry) => entry.tournament)
    entries!: TournamentEntry[];

    @OneToMany(() => TournamentMatch, (match) => match.tournament)
    matches!: TournamentMatch[];

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
    updatedAt!: Date;

    /** The organiser: whoever made it. */
    isCreatedBy(userId: string): boolean {
        return this.createdById === userId;
    }

    /** Who runs it (settings, entries, the draw, play): the organiser, or a group admin. */
    isManagedBy(member: GroupMember): boolean {
        return this.isCreatedBy(member.userId) || member.hasRole(GroupRole.ADMIN);
    }

    /** Needs `createdBy` loaded; the organiser's name outlives their leaving through the snapshot. */
    toDto(): TournamentDto {
        if (this.createdBy === undefined) {
            throw new Error(`Tournament ${this.id} was loaded without its organiser`);
        }
        const organiser = this.createdBy?.toSummary() ?? null;
        return {
            id: this.id,
            groupId: this.groupId,
            name: this.name,
            description: this.description,
            format: this.format,
            participantMode: this.participantMode,
            teamSize: this.teamSize,
            winPoints: this.winPoints,
            drawPoints: this.drawPoints,
            groupCount: this.groupCount,
            advancePerGroup: this.advancePerGroup,
            thirdPlace: this.thirdPlace,
            status: this.status,
            activityId: this.activityId,
            organiser,
            organiserName: organiser?.displayName ?? this.creatorNameSnapshot,
            winnerEntryId: this.winnerEntryId,
            createdAt: this.createdAt.toISOString(),
            startedAt: this.startedAt?.toISOString() ?? null,
            finishedAt: this.finishedAt?.toISOString() ?? null,
        };
    }
}
