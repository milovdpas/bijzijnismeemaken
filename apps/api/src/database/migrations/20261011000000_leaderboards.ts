import type { Knex } from 'knex';

/**
 * Leaderboards, who is on them, who may edit them, and the scores.
 *
 * Scores live in three tables, one per period, each holding the same value
 * written through on entry (docs/03): a ranking is one indexed read, never a
 * rollup. `leaderboard_members` is its own row so a score survives the
 * person leaving the group (user_id SET NULL, snapshots filled), and
 * `removed_at` keeps a removed member's history without their rank.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('leaderboards', (table) => {
        table.uuid('id').primary();
        table.uuid('group_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
        table
            .uuid('created_by_id')
            .nullable()
            .references('id')
            .inTable('users')
            .onDelete('SET NULL');
        table.string('creator_name_snapshot', 40).nullable();
        table.string('name', 60).notNullable();
        table.text('description').nullable();
        table.string('score_type', 8).notNullable();
        table.string('sort_order', 4).notNullable();
        table.string('edit_mode', 8).notNullable();
        table.boolean('show_monthly').notNullable().defaultTo(true);
        table.boolean('show_yearly').notNullable().defaultTo(true);
        table.boolean('show_all_time').notNullable().defaultTo(true);
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.datetime('updated_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.index(['group_id']);
    });

    await knex.schema.createTable('leaderboard_editors', (table) => {
        table.uuid('id').primary();
        table
            .uuid('leaderboard_id')
            .notNullable()
            .references('id')
            .inTable('leaderboards')
            .onDelete('CASCADE');
        table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.unique(['leaderboard_id', 'user_id'], 'lb_editors_unique');
    });

    await knex.schema.createTable('leaderboard_members', (table) => {
        table.uuid('id').primary();
        table
            .uuid('leaderboard_id')
            .notNullable()
            .references('id')
            .inTable('leaderboards')
            .onDelete('CASCADE');
        table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
        table.string('display_name_snapshot', 40).notNullable();
        table.string('avatar_key_snapshot', 32).notNullable();
        table.uuid('added_by_id').nullable().references('id').inTable('users').onDelete('SET NULL');
        table.datetime('removed_at', { precision: 3 }).nullable();
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.unique(['leaderboard_id', 'user_id'], 'lb_members_unique');
        table.index(['leaderboard_id', 'removed_at'], 'lb_members_active');
    });

    const scoreColumns = (table: Knex.CreateTableBuilder) => {
        table.uuid('id').primary();
        table
            .uuid('leaderboard_id')
            .notNullable()
            .references('id')
            .inTable('leaderboards')
            .onDelete('CASCADE');
        table
            .uuid('member_id')
            .notNullable()
            .references('id')
            .inTable('leaderboard_members')
            .onDelete('CASCADE');
    };
    const scoreTail = (table: Knex.CreateTableBuilder) => {
        table.decimal('score', 16, 3).notNullable();
        table
            .uuid('updated_by_id')
            .nullable()
            .references('id')
            .inTable('users')
            .onDelete('SET NULL');
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.datetime('updated_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    };

    await knex.schema.createTable('leaderboard_scores_monthly', (table) => {
        scoreColumns(table);
        table.smallint('year').notNullable();
        table.tinyint('month').notNullable();
        scoreTail(table);
        // Explicit names: MySQL caps identifiers at 64 characters, and the generated ones overflow.
        table.unique(['leaderboard_id', 'member_id', 'year', 'month'], 'lb_scores_monthly_unique');
        table.index(['leaderboard_id', 'year', 'month', 'score'], 'lb_scores_monthly_rank');
    });

    await knex.schema.createTable('leaderboard_scores_yearly', (table) => {
        scoreColumns(table);
        table.smallint('year').notNullable();
        scoreTail(table);
        table.unique(['leaderboard_id', 'member_id', 'year'], 'lb_scores_yearly_unique');
        table.index(['leaderboard_id', 'year', 'score'], 'lb_scores_yearly_rank');
    });

    await knex.schema.createTable('leaderboard_scores_total', (table) => {
        scoreColumns(table);
        scoreTail(table);
        table.unique(['leaderboard_id', 'member_id'], 'lb_scores_total_unique');
        table.index(['leaderboard_id', 'score'], 'lb_scores_total_rank');
    });

    await knex.schema.createTable('leaderboard_score_history', (table) => {
        table.uuid('id').primary();
        table
            .uuid('leaderboard_id')
            .notNullable()
            .references('id')
            .inTable('leaderboards')
            .onDelete('CASCADE');
        table
            .uuid('member_id')
            .notNullable()
            .references('id')
            .inTable('leaderboard_members')
            .onDelete('CASCADE');
        table
            .uuid('changed_by_id')
            .nullable()
            .references('id')
            .inTable('users')
            .onDelete('SET NULL');
        table.string('changed_by_name_snapshot', 40).notNullable();
        table.decimal('old_score', 16, 3).nullable();
        // NULL = cleared or removed.
        table.decimal('new_score', 16, 3).nullable();
        table.smallint('year').notNullable();
        table.tinyint('month').notNullable();
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.index(['leaderboard_id', 'created_at'], 'lb_history_recent');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('leaderboard_score_history');
    await knex.schema.dropTableIfExists('leaderboard_scores_total');
    await knex.schema.dropTableIfExists('leaderboard_scores_yearly');
    await knex.schema.dropTableIfExists('leaderboard_scores_monthly');
    await knex.schema.dropTableIfExists('leaderboard_members');
    await knex.schema.dropTableIfExists('leaderboard_editors');
    await knex.schema.dropTableIfExists('leaderboards');
}
