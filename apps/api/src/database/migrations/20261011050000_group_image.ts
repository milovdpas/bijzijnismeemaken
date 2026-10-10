import type { Knex } from 'knex';

/**
 * A picture for a group, the same way an activity has one: a link, and the
 * photographer's credit when it came from the stock photo search.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('groups', (table) => {
        table.string('image_url', 500).nullable();
    });
    await knex.schema.alterTable('groups', (table) => {
        table.string('image_credit_name', 80).nullable();
    });
    await knex.schema.alterTable('groups', (table) => {
        table.string('image_credit_url', 500).nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('groups', (table) => {
        table.dropColumn('image_credit_url');
    });
    await knex.schema.alterTable('groups', (table) => {
        table.dropColumn('image_credit_name');
    });
    await knex.schema.alterTable('groups', (table) => {
        table.dropColumn('image_url');
    });
}
