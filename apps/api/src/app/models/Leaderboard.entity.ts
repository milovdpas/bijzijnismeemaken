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
import type { EditMode, LeaderboardDto, ScoreType, SortOrder } from '@bzim/types';

import Group from './Group.entity';
import LeaderboardEditor from './LeaderboardEditor.entity';
import LeaderboardMember from './LeaderboardMember.entity';
import User from './User.entity';

/**
 * A standalone ranking inside a group: who is on it, who may enter scores,
 * which periods are shown. The scores themselves live in the three period
 * tables, and never on this row.
 */
@Entity('leaderboards')
export default class Leaderboard extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'group_id', type: 'char', length: 36 })
    groupId!: string;

    @ManyToOne(() => Group, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'group_id' })
    group!: Group;

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

    @Column({ name: 'score_type', type: 'varchar', length: 8 })
    scoreType!: ScoreType;

    @Column({ name: 'sort_order', type: 'varchar', length: 4 })
    sortOrder!: SortOrder;

    @Column({ name: 'edit_mode', type: 'varchar', length: 8 })
    editMode!: EditMode;

    @Column({ name: 'show_monthly', type: 'boolean', default: true })
    showMonthly!: boolean;

    @Column({ name: 'show_yearly', type: 'boolean', default: true })
    showYearly!: boolean;

    @Column({ name: 'show_all_time', type: 'boolean', default: true })
    showAllTime!: boolean;

    /** Plus and minus buttons beside each score; only ever true on a number board. */
    @Column({ name: 'show_steppers', type: 'boolean', default: false })
    showSteppers!: boolean;

    @OneToMany(() => LeaderboardEditor, (editor) => editor.leaderboard)
    editors!: LeaderboardEditor[];

    @OneToMany(() => LeaderboardMember, (member) => member.leaderboard)
    members!: LeaderboardMember[];

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
    updatedAt!: Date;

    isCreatedBy(userId: string): boolean {
        return this.createdById === userId;
    }

    /** Needs `createdBy` loaded. */
    toDto(): LeaderboardDto {
        if (this.createdBy === undefined) {
            throw new Error(`Leaderboard ${this.id} was loaded without its creator`);
        }
        const creator = this.createdBy?.toSummary() ?? null;
        return {
            id: this.id,
            groupId: this.groupId,
            name: this.name,
            description: this.description,
            scoreType: this.scoreType,
            sortOrder: this.sortOrder,
            editMode: this.editMode,
            showMonthly: this.showMonthly,
            showYearly: this.showYearly,
            showAllTime: this.showAllTime,
            showSteppers: this.showSteppers,
            creator,
            creatorName: creator?.displayName ?? this.creatorNameSnapshot,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
        };
    }
}
