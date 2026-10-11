import { Calculator, Dices, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ComponentType } from 'react';

import { DartsTool } from '@/components/tools/darts/darts-tool';
import { ScoreTool } from '@/components/tools/score/score-tool';
import { YahtzeeTool } from '@/components/tools/yahtzee/yahtzee-tool';
import { groupHref } from '@/lib/group-navigation';
import { parseDartsState } from '@/lib/tools/darts';
import { parseScoreState } from '@/lib/tools/score';
import { parseYahtzeeState } from '@/lib/tools/yahtzee';

/** What every tool gets: its group, to pick players from, and where its game is kept. */
export interface ToolProps {
    groupId: string;
    storageKey: string;
}

export interface ToolItem {
    /** The last segment of the tool's address. */
    key: string;
    icon: LucideIcon;
    labelKey: string;
    descriptionKey: string;
    component: ComponentType<ToolProps>;
    /** Whether what storage holds is a game somebody is in the middle of; the list says so. */
    inProgress: (stored: unknown) => boolean;
}

/**
 * The tools tab (task 44). A tool is one entry here, its components in
 * `components/tools/<key>/` and its logic, tested, in `lib/tools/<key>.ts`.
 * Each runs on one device and keeps its game in local storage, per group.
 */
export const TOOLS: readonly ToolItem[] = [
    {
        key: 'score',
        icon: Calculator,
        labelKey: 'tools.score.title',
        descriptionKey: 'tools.score.description',
        component: ScoreTool,
        inProgress: (stored) => (parseScoreState(stored)?.entries.length ?? 0) > 0,
    },
    {
        key: 'darts',
        icon: Target,
        labelKey: 'tools.darts.title',
        descriptionKey: 'tools.darts.description',
        component: DartsTool,
        inProgress: (stored) => parseDartsState(stored)?.phase === 'playing',
    },
    {
        key: 'yahtzee',
        icon: Dices,
        labelKey: 'tools.yahtzee.title',
        descriptionKey: 'tools.yahtzee.description',
        component: YahtzeeTool,
        inProgress: (stored) => parseYahtzeeState(stored)?.phase === 'playing',
    },
];

export function findTool(key: string): ToolItem | undefined {
    return TOOLS.find((tool) => tool.key === key);
}

export function toolHref(groupId: string, key?: string): string {
    const list = groupHref(groupId, 'tools');
    return key === undefined ? list : `${list}/${key}`;
}

/** One game per tool per group, on this device. */
export function toolStorageKey(groupId: string, key: string): string {
    return `bzim.tools.${groupId}.${key}`;
}
