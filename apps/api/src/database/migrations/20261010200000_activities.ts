import type { Knex } from 'knex';

/**
 * Activities, who is in for them, and the moments they are planned on.
 *
 * Actor references (`created_by_id`, `added_by_id`, `planned_by_id`) are SET
 * NULL: an activity outlives the person who thought of it, and the service
 * keeps their name in `creator_name_snapshot`. Everything else cascades from
 * its parent, so deleting a group or an activity leaves nothing behind.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('activities', (table) => {
        table.uuid('id').primary();
        table.uuid('group_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
        table
            .uuid('created_by_id')
            .nullable()
            .references('id')
            .inTable('users')
            .onDelete('SET NULL');
        table.string('creator_name_snapshot', 40).nullable();
        table.string('category', 16).notNullable();
        table.string('title', 80).notNullable();
        table.text('description').nullable();
        table.string('image_url', 500).nullable();
        table.boolean('is_recurring').notNullable().defaultTo(false);
        table.string('date_mode', 8).notNullable();
        table.date('specific_date').nullable();
        // ISO weekday, Monday 1 to Sunday 7.
        table.tinyint('weekday').nullable();
        table.time('start_time').nullable();
        table.string('location_text', 120).nullable();
        table.string('location_url', 500).nullable();
        table.smallint('min_people').nullable();
        table.smallint('max_people').nullable();
        table.decimal('cost_per_person', 8, 2).nullable();
        table.smallint('duration_minutes').nullable();
        table.string('external_url', 500).nullable();
        table.json('preferred_dayparts').nullable();
        table.boolean('is_active').notNullable().defaultTo(true);
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.datetime('updated_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.index(['group_id', 'is_active']);
        table.index(['created_by_id']);
    });

    // "I'm in" marks. One row per person per activity.
    await knex.schema.createTable('activity_interests', (table) => {
        table.uuid('id').primary();
        table
            .uuid('activity_id')
            .notNullable()
            .references('id')
            .inTable('activities')
            .onDelete('CASCADE');
        table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.uuid('added_by_id').nullable().references('id').inTable('users').onDelete('SET NULL');
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.unique(['activity_id', 'user_id']);
        table.index(['user_id']);
    });

    await knex.schema.createTable('activity_occurrences', (table) => {
        table.uuid('id').primary();
        table
            .uuid('activity_id')
            .notNullable()
            .references('id')
            .inTable('activities')
            .onDelete('CASCADE');
        table.date('date').notNullable();
        table.string('daypart', 9).nullable();
        table.time('start_time').nullable();
        table.string('status', 9).notNullable();
        table
            .uuid('planned_by_id')
            .nullable()
            .references('id')
            .inTable('users')
            .onDelete('SET NULL');
        table.string('notes', 255).nullable();
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.datetime('updated_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.index(['activity_id', 'date']);
        table.index(['date', 'status']);
    });

    // The selected subset of "in" members at planning time, plus what each
    // was last told, so an edit only mails the people it concerns.
    await knex.schema.createTable('occurrence_participants', (table) => {
        table.uuid('id').primary();
        table
            .uuid('occurrence_id')
            .notNullable()
            .references('id')
            .inTable('activity_occurrences')
            .onDelete('CASCADE');
        table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.datetime('notified_at', { precision: 3 }).nullable();
        table.date('notified_for_date').nullable();
        table.string('notified_for_daypart', 9).nullable();
        table.time('notified_for_start_time').nullable();
        table.string('calendar_event_id', 255).nullable();
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.unique(['occurrence_id', 'user_id']);
        table.index(['user_id']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('occurrence_participants');
    await knex.schema.dropTableIfExists('activity_occurrences');
    await knex.schema.dropTableIfExists('activity_interests');
    await knex.schema.dropTableIfExists('activities');
}
