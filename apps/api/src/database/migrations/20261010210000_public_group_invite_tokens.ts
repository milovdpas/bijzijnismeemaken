import { randomBytes } from 'node:crypto';
import type { Knex } from 'knex';

/**
 * Public groups carry an invite link from now on, so members can hand a
 * friend a link instead of a search. Groups created before this had none;
 * this mints one for each. Self-contained: the token format (32 random
 * bytes, base64url, 43 characters) is repeated here on purpose, because a
 * migration must never import application code.
 */
export async function up(knex: Knex): Promise<void> {
    const groups = await knex<{ id: string; access: string; invite_token: string | null }>('groups')
        .select('id')
        .where({ access: 'public' })
        .whereNull('invite_token');
    for (const group of groups) {
        await knex('groups')
            .where({ id: group.id })
            .update({ invite_token: randomBytes(32).toString('base64url') });
    }
}

export async function down(knex: Knex): Promise<void> {
    await knex('groups').where({ access: 'public' }).update({ invite_token: null });
}
