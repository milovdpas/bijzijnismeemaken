import type { Knex } from 'knex';

/**
 * Day-before reminders (task 41): when a participant was last reminded of
 * this occurrence. Cleared whenever the moment changes, so a rescheduled
 * activity reminds again; set by the worker, once.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('occurrence_participants', (table) => {
        table.datetime('reminded_at', { precision: 3 }).nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('occurrence_participants', (table) => {
        table.dropColumn('reminded_at');
    });
}
