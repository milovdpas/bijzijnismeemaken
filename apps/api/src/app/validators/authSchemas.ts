import { z } from 'zod';
import { AUTH, Locale } from '@bzim/types';

import { normalizeEmail } from '../utils/Normalize';

export const googleStartQuerySchema = z.object({
    returnTo: z.string().max(255).optional(),
});

/** Google sends `code` on success and `error` when the person cancelled. */
export const googleCallbackQuerySchema = z.object({
    state: z.string().min(1).max(64),
    code: z.string().min(1).optional(),
    error: z.string().optional(),
});

const email = z.string().transform(normalizeEmail).pipe(z.string().email().max(255));

/** Length only. A composition rule turns a good passphrase into a worse password. */
const password = z.string().min(AUTH.PASSWORD_MIN_LENGTH).max(AUTH.PASSWORD_MAX_LENGTH);

/** The value from an emailed link: base64url of 32 bytes. */
const emailToken = z.string().min(20).max(128);

export const registerSchema = z.object({
    email,
    password,
    locale: z.enum(Locale).optional(),
});

export const loginSchema = z.object({
    email,
    password: z.string().min(1).max(AUTH.PASSWORD_MAX_LENGTH),
});

export const emailOnlySchema = z.object({ email });

export const verifyEmailSchema = z.object({ token: emailToken });

export const resetPasswordSchema = z.object({ token: emailToken, password });
