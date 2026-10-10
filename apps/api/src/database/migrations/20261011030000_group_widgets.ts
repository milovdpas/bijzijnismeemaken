import type { Knex } from 'knex';

/**
 * The group dashboard: an ordered list of widgets with a config per type
 * (docs/03). The config is JSON because each type carries different
 * fields; a leaderboard or activity id inside it is cleaned up by the
 * service when its target is deleted, since no foreign key can reach it.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('group_widgets', (table) => {
        table.uuid('id').primary();
        table.uuid('group_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
        table.string('type', 16).notNullable();
        table.json('config').notNullable();
        table.smallint('position').notNullable();
        table
            .uuid('created_by_id')
            .nullable()
            .references('id')
            .inTable('users')
            .onDelete('SET NULL');
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.datetime('updated_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.index(['group_id', 'position'], 'group_widgets_order');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable('group_widgets');
}
