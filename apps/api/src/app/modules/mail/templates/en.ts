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
    },
    verifyEmail: {
        subject: 'Confirm your email address',
        intro: 'Thanks for signing up. Click the button to confirm this address and sign in.',
        button: 'Confirm email',
        expiry: 'The link works for {{hours}} hours.',
    },
    resetPassword: {
        subject: 'Reset your password',
        intro: 'Somebody asked to reset the password for this address. Click the button to choose a new one.',
        button: 'Choose a new password',
        expiry: 'The link works for {{minutes}} minutes and can be used once.',
    },
};

export type MailDict = typeof en;
