import { AUTH, Locale } from '@bzim/types';

import type { MailMessage } from '../Mailer';
import { en } from './en';
import type { MailDict } from './en';
import { nl } from './nl';

const DICTS: Record<Locale, MailDict> = { [Locale.EN]: en, [Locale.NL]: nl };

/** `{{name}}` placeholders, the same syntax the web app's i18n uses. */
function fill(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => String(values[key] ?? ''));
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * One layout for every email: yellow band with the app name, ink text, one
 * yellow button. Inline styles, because email clients ignore everything else.
 */
function layout(
    dict: MailDict,
    parts: { intro: string; button: string; link: string; expiry: string },
): Pick<MailMessage, 'html' | 'text'> {
    const link = escapeHtml(parts.link);
    const html = `<!doctype html>
<html><body style="margin:0;background:#faf8f2;font-family:Nunito,Arial,sans-serif;color:#223074">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#ffc72c;padding:16px 24px;font-weight:700;font-size:18px">${escapeHtml(dict.common.appName)}</td></tr>
<tr><td style="padding:24px;font-size:16px;line-height:1.5">
<p style="margin:0 0 12px">${escapeHtml(dict.common.greeting)}</p>
<p style="margin:0 0 20px">${escapeHtml(parts.intro)}</p>
<p style="margin:0 0 20px"><a href="${link}" style="display:inline-block;background:#ffc72c;color:#223074;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px">${escapeHtml(parts.button)}</a></p>
<p style="margin:0 0 12px;font-size:14px;color:#5b6690">${escapeHtml(parts.expiry)}</p>
<p style="margin:0 0 4px;font-size:13px;color:#5b6690">${escapeHtml(dict.common.linkFallback)}</p>
<p style="margin:0 0 20px;font-size:13px;word-break:break-all"><a href="${link}" style="color:#223074">${link}</a></p>
<p style="margin:0;font-size:13px;color:#5b6690">${escapeHtml(dict.common.ignore)}</p>
</td></tr></table></td></tr></table></body></html>`;

    const text = [
        dict.common.greeting,
        '',
        parts.intro,
        '',
        `${parts.button}: ${parts.link}`,
        '',
        parts.expiry,
        dict.common.ignore,
    ].join('\n');

    return { html, text };
}

export function renderVerifyEmail(locale: Locale, to: string, link: string): MailMessage {
    const dict = DICTS[locale];
    return {
        to,
        subject: dict.verifyEmail.subject,
        ...layout(dict, {
            intro: dict.verifyEmail.intro,
            button: dict.verifyEmail.button,
            link,
            expiry: fill(dict.verifyEmail.expiry, { hours: AUTH.VERIFY_EMAIL_HOURS }),
        }),
    };
}

export function renderResetPassword(locale: Locale, to: string, link: string): MailMessage {
    const dict = DICTS[locale];
    return {
        to,
        subject: dict.resetPassword.subject,
        ...layout(dict, {
            intro: dict.resetPassword.intro,
            button: dict.resetPassword.button,
            link,
            expiry: fill(dict.resetPassword.expiry, { minutes: AUTH.RESET_PASSWORD_MINUTES }),
        }),
    };
}

export function renderGroupInvite(
    locale: Locale,
    to: string,
    values: { inviter: string; group: string; link: string },
): MailMessage {
    const dict = DICTS[locale];
    const names = { inviter: values.inviter, group: values.group };
    return {
        to,
        subject: fill(dict.groupInvite.subject, names),
        ...layout(dict, {
            intro: fill(dict.groupInvite.intro, names),
            button: dict.groupInvite.button,
            link: values.link,
            expiry: dict.groupInvite.expiry,
        }),
    };
}

export function renderActivityCreated(
    locale: Locale,
    to: string,
    values: { creator: string; group: string; title: string; link: string },
): MailMessage {
    const dict = DICTS[locale];
    const names = { creator: values.creator, group: values.group, title: values.title };
    return {
        to,
        subject: fill(dict.activityCreated.subject, names),
        ...layout(dict, {
            intro: fill(dict.activityCreated.intro, names),
            button: dict.activityCreated.button,
            link: values.link,
            expiry: dict.activityCreated.expiry,
        }),
    };
}
