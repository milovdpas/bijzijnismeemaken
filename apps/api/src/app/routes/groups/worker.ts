import { Router } from 'express';
import { API_ENDPOINTS } from '@bzim/types';

import type { IRoute } from '../../../interfaces/IRouter';
import WorkerController from '../../controllers/WorkerController';
import { workerAuth } from '../../middleware/WorkerAuth';

/**
 * The cron entry points. Server side only.
 *
 * The web app never calls these and holds no token for them, which is why they
 * sit behind `workerAuth` rather than user authentication. On the VPS the
 * caller is the Ofelia scheduler, which execs `tools/worker.ts` inside this
 * container; the labels that declare each job live in `docker-compose.prod.yml`
 * beside the service, so the schedule deploys with the code rather than being
 * configured by hand on the server.
 *
 * There is no jobs folder: each job is a route here, a handler on the
 * controller, and a method on the service that owns the work.
 */
export default class WorkerRoutes implements IRoute {
    private readonly controller = new WorkerController();

    getRoutes(): Router {
        const router = Router();

        router.post(API_ENDPOINTS.WORKER.CLEANUP, workerAuth, this.controller.cleanup);
        router.post(API_ENDPOINTS.WORKER.CALENDAR_SYNC, workerAuth, this.controller.calendarSync);

        return router;
    }
}
