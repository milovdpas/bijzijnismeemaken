import type { Knex } from 'knex';

/**
 * What a person says about their own time: one-off blocks and weekly rules.
 * Both belong to the user and go with the account. Calendar-derived
 * availability is a separate milestone and separate tables.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('manual_unavailability', (table) => {
        table.uuid('id').primary();
        table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.date('date').notNullable();
        table.string('daypart', 9).notNullable();
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.unique(['user_id', 'date', 'daypart']);
        table.index(['user_id', 'date']);
    });

    await knex.schema.createTable('weekly_unavailability_rules', (table) => {
        table.uuid('id').primary();
        table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        // ISO weekday, Monday 1 to Sunday 7.
        table.tinyint('weekday').notNullable();
        table.string('daypart', 9).notNullable();
        table.date('valid_from').nullable();
        table.date('valid_until').nullable();
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.datetime('updated_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.index(['user_id']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('weekly_unavailability_rules');
    await knex.schema.dropTableIfExists('manual_unavailability');
}
