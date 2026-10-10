import { Between } from 'typeorm';
import type { Daypart, IsoDateString, UnavailabilityRuleInput } from '@bzim/types';

import ManualUnavailability from '../models/ManualUnavailability.entity';
import type User from '../models/User.entity';
import WeeklyUnavailabilityRule from '../models/WeeklyUnavailabilityRule.entity';

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

    /** Blocking a daypart twice is fine: the row exists either way. */
    static async addBlock(user: User, date: IsoDateString, daypart: Daypart): Promise<void> {
        if (await ManualUnavailability.existsBy({ userId: user.id, date, daypart })) {
            return;
        }
        await ManualUnavailability.create({ userId: user.id, date, daypart }).save();
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

    static updateRule(
        rule: WeeklyUnavailabilityRule,
        patch: Partial<UnavailabilityRuleInput>,
    ): Promise<WeeklyUnavailabilityRule> {
        if (patch.weekday !== undefined) rule.weekday = patch.weekday;
        if (patch.daypart !== undefined) rule.daypart = patch.daypart;
        if (patch.validFrom !== undefined) rule.validFrom = patch.validFrom;
        if (patch.validUntil !== undefined) rule.validUntil = patch.validUntil;
        return rule.save();
    }

    static async deleteRule(rule: WeeklyUnavailabilityRule): Promise<void> {
        await rule.remove();
    }
}
