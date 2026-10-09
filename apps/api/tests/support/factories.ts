/**
 * Seed helpers, written through the entities rather than raw SQL.
 *
 * Going through TypeORM means a column rename breaks the factories at compile
 * time instead of at the first assertion, and the fixtures cannot drift into a
 * shape the application could never produce.
 *
 * Every helper takes overrides so a test can state only the thing it is about.
 * A test that reads `seedGroup(owner, { access: GroupAccess.PUBLIC })` says
 * what it cares about; one that spells out six fields hides it.
 *
 * Empty until the first entity lands (task 6 adds `seedUser`). Each task that
 * adds an entity adds its factory here.
 */
export {};
