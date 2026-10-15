import { Between, Raw } from 'typeorm';
import type { Daypart, IsoDateString, UnavailabilityRuleInput, Weekday } from '@bzim/types';

import ManualUnavailability from '../models/ManualUnavailability.entity';
import type User from '../models/User.entity';
import WeeklyUnavailabilityRule from '../models/WeeklyUnavailabilityRule.entity';
import { weekdayOf } from '../utils/Dates';

export type AddBlockResult = { ok: true } | { ok: false; problem: 'NO_RULE' };

/**
 * What a person says about their own time. Self-managed only: there is no
 * "mark Anna busy" for anyone else, by decision.
 */
export class UnavailabilityService {
    static listBlocks(
        user: User,
        from: IsoDateString,
        to: IsoDateString,
    ): Promise<ManualUnavailability[]> {
        return ManualUnavailability.find({
            where: { userId: user.id, date: Between(from, to) },
            order: { date: 'ASC' },
        });
    }

    /**
     * Blocks a daypart, or with `free` frees it from a weekly rule, for one
     * date. Setting the same twice is fine; the other replaces it. One
     * upsert on the (user, date, daypart) key, so two taps that arrive at
     * once cannot both insert. Only a daypart a weekly rule makes busy that
     * date can be freed: a free row anywhere else would do nothing now and
     * quietly free a rule added later.
     */
    static async addBlock(
        user: User,
        date: IsoDateString,
        daypart: Daypart,
        free: boolean,
    ): Promise<AddBlockResult> {
        if (free) {
            const weekday = weekdayOf(date);
            const rules = await WeeklyUnavailabilityRule.findBy({
                userId: user.id,
                weekday,
                daypart,
            });
            if (!rules.some((rule) => rule.appliesOn(date, weekday))) {
                return { ok: false, problem: 'NO_RULE' };
            }
        }
        await ManualUnavailability.upsert({ userId: user.id, date, daypart, free }, [
            'userId',
            'date',
            'daypart',
        ]);
        return { ok: true };
    }

    static async removeBlock(user: User, date: IsoDateString, daypart: Daypart): Promise<void> {
        await ManualUnavailability.delete({ userId: user.id, date, daypart });
    }

    static listRules(user: User): Promise<WeeklyUnavailabilityRule[]> {
        return WeeklyUnavailabilityRule.find({
            where: { userId: user.id },
            order: { weekday: 'ASC', daypart: 'ASC' },
        });
    }

    static createRule(
        user: User,
        input: UnavailabilityRuleInput,
    ): Promise<WeeklyUnavailabilityRule> {
        return WeeklyUnavailabilityRule.create({
            userId: user.id,
            weekday: input.weekday,
            daypart: input.daypart,
            validFrom: input.validFrom ?? null,
            validUntil: input.validUntil ?? null,
        }).save();
    }

    /** The caller's own rule, or null; nobody edits somebody else's. */
    static findRule(user: User, ruleId: string): Promise<WeeklyUnavailabilityRule | null> {
        return WeeklyUnavailabilityRule.findOneBy({ id: ruleId, userId: user.id });
    }

    /**
     * A rule moved to another weekday or daypart drops the dates freed from
     * it, unless another rule for that weekday and daypart remains.
     */
    static async updateRule(
        rule: WeeklyUnavailabilityRule,
        patch: Partial<UnavailabilityRuleInput>,
    ): Promise<WeeklyUnavailabilityRule> {
        const { weekday, daypart } = rule;
        if (patch.weekday !== undefined) rule.weekday = patch.weekday;
        if (patch.daypart !== undefined) rule.daypart = patch.daypart;
        if (patch.validFrom !== undefined) rule.validFrom = patch.validFrom;
        if (patch.validUntil !== undefined) rule.validUntil = patch.validUntil;
        const saved = await rule.save();
        if (saved.weekday !== weekday || saved.daypart !== daypart) {
            await UnavailabilityService.forgetFreedDays(saved.userId, weekday, daypart);
        }
        return saved;
    }

    static async deleteRule(rule: WeeklyUnavailabilityRule): Promise<void> {
        const { userId, weekday, daypart } = rule;
        await rule.remove();
        await UnavailabilityService.forgetFreedDays(userId, weekday, daypart);
    }

    /**
     * A date freed from a weekly rule means nothing once no rule for that
     * weekday and daypart is left, and would quietly free a rule added later.
     * So those rows go with the last such rule.
     */
    private static async forgetFreedDays(
        userId: string,
        weekday: Weekday,
        daypart: Daypart,
    ): Promise<void> {
        if (await WeeklyUnavailabilityRule.existsBy({ userId, weekday, daypart })) return;
        await ManualUnavailability.delete({
            userId,
            daypart,
            free: true,
            // MySQL counts Monday as 0, the app from 1.
            date: Raw((column) => `WEEKDAY(${column}) + 1 = :weekday`, { weekday }),
        });
    }
}
