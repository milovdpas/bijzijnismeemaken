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
import type { CalendarSourceDto } from '@bzim/types';

import CalendarConnection from './CalendarConnection.entity';

/**
 * One calendar inside a connection, as the provider lists them. Only the
 * enabled ones are synced and count for availability; the primary one is
 * enabled by default and is where auto-added events go.
 */
@Entity('calendar_sources')
export default class CalendarSource extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'connection_id', type: 'char', length: 36 })
    connectionId!: string;

    @ManyToOne(() => CalendarConnection, (connection) => connection.sources, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'connection_id' })
    connection!: CalendarConnection;

    @Column({ name: 'provider_calendar_id', type: 'varchar', length: 255 })
    providerCalendarId!: string;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ name: 'is_primary', type: 'boolean', default: false })
    isPrimary!: boolean;

    @Column({ type: 'boolean', default: false })
    enabled!: boolean;

    @Column({ name: 'time_zone', type: 'varchar', length: 64 })
    timeZone!: string;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
    updatedAt!: Date;

    toDto(): CalendarSourceDto {
        return {
            id: this.id,
            name: this.name,
            isPrimary: this.isPrimary,
            enabled: this.enabled,
            timeZone: this.timeZone,
        };
    }
}
