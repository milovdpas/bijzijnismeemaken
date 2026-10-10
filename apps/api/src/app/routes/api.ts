import { Router } from 'express';

import type { IRoute } from '../../interfaces/IRouter';
import AuthRoutes from './groups/auth';
import AvailabilityRoutes from './groups/availability';
import ActivityRoutes from './groups/activities';
import GroupRoutes from './groups/groups';
import ImageRoutes from './groups/images';
import InviteRoutes from './groups/invites';
import LeaderboardRoutes from './groups/leaderboards';
import OccurrenceRoutes from './groups/occurrences';
import MemberRoutes from './groups/members';
import UserRoutes from './groups/users';
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
        new AuthRoutes(),
        new UserRoutes(),
        new GroupRoutes(),
        new MemberRoutes(),
        new InviteRoutes(),
        new ActivityRoutes(),
        new OccurrenceRoutes(),
        new ImageRoutes(),
        new AvailabilityRoutes(),
        new LeaderboardRoutes(),
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
