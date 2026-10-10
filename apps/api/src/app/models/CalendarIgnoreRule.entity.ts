import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import type { CalendarIgnoreRuleDto, CalendarIgnoreRuleKind } from '@bzim/types';

import User from './User.entity';

/**
 * An event the availability algorithm must not count (docs/06): every event
 * with this title, case-insensitively, or every instance of this series.
 * `value` is what is matched; `label` is what the person sees.
 */
@Entity('calendar_ignore_rules')
export default class CalendarIgnoreRule extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id', type: 'char', length: 36 })
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'varchar', length: 8 })
    kind!: CalendarIgnoreRuleKind;

    @Column({ type: 'varchar', length: 255 })
    value!: string;

    @Column({ type: 'varchar', length: 255 })
    label!: string;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    toDto(): CalendarIgnoreRuleDto {
        return {
            id: this.id,
            kind: this.kind,
            value: this.value,
            label: this.label,
            createdAt: this.createdAt.toISOString(),
        };
    }
}
