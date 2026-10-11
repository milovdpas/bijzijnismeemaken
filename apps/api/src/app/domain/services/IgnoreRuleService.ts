import { CalendarIgnoreRuleKind } from '@bzim/types';

import CalendarIgnoreRule from '../models/CalendarIgnoreRule.entity';
import type User from '../models/User.entity';

/**
 * Which synced events a person does not want counted (docs/06): every event
 * with a title, or every instance of a series. A title is matched lowercased
 * and trimmed, so the stored value is already in that form.
 */
export class IgnoreRuleService {
    static list(user: User): Promise<CalendarIgnoreRule[]> {
        return CalendarIgnoreRule.find({
            where: { userId: user.id },
            order: { createdAt: 'DESC' },
        });
    }

    /** The same rule twice is one rule: the existing row comes back. */
    static async add(
        user: User,
        kind: CalendarIgnoreRuleKind,
        value: string,
        label: string,
    ): Promise<{ rule: CalendarIgnoreRule; created: boolean }> {
        const normalised = IgnoreRuleService.normalise(kind, value);
        const existing = await CalendarIgnoreRule.findOneBy({
            userId: user.id,
            kind,
            value: normalised,
        });
        if (existing !== null) {
            return { rule: existing, created: false };
        }
        const rule = await CalendarIgnoreRule.create({
            userId: user.id,
            kind,
            value: normalised,
            label,
        }).save();
        return { rule, created: true };
    }

    static async remove(user: User, ruleId: string): Promise<boolean> {
        const result = await CalendarIgnoreRule.delete({ id: ruleId, userId: user.id });
        return (result.affected ?? 0) > 0;
    }

    /** The form the matcher compares against: titles case-insensitively, series ids as they are. */
    static normalise(kind: CalendarIgnoreRuleKind, value: string): string {
        return kind === CalendarIgnoreRuleKind.TITLE ? value.trim().toLowerCase() : value.trim();
    }
}
