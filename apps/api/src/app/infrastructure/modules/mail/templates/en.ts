/**
 * English copy for every email. `nl.ts` is typed against this, so a string
 * added here without a Dutch counterpart is a compile error.
 */
export const en = {
    common: {
        appName: 'Bij zijn is meemaken',
        greeting: 'Hi,',
        ignore: 'If this was not you, you can ignore this email.',
        linkFallback: 'If the button does not work, copy this link into your browser:',
        atLocation: ' at {{location}}',
    },
    verifyEmail: {
        subject: 'Confirm your email address',
        intro: 'Thanks for signing up. Click the button to confirm this address and sign in.',
        button: 'Confirm email',
        expiry: 'The link works for {{hours}} hours.',
    },
    groupInvite: {
        subject: '{{inviter}} invited you to {{group}}',
        intro: '{{inviter}} would like you to join the group "{{group}}". Open the app to accept or decline.',
        button: 'See the invitation',
        expiry: 'The invitation stays open until you answer it.',
    },
    dayparts: {
        morning: 'morning',
        afternoon: 'afternoon',
        evening: 'evening',
    },
    activityPlanned: {
        subject: '{{title}} is on: {{when}}',
        intro: '{{planner}} planned "{{title}}" with {{group}} for {{when}}{{where}}. You are in.',
        button: 'Add to my calendar',
        google: 'Add to Google Calendar',
        expiry: 'The first button downloads a calendar file; the second opens Google Calendar.',
    },
    activityRescheduled: {
        subject: '{{title}} moved to {{when}}',
        intro: '"{{title}}" with {{group}} now takes place on {{when}}{{where}}. Update your calendar.',
        button: 'Add the new time to my calendar',
        google: 'Add to Google Calendar',
        expiry: 'This replaces the earlier invitation for this activity.',
    },
    activityCancelled: {
        subject: '{{title}} on {{when}} is cancelled',
        intro: '"{{title}}" with {{group}} on {{when}} is not going ahead. Remove it from your calendar if you added it.',
        button: 'See the activity',
        expiry: 'You can switch these emails off under notification settings.',
    },
    activityReminder: {
        subject: 'Tomorrow: {{title}}, {{when}}',
        intro: 'A reminder: tomorrow, {{when}}, it is "{{title}}" with {{group}}{{where}}. See you there!',
        button: 'See the activity',
        expiry: 'You can switch these emails off under notification settings.',
    },
    activityCreated: {
        subject: '{{creator}} added "{{title}}" to {{group}}',
        intro: '{{creator}} put a new idea on the list of {{group}}: "{{title}}". Have a look and say if you are in.',
        button: 'See the activity',
        expiry: 'You can switch these emails off under notification settings.',
    },
    resetPassword: {
        subject: 'Reset your password',
        intro: 'Somebody asked to reset the password for this address. Click the button to choose a new one.',
        button: 'Choose a new password',
        expiry: 'The link works for {{minutes}} minutes and can be used once.',
    },
};

export type MailDict = typeof en;
