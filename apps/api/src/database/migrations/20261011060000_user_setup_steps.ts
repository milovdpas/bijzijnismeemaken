import type { Knex } from 'knex';

/**
 * The two optional onboarding steps (docs/07 task 38b): when each was done
 * or skipped. Null means the person has not been past it, and the groups
 * page offers to finish the setup.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('users', (table) => {
        table.datetime('setup_calendar_seen_at', { precision: 3 }).nullable();
    });
    await knex.schema.alterTable('users', (table) => {
        table.datetime('setup_availability_seen_at', { precision: 3 }).nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('setup_availability_seen_at');
    });
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('setup_calendar_seen_at');
    });
}
