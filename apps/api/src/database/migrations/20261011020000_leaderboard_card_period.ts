import type { Knex } from 'knex';

/**
 * Which ranking the board's card in the list shows the top of: monthly,
 * yearly or total. One of the periods the board keeps; the service keeps
 * it that way when the periods change.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('leaderboards', (table) => {
        table.string('card_period', 8).notNullable().defaultTo('total');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('leaderboards', (table) => {
        table.dropColumn('card_period');
    });
}
