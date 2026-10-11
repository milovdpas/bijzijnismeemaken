import { z } from 'zod';
import { AUTH, Locale, NotificationType, PROFILE, isAvatarKey } from '@bzim/types';
import type { AvatarKey } from '@bzim/types';

import { normalizeHandle } from '../../domain/utils/Normalize';

export const setupStepParamSchema = z.object({
    step: z.enum(['calendar', 'availability']),
});

/** Normalised before the pattern runs, so `Milo` and `milo` are the same handle. */
export const handleSchema = z
    .string()
    .transform(normalizeHandle)
    .pipe(
        z
            .string()
            .min(PROFILE.HANDLE_MIN_LENGTH)
            .max(PROFILE.HANDLE_MAX_LENGTH)
            .regex(PROFILE.HANDLE_PATTERN, 'Only lowercase letters, digits and underscores'),
    );

export const updateMeSchema = z
    .object({
        handle: handleSchema,
        displayName: z.string().trim().min(1).max(PROFILE.DISPLAY_NAME_MAX_LENGTH),
        /** A built-in icon, or a generated `style:seed` (`parseAvatarKey` in @bzim/types). */
        avatarKey: z.custom<AvatarKey>(isAvatarKey, 'Not an avatar'),
        locale: z.enum(Locale),
        autoAddToCalendar: z.boolean(),
    })
    .partial()
    .refine((body) => Object.keys(body).length > 0, 'At least one field is required');

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1).max(AUTH.PASSWORD_MAX_LENGTH).optional(),
    newPassword: z.string().min(AUTH.PASSWORD_MIN_LENGTH).max(AUTH.PASSWORD_MAX_LENGTH),
});

export const handleAvailableQuerySchema = z.object({
    /** Loose here on purpose: an invalid handle answers `available: false`, not 422. */
    handle: z.string().trim().min(1).max(64),
});

export const searchUsersQuerySchema = z.object({
    q: z.string().transform(normalizeHandle).pipe(z.string().min(2).max(PROFILE.HANDLE_MAX_LENGTH)),
});

export const notificationTypeParamSchema = z.object({
    type: z.enum(NotificationType),
});

export const notificationSettingSchema = z.object({
    email: z.boolean(),
    push: z.boolean(),
});
