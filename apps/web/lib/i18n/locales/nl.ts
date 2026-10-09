import type { Dict } from './en';

export const nl: Dict = {
    common: {
        appName: 'Bij zijn is meemaken',
        cancel: 'Annuleren',
        save: 'Opslaan',
        close: 'Sluiten',
        loading: 'Laden',
        toggleTheme: 'Thema wisselen',
    },
    nav: {
        groups: 'Groepen',
        settings: 'Instellingen',
    },
    groups: {
        title: 'Groepen',
        subtitle: 'De vriendengroepen waar je bij hoort.',
    },
    status: {
        title: 'API-status',
        checking: 'De API wordt gecontroleerd...',
        ok: 'De API draait en bereikt de database.',
        degraded: 'De API draait, maar bereikt de database niet.',
        unreachable: 'De API is niet bereikbaar.',
    },
    errors: {
        UNAUTHENTICATED: 'Je bent uitgelogd. Log opnieuw in om verder te gaan.',
        FORBIDDEN: 'Dat mag je niet doen.',
        NOT_FOUND: 'Dat bestaat niet meer.',
        VALIDATION_FAILED: 'Sommige velden zijn niet geldig.',
        CONFLICT: 'Dat botst met iets dat al bestaat.',
        RATE_LIMITED: 'Te veel verzoeken. Probeer het zo nog eens.',
        OWNER_MUST_TRANSFER: 'Draag eerst het eigenaarschap van je groepen over.',
        WORKER_BUSY: 'Die taak draait nog.',
        PROVIDER_ERROR: 'Een externe dienst werkte niet mee. Probeer het later opnieuw.',
        INTERNAL_ERROR: 'Er ging iets mis aan onze kant.',
        NETWORK: 'Geen verbinding. Controleer je netwerk en probeer het opnieuw.',
    },
};
