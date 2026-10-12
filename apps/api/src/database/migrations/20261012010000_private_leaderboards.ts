import type { Knex } from 'knex';

/**
 * A private board: seen only by the people on it, group admins included,
 * and never a dashboard widget. Set when the board is made, never after,
 * so nobody's tally turns public or disappears from under the group.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('leaderboards', (table) => {
        table.boolean('is_private').notNullable().defaultTo(false);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('leaderboards', (table) => {
        table.dropColumn('is_private');
    });
}
