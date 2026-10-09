import { Router } from 'express';

import type { IRoute } from '../../interfaces/IRouter';
import WorkerRoutes from './groups/worker';

/**
 * API routes.
 *
 * One group per resource, each owning its own controller wiring. Groups are
 * mounted at the root because `API_ENDPOINTS` declares absolute paths, so the
 * web app and the server read the same strings and a rename fails to compile
 * rather than 404ing at runtime. Each task that adds a resource adds its group
 * here.
 */
export default class Api implements IRoute {
    private readonly groups: IRoute[] = [
        // Last, and not user authenticated: the scheduler calls it, the web app
        // never does.
        new WorkerRoutes(),
    ];

    getRoutes(): Router {
        const router = Router();

        for (const group of this.groups) {
            router.use(group.getRoutes());
        }

        return router;
    }
}
