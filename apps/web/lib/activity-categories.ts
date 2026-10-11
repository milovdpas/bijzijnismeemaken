import {
    Dumbbell,
    House,
    Medal,
    PartyPopper,
    Plane,
    Sparkles,
    TreePine,
    UtensilsCrossed,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ActivityCategory } from '@bzim/types';

/** One icon per category, so a list of ideas reads at a glance. The label comes from i18n. */
export const CATEGORY_ICONS: Record<ActivityCategory, LucideIcon> = {
    [ActivityCategory.EVENT]: PartyPopper,
    [ActivityCategory.HOME]: House,
    [ActivityCategory.OUTDOORS]: TreePine,
    [ActivityCategory.SPORTS]: Dumbbell,
    [ActivityCategory.FOOD_AND_DRINKS]: UtensilsCrossed,
    [ActivityCategory.TRIP]: Plane,
    [ActivityCategory.TOURNAMENT]: Medal,
    [ActivityCategory.OTHER]: Sparkles,
};

/** Picker order: the common ones first, "other" last. */
export const CATEGORY_ORDER: readonly ActivityCategory[] = [
    ActivityCategory.EVENT,
    ActivityCategory.HOME,
    ActivityCategory.OUTDOORS,
    ActivityCategory.SPORTS,
    ActivityCategory.FOOD_AND_DRINKS,
    ActivityCategory.TRIP,
    ActivityCategory.TOURNAMENT,
    ActivityCategory.OTHER,
];
