import crypto from 'node:crypto';
import type { Knex } from 'knex';

/**
 * Encrypts `users.email` at rest and adds `email_hash`, a keyed blind index,
 * because an encrypted column cannot be searched or made unique.
 *
 * Existing rows are rewritten in place, so this needs `APP_KEY` to be the one
 * the application will run with. Rows written after this migration go through
 * the entity, which encrypts and hashes on every insert and update.
 *
 * Self-contained on purpose. A migration is frozen history: it must produce
 * the same bytes in a year as today, even if `utils/Crypt.ts` changes, so the
 * payload format (`{ iv, value, mac }`, AES-256-CBC, HMAC-SHA256 over iv +
 * ciphertext) is spelled out here rather than imported. The test runner also
 * loads migrations without the TypeScript transform, so app imports would
 * not resolve there anyway.
 *
 * One statement per step. MySQL DDL is not transactional, and a multi-step
 * `alterTable` that fails halfway leaves the table in a state neither `up`
 * nor `down` recognises.
 */
export async function up(knex: Knex): Promise<void> {
    const key = appKey();

    await knex.schema.alterTable('users', (table) => {
        table.dropUnique(['email']);
    });
    await knex.schema.alterTable('users', (table) => {
        table.text('email').notNullable().alter();
    });
    await knex.schema.alterTable('users', (table) => {
        table.string('email_hash', 64).nullable().after('email');
    });

    const rows: { id: string; email: string }[] = await knex('users').select('id', 'email');
    for (const row of rows) {
        await knex('users')
            .where({ id: row.id })
            .update({ email: encrypt(key, row.email), email_hash: searchHash(key, row.email) });
    }

    await knex.schema.alterTable('users', (table) => {
        table.string('email_hash', 64).notNullable().alter();
    });
    await knex.schema.alterTable('users', (table) => {
        table.unique(['email_hash']);
    });
}

export async function down(knex: Knex): Promise<void> {
    const key = appKey();

    const rows: { id: string; email: string }[] = await knex('users').select('id', 'email');
    for (const row of rows) {
        await knex('users')
            .where({ id: row.id })
            .update({ email: decrypt(key, row.email) });
    }

    await knex.schema.alterTable('users', (table) => {
        table.dropUnique(['email_hash']);
    });
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('email_hash');
    });
    await knex.schema.alterTable('users', (table) => {
        table.string('email', 255).notNullable().alter();
    });
    await knex.schema.alterTable('users', (table) => {
        table.unique(['email']);
    });
}

function appKey(): Buffer {
    const raw = (process.env.APP_KEY ?? '').replace(/^base64:/, '');
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) {
        throw new Error('APP_KEY must be set to 32 base64 bytes before this migration can run.');
    }
    return key;
}

function hmac(key: Buffer, data: string): string {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
}

function encrypt(key: Buffer, value: string): string {
    const iv = crypto.randomBytes(16);
    const base64Iv = iv.toString('base64');
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(value, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const payload = { iv: base64Iv, value: encrypted, mac: hmac(key, base64Iv + encrypted) };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function decrypt(key: Buffer, payload: string): string {
    const parsed = JSON.parse(Buffer.from(payload, 'base64').toString()) as {
        iv: string;
        value: string;
        mac: string;
    };
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(parsed.iv, 'base64'));
    let decrypted = decipher.update(parsed.value, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

function searchHash(key: Buffer, value: string): string {
    return hmac(key, value.trim().toLowerCase());
}
