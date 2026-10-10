import type { Knex } from 'knex';

/**
 * Groups, who is in them, and who has been asked.
 *
 * `groups.owner_id` is RESTRICT rather than CASCADE on purpose: deleting a
 * user who still owns a group is refused by the API (`OWNER_MUST_TRANSFER`),
 * and the database says the same thing if anything ever bypasses that check.
 * Membership and invite rows go with their group and with their user.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('groups', (table) => {
        table.uuid('id').primary();
        table.string('name', 60).notNullable();
        // Cosmetic, for the invite link; the token is what is looked up.
        table.string('slug', 80).notNullable();
        table.text('description').nullable();
        table.string('access', 16).notNullable();
        table.string('invite_token', 43).nullable().unique();
        table.uuid('owner_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.datetime('updated_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.index(['access', 'name']);
        table.index(['owner_id']);
    });

    await knex.schema.createTable('group_members', (table) => {
        table.uuid('id').primary();
        table.uuid('group_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
        table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.string('role', 8).notNullable();
        table.datetime('joined_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.unique(['group_id', 'user_id']);
        table.index(['user_id']);
    });

    // Pending invites only: a row is deleted when accepted, declined or
    // cancelled, so "is there an invite" is "is there a row".
    await knex.schema.createTable('group_invites', (table) => {
        table.uuid('id').primary();
        table.uuid('group_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
        table
            .uuid('invited_user_id')
            .notNullable()
            .references('id')
            .inTable('users')
            .onDelete('CASCADE');
        table
            .uuid('invited_by_id')
            .nullable()
            .references('id')
            .inTable('users')
            .onDelete('SET NULL');
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.unique(['group_id', 'invited_user_id']);
        table.index(['invited_user_id']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('group_invites');
    await knex.schema.dropTableIfExists('group_members');
    await knex.schema.dropTableIfExists('groups');
}
