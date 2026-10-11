import { describe, expect, it } from 'vitest';

import { safeReturnTo } from './return-to';

describe('safeReturnTo', () => {
    it('keeps an in-app path, query included', () => {
        expect(safeReturnTo('/groups/abc/activities?tab=ideas')).toBe(
            '/groups/abc/activities?tab=ideas',
        );
    });

    it('drops anything that could leave the site', () => {
        expect(safeReturnTo('https://evil.example')).toBeUndefined();
        expect(safeReturnTo('//evil.example')).toBeUndefined();
        expect(safeReturnTo('/\\evil.example')).toBeUndefined();
        expect(safeReturnTo('/groups\u0000')).toBeUndefined();
        expect(safeReturnTo('groups')).toBeUndefined();
        expect(safeReturnTo(`/${'a'.repeat(300)}`)).toBeUndefined();
        expect(safeReturnTo(null)).toBeUndefined();
    });
});
