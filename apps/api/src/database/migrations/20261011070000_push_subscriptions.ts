import type { Knex } from 'knex';

/**
 * Web push (docs/03): one row per browser that asked for notifications. The
 * endpoint is unique on its own, not per user: a browser belongs to whoever
 * signed in last, so a second person subscribing on the same device takes the
 * row over. Rows go with the account, and the sender drops the ones the push
 * service reports gone.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('push_subscriptions', (table) => {
        table.uuid('id').primary();
        table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.string('endpoint', 500).notNullable();
        table.string('p256dh', 255).notNullable();
        table.string('auth', 255).notNullable();
        table.string('user_agent', 255).nullable();
        table.datetime('last_used_at', { precision: 3 }).nullable();
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.datetime('updated_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.unique(['endpoint'], { indexName: 'push_subscriptions_endpoint_unique' });
        table.index(['user_id'], 'push_subscriptions_user_idx');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('push_subscriptions');
}
