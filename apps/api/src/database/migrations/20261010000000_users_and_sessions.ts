import type { Knex } from 'knex';

/**
 * Accounts and what keeps them signed in.
 *
 * Written for MySQL 8. Primary keys are `char(36)` with no database default;
 * TypeORM generates the UUID in the application. Every instant is a
 * `datetime(3)` holding UTC with the connection pinned to UTC.
 *
 * Indexes, uniques and ON DELETE rules live here and only here. The entities
 * describe columns for the query layer; this file is the schema's history.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('users', (table) => {
        table.uuid('id').primary();
        // Google's stable subject id. The email can change on their side; this
        // cannot, so it is what a Google login is matched on. Null for an
        // account that only has a password.
        table.string('google_sub', 64).nullable().unique();
        table.string('email', 255).notNullable().unique();
        // scrypt, self-describing (scrypt, N, r, p, salt, hash joined by `$`). Null for a
        // Google-only account; a reset link can add one later.
        table.string('password_hash', 255).nullable();
        // Set by a Google login (Google vouches for the address) or by the
        // verification link. A password account cannot sign in until it is set.
        table.datetime('email_verified_at', { precision: 3 }).nullable();
        // Null until onboarding is finished; unique because invites address a
        // user by it. The collation is case-insensitive and the API lowercases
        // before writing anyway.
        table.string('handle', 24).nullable().unique();
        table.string('display_name', 40).nullable();
        table.string('avatar_key', 32).nullable();
        table.string('locale', 2).notNullable().defaultTo('nl');
        table.boolean('auto_add_to_calendar').notNullable().defaultTo(false);
        table.boolean('notify_email_invites').notNullable().defaultTo(true);
        table.boolean('notify_email_planned').notNullable().defaultTo(true);
        table.boolean('notify_email_new_activity').notNullable().defaultTo(true);
        table.datetime('last_login_at', { precision: 3 }).nullable();
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.datetime('updated_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    });

    // One row per issued refresh token. The id doubles as the JWT `jti`, so a
    // presented token can be looked up and revoked. `family_id` ties a chain
    // of rotations together, so reuse of an old token revokes the whole chain.
    await knex.schema.createTable('refresh_tokens', (table) => {
        table.uuid('id').primary();
        table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.string('token_hash', 64).notNullable().unique();
        table.uuid('family_id').notNullable();
        table.datetime('expires_at', { precision: 3 }).notNullable();
        table.datetime('revoked_at', { precision: 3 }).nullable();
        table.uuid('replaced_by_id').nullable();
        table.string('user_agent', 255).nullable();
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.index(['user_id']);
        table.index(['family_id']);
        table.index(['expires_at']);
    });

    // One-time links sent by email: verify an address, reset a password. The
    // value is random and only its hash is stored, so a database read cannot
    // be turned into a working link. Swept by the cleanup job.
    await knex.schema.createTable('email_tokens', (table) => {
        table.uuid('id').primary();
        table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.string('purpose', 16).notNullable();
        table.string('token_hash', 64).notNullable().unique();
        table.datetime('expires_at', { precision: 3 }).notNullable();
        table.datetime('used_at', { precision: 3 }).nullable();
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.index(['user_id']);
        table.index(['expires_at']);
    });

    // Short-lived state for an OAuth round trip (login, or connecting a
    // calendar). Stored rather than cookie-only so the callback can also check
    // which user started the flow. Swept by the cleanup job.
    await knex.schema.createTable('oauth_states', (table) => {
        table.uuid('id').primary();
        table.string('state', 64).notNullable().unique();
        table.string('purpose', 16).notNullable();
        table.uuid('user_id').nullable().references('id').inTable('users').onDelete('CASCADE');
        table.string('return_to', 255).nullable();
        table.datetime('expires_at', { precision: 3 }).notNullable();
        table.datetime('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
        table.index(['expires_at']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('oauth_states');
    await knex.schema.dropTableIfExists('email_tokens');
    await knex.schema.dropTableIfExists('refresh_tokens');
    await knex.schema.dropTableIfExists('users');
}
