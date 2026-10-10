import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS, GroupRole, OccurrenceStatus } from '@bzim/types';
import type { ActivityListingDto, LeaderboardDetailDto } from '@bzim/types';

import Activity from '../src/app/models/Activity.entity';
import Leaderboard from '../src/app/models/Leaderboard.entity';
import ActivityInterest from '../src/app/models/ActivityInterest.entity';
import ActivityOccurrence from '../src/app/models/ActivityOccurrence.entity';
import LeaderboardEditor from '../src/app/models/LeaderboardEditor.entity';
import LeaderboardMember from '../src/app/models/LeaderboardMember.entity';
import LeaderboardScoreHistory from '../src/app/models/LeaderboardScoreHistory.entity';
import OccurrenceParticipant from '../src/app/models/OccurrenceParticipant.entity';
import { mailer } from '../src/app/modules/mail';
import type { MailMessage } from '../src/app/modules/mail';
import { ScoreService } from '../src/app/services/ScoreService';
import { sessionFor } from './support/auth';
import { asUser, data } from './support/client';
import {
    seedActivity,
    seedGroup,
    seedInterest,
    seedLeaderboard,
    seedLeaderboardMember,
    seedMember,
    seedOccurrence,
    seedParticipant,
    seedUser,
} from './support/factories';

function outbox(): MailMessage[] {
    const sent: MailMessage[] = [];
    vi.spyOn(mailer, 'send').mockImplementation((message) => {
        sent.push(message);
        return Promise.resolve();
    });
    return sent;
}

afterEach(() => {
    vi.restoreAllMocks();
});

/**
 * Anna has an activity with a planned evening (Bob was told), is in for
 * Milo's activity and on the list for his planned evening, created a
 * leaderboard, is an editor on Milo's, is on both boards with a score she
 * entered. Then she leaves, or is removed.
 */
async function world() {
    const owner = await seedUser({ displayName: 'Milo' });
    const group = await seedGroup(owner);
    const anna = await seedUser({ displayName: 'Anna' });
    await seedMember(group, anna, GroupRole.ADMIN);
    const bob = await seedUser({ displayName: 'Bob', email: 'bob@example.test' });
    await seedMember(group, bob);

    const annas = await seedActivity(group, anna, { title: 'Annas avond' });
    const annasEvening = await seedOccurrence(annas, anna, { date: '2026-12-01' });
    const told = await seedParticipant(annasEvening, bob);
    told.notifiedAt = new Date();
    told.notifiedForDate = '2026-12-01';
    await told.save();
    await seedParticipant(annasEvening, anna);

    const milos = await seedActivity(group, owner, { title: 'Milos avond' });
    await seedInterest(milos, anna);
    const milosEvening = await seedOccurrence(milos, owner, { date: '2026-12-08' });
    await seedParticipant(milosEvening, anna);

    const annasBoard = await seedLeaderboard(group, anna);
    const milosBoard = await seedLeaderboard(group, owner);
    await LeaderboardEditor.create({ leaderboardId: milosBoard.id, userId: anna.id }).save();
    const annaOnMilos = await seedLeaderboardMember(milosBoard, anna);
    await ScoreService.set(milosBoard, annaOnMilos, anna, 10);

    const asOwner = asUser((await sessionFor(owner)).accessToken);
    const asAnna = asUser((await sessionFor(anna)).accessToken);
    return {
        owner,
        group,
        anna,
        bob,
        annas,
        annasEvening,
        milos,
        milosEvening,
        annasBoard,
        milosBoard,
        annaOnMilos,
        asOwner,
        asAnna,
    };
}

async function expectDetached(w: Awaited<ReturnType<typeof world>>, sent: MailMessage[]) {
    // Her activity: orphaned, hidden, its evening cancelled, Bob told.
    const annas = await Activity.findOneByOrFail({ id: w.annas.id });
    expect(annas).toMatchObject({
        createdById: null,
        creatorNameSnapshot: 'Anna',
        isActive: false,
    });
    expect((await ActivityOccurrence.findOneByOrFail({ id: w.annasEvening.id })).status).toBe(
        OccurrenceStatus.CANCELLED,
    );
    expect(sent.map((message) => message.to)).toEqual(['bob@example.test']);
    // Milo's untouched, but she is out of it.
    expect((await ActivityOccurrence.findOneByOrFail({ id: w.milosEvening.id })).status).toBe(
        OccurrenceStatus.PLANNED,
    );
    expect(await ActivityInterest.countBy({ userId: w.anna.id })).toBe(0);
    expect(await OccurrenceParticipant.countBy({ userId: w.anna.id })).toBe(0);
    // Boards: hers orphaned, her editor row gone, her member row and history line kept without her.
    const annasBoard = await Leaderboard.findOneByOrFail({ id: w.annasBoard.id });
    expect(annasBoard).toMatchObject({ createdById: null, creatorNameSnapshot: 'Anna' });
    expect(await LeaderboardEditor.countBy({ userId: w.anna.id })).toBe(0);
    const member = await LeaderboardMember.findOneByOrFail({ id: w.annaOnMilos.id });
    expect(member).toMatchObject({ userId: null, displayNameSnapshot: 'Anna', removedAt: null });
    const history = await LeaderboardScoreHistory.findOneByOrFail({ memberId: w.annaOnMilos.id });
    expect(history).toMatchObject({ changedById: null, changedByNameSnapshot: 'Anna' });

    // As the group sees it.
    const listing = data<ActivityListingDto[]>(
        await w.asOwner.get(API_ENDPOINTS.ACTIVITIES.LIST(w.group.id)),
    );
    expect(listing.map((activity) => activity.title)).toEqual(['Milos avond']);
    const board = data<LeaderboardDetailDto>(
        await w.asOwner.get(API_ENDPOINTS.LEADERBOARDS.DETAIL(w.group.id, w.milosBoard.id)),
    );
    expect(board.members.map((m) => [m.displayName, m.user])).toEqual([['Anna', null]]);
    expect(board.editors).toEqual([]);
}

describe('leaving a group', () => {
    it('detaches everything the leaver owned or was part of', async () => {
        const w = await world();
        const sent = outbox();
        expect((await w.asAnna.post(API_ENDPOINTS.GROUPS.LEAVE(w.group.id))).status).toBe(204);
        await expectDetached(w, sent);
    });
});

describe('being removed from a group', () => {
    it('detaches the same way', async () => {
        const w = await world();
        const sent = outbox();
        expect(
            (await w.asOwner.delete(API_ENDPOINTS.GROUPS.MEMBER(w.group.id, w.anna.id))).status,
        ).toBe(204);
        await expectDetached(w, sent);
    });
});
