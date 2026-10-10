import { WidgetType } from '@bzim/types';
import { CalendarClock, Lightbulb, Link2, Sparkles, StickyNote, Trophy } from 'lucide-react';
import type { ComponentType } from 'react';

/** One icon per widget type, for the frames and the "add widget" sheet. */
export const WIDGET_ICONS: Record<WidgetType, ComponentType<{ className?: string }>> = {
    [WidgetType.UPCOMING]: CalendarClock,
    [WidgetType.IDEAS]: Lightbulb,
    [WidgetType.LEADERBOARD]: Trophy,
    [WidgetType.NOTE]: StickyNote,
    [WidgetType.ACTIVITY]: Sparkles,
    [WidgetType.LINK]: Link2,
};
