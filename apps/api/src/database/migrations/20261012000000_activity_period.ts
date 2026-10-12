import type { Knex } from 'knex';

/**
 * The `period` date mode: an activity that can happen any day between two
 * dates, both included (a summer, a holiday week). Null for the other modes.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('activities', (table) => {
        table.date('period_start').nullable().after('weekday');
        table.date('period_end').nullable().after('period_start');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('activities', (table) => {
        table.dropColumn('period_end');
        table.dropColumn('period_start');
    });
}
