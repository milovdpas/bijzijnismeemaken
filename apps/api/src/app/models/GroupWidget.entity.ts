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
import type { GroupWidgetDto, WidgetConfig, WidgetSpec, WidgetType } from '@bzim/types';

import Group from './Group.entity';
import User from './User.entity';

/**
 * One tile on a group's dashboard. `config` is whatever the type needs
 * (docs/03), checked by the type's zod schema on the way in; the screen
 * fetches the widget's data itself through the ordinary endpoints.
 */
@Entity('group_widgets')
export default class GroupWidget extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'group_id', type: 'char', length: 36 })
    groupId!: string;

    @ManyToOne(() => Group, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'group_id' })
    group!: Group;

    @Column({ type: 'varchar', length: 16 })
    type!: WidgetType;

    @Column({ type: 'json' })
    config!: WidgetConfig;

    @Column({ type: 'smallint' })
    position!: number;

    @Column({ name: 'created_by_id', type: 'char', length: 36, nullable: true })
    createdById!: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'created_by_id' })
    createdBy!: User | null;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
    updatedAt!: Date;

    toDto(): GroupWidgetDto {
        // The type and its config were validated together on the way in; the
        // database holds them in two columns, so the pair is rejoined here.
        const spec = { type: this.type, config: this.config } as WidgetSpec;
        return {
            ...spec,
            id: this.id,
            position: this.position,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
        };
    }
}
