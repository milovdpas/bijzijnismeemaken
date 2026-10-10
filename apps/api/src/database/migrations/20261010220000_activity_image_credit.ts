import type { Knex } from 'knex';

/**
 * Who took the activity's picture. Unsplash asks that a photo is credited
 * wherever it is shown, and the picker's knowledge of the photographer was
 * lost the moment the URL was saved. Null for a pasted link.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('activities', (table) => {
        table.string('image_credit_name', 80).nullable();
    });
    await knex.schema.alterTable('activities', (table) => {
        table.string('image_credit_url', 500).nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('activities', (table) => {
        table.dropColumn('image_credit_url');
    });
    await knex.schema.alterTable('activities', (table) => {
        table.dropColumn('image_credit_name');
    });
}
