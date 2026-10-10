import type { Knex } from 'knex';

/**
 * Per-type, per-channel notification settings replace the three email flags
 * on `users`. A row exists only once someone changes a type; a missing row
 * means the default (email on, push off), so nothing is seeded.
 *
 * Column drops are one statement each: MySQL DDL is not transactional, and a
 * single multi-column alter that fails halfway leaves the table in a state no
 * migration describes.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('notification_settings', (table) => {
        table.uuid('id').primary();
        table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.string('type', 24).notNullable();
        table.boolean('email').notNullable();
        table.boolean('push').notNullable();
        table.datetime('updated_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.unique(['user_id', 'type']);
    });

    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('notify_email_invites');
    });
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('notify_email_planned');
    });
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('notify_email_new_activity');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('users', (table) => {
        table.boolean('notify_email_invites').notNullable().defaultTo(true);
    });
    await knex.schema.alterTable('users', (table) => {
        table.boolean('notify_email_planned').notNullable().defaultTo(true);
    });
    await knex.schema.alterTable('users', (table) => {
        table.boolean('notify_email_new_activity').notNullable().defaultTo(true);
    });
    await knex.schema.dropTableIfExists('notification_settings');
}
