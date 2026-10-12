import type { Knex } from 'knex';

/**
 * Calendars read through a link (Apple, Outlook, any iCalendar feed): no
 * account and no grant, just a secret URL the calendar hands out. Anybody
 * holding it can read the calendar, so it is encrypted like the Google
 * tokens, with a keyed hash beside it to spot the same link twice. Their
 * events go into `calendar_events` like Google's, hanging off the feed
 * instead of a Google calendar, so the availability reads them unchanged.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('calendar_feeds', (table) => {
        table.uuid('id').primary();
        table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.string('name', 100).notNullable();
        table.binary('url_enc', 2048).notNullable();
        table.string('url_hash', 64).notNullable();
        // Where it comes from, for the screen; not secret on its own.
        table.string('host', 255).notNullable();
        table.string('status', 16).notNullable();
        table.datetime('last_synced_at', { precision: 3 }).nullable();
        // A `CalendarFeedProblem` code, translated by the app.
        table.string('last_error', 16).nullable();
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.datetime('updated_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.unique(['user_id', 'url_hash'], 'cal_feeds_unique');
    });

    // An event comes from a Google calendar or from a link: exactly one of the two.
    await knex.schema.alterTable('calendar_events', (table) => {
        table.uuid('source_id').nullable().alter();
        table
            .uuid('feed_id')
            .nullable()
            .references('id')
            .inTable('calendar_feeds')
            .onDelete('CASCADE');
        table.unique(['feed_id', 'provider_event_id'], 'cal_events_feed_unique');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex('calendar_events').whereNull('source_id').delete();
    await knex.schema.alterTable('calendar_events', (table) => {
        table.dropUnique(['feed_id', 'provider_event_id'], 'cal_events_feed_unique');
        table.dropForeign(['feed_id']);
    });
    await knex.schema.alterTable('calendar_events', (table) => {
        table.dropColumn('feed_id');
        table.uuid('source_id').notNullable().alter();
    });
    await knex.schema.dropTableIfExists('calendar_feeds');
}
