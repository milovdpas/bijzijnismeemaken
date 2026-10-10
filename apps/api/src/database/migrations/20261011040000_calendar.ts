import type { Knex } from 'knex';

/**
 * Google Calendar (M2, docs/03): a person's connection with its tokens
 * encrypted at rest, the calendars it exposes, the events synced from the
 * enabled ones for the availability algorithm, and the rules that keep
 * certain events out of it. Everything hangs off the user and goes with
 * the account. `occurrence_participants` learns which connection an
 * auto-added event was written through, so it can be updated or removed.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('calendar_connections', (table) => {
        table.uuid('id').primary();
        table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.string('provider', 16).notNullable();
        // The account email is personal data: encrypted like users.email, with a
        // keyed hash beside it for the uniqueness check.
        table.text('account_email').notNullable();
        table.string('account_email_hash', 64).notNullable();
        table.binary('refresh_token_enc', 1024).notNullable();
        table.binary('access_token_enc', 2048).nullable();
        table.datetime('access_token_expires_at', { precision: 3 }).nullable();
        table.string('scopes', 500).notNullable();
        table.boolean('has_write_scope').notNullable().defaultTo(false);
        table.string('status', 16).notNullable();
        table.datetime('last_synced_at', { precision: 3 }).nullable();
        table.string('last_error', 500).nullable();
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.datetime('updated_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.unique(['user_id', 'provider', 'account_email_hash'], 'cal_connections_unique');
    });

    await knex.schema.createTable('calendar_sources', (table) => {
        table.uuid('id').primary();
        table
            .uuid('connection_id')
            .notNullable()
            .references('id')
            .inTable('calendar_connections')
            .onDelete('CASCADE');
        table.string('provider_calendar_id', 255).notNullable();
        table.string('name', 255).notNullable();
        table.boolean('is_primary').notNullable().defaultTo(false);
        table.boolean('enabled').notNullable().defaultTo(false);
        table.string('time_zone', 64).notNullable();
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.datetime('updated_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.unique(['connection_id', 'provider_calendar_id'], 'cal_sources_unique');
    });

    await knex.schema.createTable('calendar_events', (table) => {
        table.uuid('id').primary();
        table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table
            .uuid('source_id')
            .notNullable()
            .references('id')
            .inTable('calendar_sources')
            .onDelete('CASCADE');
        table.string('provider_event_id', 255).notNullable();
        table.string('recurring_event_id', 255).nullable();
        table.string('title', 255).notNullable();
        // All-day events are stored as Amsterdam midnight to midnight in UTC too,
        // so range queries and the cleanup treat every event the same way.
        table.datetime('start_at', { precision: 3 }).notNullable();
        table.datetime('end_at', { precision: 3 }).notNullable();
        table.boolean('all_day').notNullable().defaultTo(false);
        table.date('start_date').nullable();
        // Exclusive, as Google gives it.
        table.date('end_date').nullable();
        // Google's "Free" transparency: the event never blocks.
        table.boolean('transparent').notNullable().defaultTo(false);
        table.string('event_type', 24).notNullable();
        table.datetime('synced_at', { precision: 3 }).notNullable();
        table.unique(['source_id', 'provider_event_id'], 'cal_events_unique');
        table.index(['user_id', 'start_at', 'end_at'], 'cal_events_range');
    });

    await knex.schema.createTable('calendar_ignore_rules', (table) => {
        table.uuid('id').primary();
        table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.string('kind', 8).notNullable();
        // The lowercased title, or the recurring event id.
        table.string('value', 255).notNullable();
        table.string('label', 255).notNullable();
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.unique(['user_id', 'kind', 'value'], 'cal_ignore_rules_unique');
    });

    await knex.schema.alterTable('occurrence_participants', (table) => {
        table
            .uuid('calendar_connection_id')
            .nullable()
            .references('id')
            .inTable('calendar_connections')
            .onDelete('SET NULL');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('occurrence_participants', (table) => {
        table.dropForeign(['calendar_connection_id']);
    });
    await knex.schema.alterTable('occurrence_participants', (table) => {
        table.dropColumn('calendar_connection_id');
    });
    await knex.schema.dropTableIfExists('calendar_ignore_rules');
    await knex.schema.dropTableIfExists('calendar_events');
    await knex.schema.dropTableIfExists('calendar_sources');
    await knex.schema.dropTableIfExists('calendar_connections');
}
