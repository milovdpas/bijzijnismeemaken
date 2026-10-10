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
import type { ActivityCategory, ActivityDto, DateMode, Daypart, Weekday } from '@bzim/types';

import { decimalTransformer, timeTransformer } from '../utils/ColumnTransformers';
import ActivityInterest from './ActivityInterest.entity';
import ActivityOccurrence from './ActivityOccurrence.entity';
import Group from './Group.entity';
import User from './User.entity';

/**
 * Something a group might do. Its state (idea, planned, done) is not a
 * column: it is read off the occurrences, see `utils/ActivityLabel.ts`.
 *
 * `DATE` and `TIME` columns are strings (`YYYY-MM-DD`, `HH:mm`): they are
 * wall-clock values in Europe/Amsterdam with no instant attached, and a
 * `Date` object would invent one.
 */
@Entity('activities')
export default class Activity extends BaseEntity {
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

    /** Filled when the creator leaves, so the card still says who thought of it. */
    @Column({ name: 'creator_name_snapshot', type: 'varchar', length: 40, nullable: true })
    creatorNameSnapshot!: string | null;

    @Column({ type: 'varchar', length: 16 })
    category!: ActivityCategory;

    @Column({ type: 'varchar', length: 80 })
    title!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
    imageUrl!: string | null;

    @Column({ name: 'is_recurring', type: 'boolean', default: false })
    isRecurring!: boolean;

    @Column({ name: 'date_mode', type: 'varchar', length: 8 })
    dateMode!: DateMode;

    @Column({ name: 'specific_date', type: 'date', nullable: true })
    specificDate!: string | null;

    @Column({ type: 'tinyint', nullable: true })
    weekday!: Weekday | null;

    @Column({ name: 'start_time', type: 'time', nullable: true, transformer: timeTransformer })
    startTime!: string | null;

    @Column({ name: 'location_text', type: 'varchar', length: 120, nullable: true })
    locationText!: string | null;

    @Column({ name: 'location_url', type: 'varchar', length: 500, nullable: true })
    locationUrl!: string | null;

    @Column({ name: 'min_people', type: 'smallint', nullable: true })
    minPeople!: number | null;

    @Column({ name: 'max_people', type: 'smallint', nullable: true })
    maxPeople!: number | null;

    @Column({
        name: 'cost_per_person',
        type: 'decimal',
        precision: 8,
        scale: 2,
        nullable: true,
        transformer: decimalTransformer,
    })
    costPerPerson!: number | null;

    @Column({ name: 'duration_minutes', type: 'smallint', nullable: true })
    durationMinutes!: number | null;

    @Column({ name: 'external_url', type: 'varchar', length: 500, nullable: true })
    externalUrl!: string | null;

    @Column({ name: 'preferred_dayparts', type: 'json', nullable: true })
    preferredDayparts!: Daypart[] | null;

    /** False once the creator left; hidden from members, listed for admins under "inactive". */
    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive!: boolean;

    @OneToMany(() => ActivityInterest, (interest) => interest.activity)
    interests!: ActivityInterest[];

    @OneToMany(() => ActivityOccurrence, (occurrence) => occurrence.activity)
    occurrences!: ActivityOccurrence[];

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
    updatedAt!: Date;

    /** Whether this person may edit, plan or delete it: the creator, or an admin (checked by the caller). */
    isCreatedBy(userId: string): boolean {
        return this.createdById === userId;
    }

    /** Needs `createdBy` loaded. */
    toDto(): ActivityDto {
        if (this.createdBy === undefined) {
            throw new Error(`Activity ${this.id} was loaded without its creator`);
        }
        const creator = this.createdBy?.toSummary() ?? null;
        return {
            id: this.id,
            groupId: this.groupId,
            category: this.category,
            title: this.title,
            description: this.description,
            imageUrl: this.imageUrl,
            isRecurring: this.isRecurring,
            dateMode: this.dateMode,
            specificDate: this.specificDate,
            weekday: this.weekday,
            startTime: this.startTime,
            locationText: this.locationText,
            locationUrl: this.locationUrl,
            minPeople: this.minPeople,
            maxPeople: this.maxPeople,
            costPerPerson: this.costPerPerson,
            durationMinutes: this.durationMinutes,
            externalUrl: this.externalUrl,
            preferredDayparts: this.preferredDayparts,
            isActive: this.isActive,
            creator,
            creatorName: creator?.displayName ?? this.creatorNameSnapshot,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
        };
    }
}
