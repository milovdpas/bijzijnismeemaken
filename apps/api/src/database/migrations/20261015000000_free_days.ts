import type { Knex } from 'knex';

/**
 * A one-off can also say "free": that date and daypart is free even though
 * a weekly rule says busy (a holiday in a week of work mornings). Still one
 * row per person, date and daypart, so a daypart is blocked or freed by
 * hand, never both. Existing rows are blocks, as before.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('manual_unavailability', (table) => {
        table.boolean('free').notNullable().defaultTo(false).after('daypart');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex('manual_unavailability').where({ free: true }).delete();
    await knex.schema.alterTable('manual_unavailability', (table) => {
        table.dropColumn('free');
    });
}
