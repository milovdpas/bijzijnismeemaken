import type { EntityManager } from 'typeorm';
import { WIDGETS, WidgetType } from '@bzim/types';
import type { WidgetSpec } from '@bzim/types';

import Activity from '../models/Activity.entity';
import type Group from '../models/Group.entity';
import GroupWidget from '../models/GroupWidget.entity';
import Leaderboard from '../models/Leaderboard.entity';
import type User from '../models/User.entity';

export type WidgetResult =
    { ok: true; widget: GroupWidget } | { ok: false; problem: 'TOO_MANY' | 'TARGET_NOT_FOUND' };

/** What every new group starts with (docs/01 §1.5b); "restore defaults" puts back whichever is missing. */
const DEFAULTS: WidgetSpec[] = [
    { type: WidgetType.UPCOMING, config: { weeks: WIDGETS.UPCOMING_WEEKS_DEFAULT } },
    { type: WidgetType.IDEAS, config: { limit: WIDGETS.LIMIT_DEFAULT } },
];

/**
 * The dashboard: an ordered list of widgets per group. This only keeps the
 * list and each widget's config; the screen fetches each widget's data
 * through the endpoints that already exist. A widget pointing at a
 * leaderboard or an activity goes when its target goes, through
 * `removeForTarget`, since the id lives in JSON and no foreign key can.
 */
export class WidgetService {
    static list(group: Group): Promise<GroupWidget[]> {
        return GroupWidget.find({
            where: { groupId: group.id },
            order: { position: 'ASC', id: 'ASC' },
        });
    }

    static findForGroup(group: Group, widgetId: string): Promise<GroupWidget | null> {
        return GroupWidget.findOneBy({ id: widgetId, groupId: group.id });
    }

    /**
     * Appended at the end. The target of a leaderboard or activity widget
     * must be the group's own, and a leaderboard one not private.
     */
    static async add(group: Group, user: User, spec: WidgetSpec): Promise<WidgetResult> {
        if ((await GroupWidget.countBy({ groupId: group.id })) >= WIDGETS.MAX_PER_GROUP) {
            return { ok: false, problem: 'TOO_MANY' };
        }
        if (!(await WidgetService.targetExists(group, spec))) {
            return { ok: false, problem: 'TARGET_NOT_FOUND' };
        }
        const last = await GroupWidget.findOne({
            where: { groupId: group.id },
            order: { position: 'DESC' },
        });
        const widget = await GroupWidget.create({
            groupId: group.id,
            type: spec.type,
            config: spec.config,
            position: last === null ? 0 : last.position + 1,
            createdById: user.id,
        }).save();
        return { ok: true, widget };
    }

    /** A new config for the same type; the controller has checked it against that type. */
    static async update(
        group: Group,
        widget: GroupWidget,
        spec: WidgetSpec,
    ): Promise<WidgetResult> {
        if (!(await WidgetService.targetExists(group, spec))) {
            return { ok: false, problem: 'TARGET_NOT_FOUND' };
        }
        widget.config = spec.config;
        await widget.save();
        return { ok: true, widget };
    }

    static async remove(widget: GroupWidget): Promise<void> {
        await widget.remove();
    }

    /** The full order. False when the ids are not exactly the group's widgets. */
    static async reorder(group: Group, widgetIds: string[]): Promise<boolean> {
        const widgets = await WidgetService.list(group);
        const ids = new Set(widgets.map((widget) => widget.id));
        if (widgetIds.length !== ids.size || !widgetIds.every((id) => ids.has(id))) {
            return false;
        }
        const byId = new Map(widgets.map((widget) => [widget.id, widget]));
        await GroupWidget.save(
            widgetIds.flatMap((id, position) => {
                const widget = byId.get(id);
                if (widget === undefined) return [];
                widget.position = position;
                return [widget];
            }),
        );
        return true;
    }

    /** Appends every default type the group no longer has. Returns the list afterwards. */
    static async restoreDefaults(group: Group, user: User): Promise<GroupWidget[]> {
        const present = new Set((await WidgetService.list(group)).map((widget) => widget.type));
        for (const spec of DEFAULTS.filter((candidate) => !present.has(candidate.type))) {
            await WidgetService.add(group, user, spec);
        }
        return WidgetService.list(group);
    }

    /** The default rows for a brand-new group, inside the creation transaction. */
    static async seedDefaults(manager: EntityManager, group: Group): Promise<void> {
        await manager.save(
            DEFAULTS.map((spec, position) =>
                manager.create(GroupWidget, {
                    groupId: group.id,
                    type: spec.type,
                    config: spec.config,
                    position,
                    createdById: null,
                }),
            ),
        );
    }

    /** When a leaderboard or an activity is deleted, the widgets that showed it go with it. */
    static async removeForTarget(
        type: WidgetType.LEADERBOARD | WidgetType.ACTIVITY,
        targetId: string,
    ): Promise<void> {
        const key = type === WidgetType.LEADERBOARD ? '$.leaderboardId' : '$.activityId';
        await GroupWidget.createQueryBuilder()
            .delete()
            .where('type = :type', { type })
            .andWhere('JSON_UNQUOTE(JSON_EXTRACT(config, :key)) = :targetId', { key, targetId })
            .execute();
    }

    private static async targetExists(group: Group, spec: WidgetSpec): Promise<boolean> {
        switch (spec.type) {
            case WidgetType.LEADERBOARD:
                // The dashboard is the whole group's; a private board is not.
                return Leaderboard.existsBy({
                    id: spec.config.leaderboardId,
                    groupId: group.id,
                    isPrivate: false,
                });
            case WidgetType.ACTIVITY:
                return Activity.existsBy({ id: spec.config.activityId, groupId: group.id });
            default:
                return true;
        }
    }
}
