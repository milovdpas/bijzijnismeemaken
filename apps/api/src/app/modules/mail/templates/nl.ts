import type { MailDict } from './en';

export const nl: MailDict = {
    common: {
        appName: 'Bij zijn is meemaken',
        greeting: 'Hoi,',
        ignore: 'Was jij dit niet? Dan kun je deze e-mail negeren.',
        linkFallback: 'Werkt de knop niet? Kopieer dan deze link naar je browser:',
    },
    verifyEmail: {
        subject: 'Bevestig je e-mailadres',
        intro: 'Bedankt voor je aanmelding. Klik op de knop om dit adres te bevestigen en in te loggen.',
        button: 'E-mailadres bevestigen',
        expiry: 'De link werkt {{hours}} uur.',
    },
    resetPassword: {
        subject: 'Nieuw wachtwoord instellen',
        intro: 'Iemand heeft gevraagd het wachtwoord voor dit adres opnieuw in te stellen. Klik op de knop om een nieuw wachtwoord te kiezen.',
        button: 'Nieuw wachtwoord kiezen',
        expiry: 'De link werkt {{minutes}} minuten en kan één keer gebruikt worden.',
    },
};
