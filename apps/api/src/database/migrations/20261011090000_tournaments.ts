import type { Knex } from 'knex';

/**
 * Tournaments (M4, docs/03): the tournament, its entries (a player is a team
 * of one), the people in each entry, and the matches.
 *
 * An entry member keeps a name and avatar snapshot from the start, since
 * guests have no account at all; `user_id` only says who may enter results.
 * Matches point at entries rather than people, and at the match their
 * winner goes on to, so the bracket is the rows themselves.
 *
 * `tournaments.winner_entry_id` refers to an entry of its own tournament, a
 * cycle, so that key is added once both tables exist.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('tournaments', (table) => {
        table.uuid('id').primary();
        table.uuid('group_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
        table
            .uuid('activity_id')
            .nullable()
            .references('id')
            .inTable('activities')
            .onDelete('SET NULL');
        table
            .uuid('created_by_id')
            .nullable()
            .references('id')
            .inTable('users')
            .onDelete('SET NULL');
        table.string('creator_name_snapshot', 40).nullable();
        table.string('name', 60).notNullable();
        table.text('description').nullable();
        table.string('format', 16).notNullable();
        table.string('participant_mode', 8).notNullable();
        table.tinyint('team_size').unsigned().nullable();
        table.string('status', 8).notNullable().defaultTo('draft');
        table.tinyint('win_points').unsigned().notNullable().defaultTo(3);
        table.tinyint('draw_points').unsigned().notNullable().defaultTo(1);
        table.tinyint('group_count').unsigned().nullable();
        table.tinyint('advance_per_group').unsigned().nullable();
        table.boolean('third_place').notNullable().defaultTo(false);
        table.uuid('winner_entry_id').nullable();
        table.datetime('started_at', { precision: 3 }).nullable();
        table.datetime('finished_at', { precision: 3 }).nullable();
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.datetime('updated_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.index(['group_id', 'status'], 'tournaments_group_status');
    });

    await knex.schema.createTable('tournament_entries', (table) => {
        table.uuid('id').primary();
        table
            .uuid('tournament_id')
            .notNullable()
            .references('id')
            .inTable('tournaments')
            .onDelete('CASCADE');
        table.string('name', 60).notNullable();
        // The draw: 1 is the top seed. Rewritten as a whole on a reorder.
        table.smallint('seed').unsigned().notNullable();
        table.tinyint('group_no').unsigned().nullable();
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.datetime('updated_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.unique(['tournament_id', 'seed'], 'tournament_entries_seed');
    });

    await knex.schema.alterTable('tournaments', (table) => {
        table
            .foreign('winner_entry_id', 'tournaments_winner_entry')
            .references('id')
            .inTable('tournament_entries')
            .onDelete('SET NULL');
    });

    await knex.schema.createTable('tournament_entry_members', (table) => {
        table.uuid('id').primary();
        table
            .uuid('entry_id')
            .notNullable()
            .references('id')
            .inTable('tournament_entries')
            .onDelete('CASCADE');
        table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
        table.string('display_name_snapshot', 40).notNullable();
        // Null for a guest, who has no avatar.
        table.string('avatar_key_snapshot', 32).nullable();
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    });

    await knex.schema.createTable('tournament_matches', (table) => {
        table.uuid('id').primary();
        table
            .uuid('tournament_id')
            .notNullable()
            .references('id')
            .inTable('tournaments')
            .onDelete('CASCADE');
        table.string('stage', 8).notNullable();
        table.tinyint('group_no').unsigned().nullable();
        table.smallint('round').unsigned().notNullable();
        table.smallint('position').unsigned().notNullable();
        const entry = (column: string) =>
            table
                .uuid(column)
                .nullable()
                .references('id')
                .inTable('tournament_entries')
                .onDelete('SET NULL');
        entry('home_entry_id');
        entry('away_entry_id');
        table.smallint('home_score').unsigned().nullable();
        table.smallint('away_score').unsigned().nullable();
        entry('winner_entry_id');
        table.string('status', 8).notNullable().defaultTo('pending');
        table
            .uuid('next_match_id')
            .nullable()
            .references('id')
            .inTable('tournament_matches')
            .onDelete('SET NULL');
        table.string('next_slot', 4).nullable();
        table
            .uuid('reported_by_id')
            .nullable()
            .references('id')
            .inTable('users')
            .onDelete('SET NULL');
        table.datetime('played_at', { precision: 3 }).nullable();
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.datetime('updated_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.index(['tournament_id', 'stage', 'round'], 'tournament_matches_stage_round');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('tournament_matches');
    await knex.schema.dropTableIfExists('tournament_entry_members');
    await knex.schema.alterTable('tournaments', (table) => {
        table.dropForeign('winner_entry_id', 'tournaments_winner_entry');
    });
    await knex.schema.dropTableIfExists('tournament_entries');
    await knex.schema.dropTableIfExists('tournaments');
}
