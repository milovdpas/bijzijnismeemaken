import type { Knex } from 'knex';

/**
 * Plus and minus buttons next to each score, for boards that count points.
 * A convenience of the screen only: the API still takes absolute values.
 * Never on for a time board, where a step of one makes no sense.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('leaderboards', (table) => {
        table.boolean('show_steppers').notNullable().defaultTo(false);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('leaderboards', (table) => {
        table.dropColumn('show_steppers');
    });
}
