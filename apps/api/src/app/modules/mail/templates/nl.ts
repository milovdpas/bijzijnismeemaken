import type { MailDict } from './en';

export const nl: MailDict = {
    common: {
        appName: 'Bij zijn is meemaken',
        greeting: 'Hoi,',
        ignore: 'Was jij dit niet? Dan kun je deze e-mail negeren.',
        linkFallback: 'Werkt de knop niet? Kopieer dan deze link naar je browser:',
        atLocation: ' bij {{location}}',
    },
    verifyEmail: {
        subject: 'Bevestig je e-mailadres',
        intro: 'Bedankt voor je aanmelding. Klik op de knop om dit adres te bevestigen en in te loggen.',
        button: 'E-mailadres bevestigen',
        expiry: 'De link werkt {{hours}} uur.',
    },
    groupInvite: {
        subject: '{{inviter}} nodigt je uit voor {{group}}',
        intro: '{{inviter}} wil dat je bij de groep "{{group}}" komt. Open de app om de uitnodiging aan te nemen of af te slaan.',
        button: 'Bekijk de uitnodiging',
        expiry: 'De uitnodiging blijft staan tot je antwoordt.',
    },
    dayparts: {
        morning: 'ochtend',
        afternoon: 'middag',
        evening: 'avond',
    },
    activityPlanned: {
        subject: '{{title}} gaat door: {{when}}',
        intro: '{{planner}} heeft "{{title}}" met {{group}} gepland op {{when}}{{where}}. Jij doet mee.',
        button: 'Zet in mijn agenda',
        google: 'Toevoegen aan Google Agenda',
        expiry: 'De eerste knop downloadt een agendabestand; de tweede opent Google Agenda.',
    },
    activityRescheduled: {
        subject: '{{title}} is verplaatst naar {{when}}',
        intro: '"{{title}}" met {{group}} is nu op {{when}}{{where}}. Pas je agenda aan.',
        button: 'Nieuwe tijd in mijn agenda',
        google: 'Toevoegen aan Google Agenda',
        expiry: 'Dit vervangt de eerdere uitnodiging voor deze activiteit.',
    },
    activityCancelled: {
        subject: '{{title}} op {{when}} gaat niet door',
        intro: '"{{title}}" met {{group}} op {{when}} gaat niet door. Haal het uit je agenda als je het had toegevoegd.',
        button: 'Bekijk de activiteit',
        expiry: 'Je kunt deze mails uitzetten bij de meldingsinstellingen.',
    },
    activityCreated: {
        subject: '{{creator}} zette "{{title}}" op de lijst van {{group}}',
        intro: '{{creator}} heeft een nieuw idee op de lijst van {{group}} gezet: "{{title}}". Kijk even en zeg of je meedoet.',
        button: 'Bekijk de activiteit',
        expiry: 'Je kunt deze mails uitzetten bij de meldingsinstellingen.',
    },
    resetPassword: {
        subject: 'Nieuw wachtwoord instellen',
        intro: 'Iemand heeft gevraagd het wachtwoord voor dit adres opnieuw in te stellen. Klik op de knop om een nieuw wachtwoord te kiezen.',
        button: 'Nieuw wachtwoord kiezen',
        expiry: 'De link werkt {{minutes}} minuten en kan één keer gebruikt worden.',
    },
};
